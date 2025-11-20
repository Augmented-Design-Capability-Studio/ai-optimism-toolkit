from typing import List, Dict
from ..models.optimization import OptimizationProblem, OptimizationConfig

class OptimizationService:
    def __init__(self):
        self.problems: Dict[str, OptimizationProblem] = {}
    
    def create_problem(self, problem: OptimizationProblem) -> Dict:
        problem_id = str(len(self.problems) + 1)
        self.problems[problem_id] = problem
        return {"id": problem_id, "problem": problem}
    
    def list_problems(self) -> List[Dict]:
        return [{"id": k, "problem": v} for k, v in self.problems.items()]
    
    def run_optimization(self, config: OptimizationConfig) -> Dict:
        if config.problem_id not in self.problems:
            raise ValueError("Problem not found")
            
        problem = self.problems[config.problem_id]
        
        # 1. Setup Toolkit Components
        import sys
        import os
        # Add repository root to path to find optimism_toolkit
        # Assuming backend is at ai_optimism/backend
        # We need to go up 3 levels from app/services to reach repo root
        current_dir = os.path.dirname(os.path.abspath(__file__))
        repo_root = os.path.abspath(os.path.join(current_dir, "../../../.."))
        if repo_root not in sys.path:
            sys.path.append(repo_root)

        from optimism_toolkit.heuristics.Heuristic_Library import Heuristic_Library
        from optimism_toolkit.heuristics.Heuristic_Map import Heuristic_Map
        from optimism_toolkit.heuristics.Objective_Function import Objective_Function
        from optimism_toolkit.optimizer.Optimizer import Optimizer
        from .toolkit_adapters import ConfigurableModifier, SimpleDesignSelector, RandomModifierSelector, AdaptiveModifierSelector
        from ..utils.evaluation import safe_eval
        import random
        import math

        library = Heuristic_Library("WebOpt")
        
        # Define metrics for adaptive selection
        def _normalized_applications(modifier, objective, **_):
            if modifier.applications == 0:
                return 0.0
            else:
                return modifier.objective_changes[objective] / float(modifier.applications)

        objective_modifier_keys = {
            "changes_normalize_application": _normalized_applications
        }
        
        heuristic_map = Heuristic_Map({}, objective_modifier_keys=objective_modifier_keys)
        objective_function = Objective_Function()

        # NOTE: Objective registration is deferred until after seed designs are generated
        # so we can seed a reliable min/max normalization for objective values.

        # 3. Register Modifiers
        # Collect modifiers first; we'll add heuristic weights after objectives are registered
        registered_modifiers = []
        for variable in problem.variables:
            strategy = variable.modifierStrategy.model_dump() if variable.modifierStrategy else {'type': 'gaussian'}
            
            # For continuous/discrete variables, create directional modifiers
            if variable.type in ['continuous', 'discrete']:
                # Increase Modifier
                inc_mod = ConfigurableModifier(variable.name, strategy, variable.model_dump(), direction='increase')
                inc_name = f"inc_{variable.name}"
                library.add_modifier(inc_mod, inc_name, deep_copy=True)
                registered_modifiers.append(library.get_modifier(inc_name))
                
                # Decrease Modifier
                dec_mod = ConfigurableModifier(variable.name, strategy, variable.model_dump(), direction='decrease')
                dec_name = f"dec_{variable.name}"
                library.add_modifier(dec_mod, dec_name, deep_copy=True)
                registered_modifiers.append(library.get_modifier(dec_name))
                
                # Random/Exploration Modifier (lower weight implicitly via adaptive selection if it performs poorly)
                # We use a slightly larger sigma/step for exploration if possible, or just standard random
                rand_mod = ConfigurableModifier(variable.name, strategy, variable.model_dump(), direction='random')
                rand_name = f"rand_{variable.name}"
                library.add_modifier(rand_mod, rand_name, deep_copy=True)
                registered_modifiers.append(library.get_modifier(rand_name))
                
            else:
                # For categorical, just one modifier (random reset or neighbor)
                mod_func = ConfigurableModifier(variable.name, strategy, variable.model_dump(), direction='random')
                mod_name = f"mod_{variable.name}"
                library.add_modifier(mod_func, mod_name, deep_copy=True)
                registered_modifiers.append(library.get_modifier(mod_name))

        # 4. Prepare Seed Designs
        # Generate constraint-aware seed designs
        seed_designs = []
        max_attempts = 1000
        
        print(f"Generating seed designs with {len(problem.constraints or [])} constraints...")
        
        for seed_idx in range(min(10, config.population_size)):
            # Try to generate a valid design
            for attempt in range(max_attempts):
                design = {}
                for var in problem.variables:
                    if var.type == 'categorical' and var.categories:
                        design[var.name] = random.randint(0, len(var.categories) - 1)
                    else:
                        min_val = var.min if var.min is not None else 0
                        max_val = var.max if var.max is not None else 100
                        design[var.name] = random.uniform(min_val, max_val)
                
                # Check if design satisfies all constraints
                all_constraints_satisfied = True
                for constraint in (problem.constraints or []):
                    try:
                        if not safe_eval(constraint.expression, design):
                            all_constraints_satisfied = False
                            break
                    except Exception:
                        all_constraints_satisfied = False
                        break
                
                if all_constraints_satisfied:
                    # Convert to tuple for hashability
                    seed_designs.append(tuple(sorted(design.items())))
                    print(f"  Seed {seed_idx + 1}: Valid design found on attempt {attempt + 1}")
                    break
            else:
                # If we couldn't find a valid design, use a simple heuristic
                # For your cookie problem: distribute evenly within constraints
                print(f"  Seed {seed_idx + 1}: Using heuristic design (couldn't find valid random)")
                design = {}
                for var in problem.variables:
                    if var.type == 'categorical' and var.categories:
                        design[var.name] = 0  # Use first category
                    else:
                        # Use middle of range
                        min_val = var.min if var.min is not None else 0
                        max_val = var.max if var.max is not None else 100
                        design[var.name] = (min_val + max_val) / 2
                seed_designs.append(tuple(sorted(design.items())))
        
        print(f"Generated {len(seed_designs)} seed designs")
        
        if len(seed_designs) == 0:
            # Fallback if no valid seeds found: just use random ones
             print("Warning: Could not generate valid seed designs. Proceeding with random invalid seeds.")
             for _ in range(min(10, config.population_size)):
                design = {}
                for var in problem.variables:
                    if var.type == 'categorical' and var.categories:
                        design[var.name] = 0
                    else:
                        min_val = var.min if var.min is not None else 0
                        max_val = var.max if var.max is not None else 100
                        design[var.name] = random.uniform(min_val, max_val)
                seed_designs.append(tuple(sorted(design.items())))

        # 5. Run Optimization
        # Before running the optimizer, register objectives now that we have seed designs
        # Use sampling-based estimation to seed min/max normalization and produce stable 0-1 scores
        def estimate_bounds(expr, variables, samples=500):
            lo = float('inf')
            hi = float('-inf')
            for _ in range(samples):
                sample = {}
                for v in variables:
                    if v.type == 'categorical' and v.categories:
                        # choose a random category representation; use numeric index if categories are strings
                        # try to evaluate as string if expression expects strings
                        sample[v.name] = random.choice(v.categories)
                    else:
                        min_val = v.min if v.min is not None else 0
                        max_val = v.max if v.max is not None else 100
                        sample[v.name] = random.uniform(min_val, max_val)
                try:
                    val = float(safe_eval(expr, sample))
                    lo = min(lo, val)
                    hi = max(hi, val)
                except Exception:
                    continue
            if lo == float('inf') or hi == float('-inf'):
                return None, None
            return lo, hi

        # --- Constraint Analysis & Violation Objectives ---
        # Instead of hard filtering, we convert constraints to "Violation Objectives"
        # and wire them to helpful modifiers.
        
        constraint_weights = {} # Map of objective_name -> {modifier_name: weight}
        
        # Helper to parse simple linear constraints
        def analyze_constraint(expression):
            # Very basic parser for "A + B <= 10" or "A >= 5"
            # Returns (left_vars, right_vars, operator)
            import re
            # Remove spaces
            expr = expression.replace(" ", "")
            
            # Find operator
            if "<=" in expr: op = "<="
            elif ">=" in expr: op = ">="
            elif "<" in expr: op = "<"
            elif ">" in expr: op = ">"
            else: return [], [], None
            
            left, right = expr.split(op)
            
            # Extract variables (simple regex for identifiers)
            # This is a heuristic; complex math might confuse it but sufficient for A+B
            var_pattern = r'[a-zA-Z_][a-zA-Z0-9_]*'
            left_vars = re.findall(var_pattern, left)
            right_vars = re.findall(var_pattern, right)
            
            return left_vars, right_vars, op

        for i, constraint in enumerate(problem.constraints or []):
            # Create a violation objective
            # If constraint is "A <= B", violation is "max(0, A - B)"
            # If constraint is "A >= B", violation is "max(0, B - A)"
            
            # We need to construct a python expression for the violation
            # This is tricky with arbitrary strings. 
            # Simplified approach: Wrap the boolean check. If False, return large penalty?
            # Better: Try to construct a distance function if possible.
            
            # For now, we'll use a generic "Constraint_{i}" objective that returns 1.0 if violated, 0.0 if not.
            # But to guide the optimizer, we need gradients.
            # Let's try to parse it for the Heuristic Map at least.
            
            left_vars, right_vars, op = analyze_constraint(constraint.expression)
            
            violation_name = f"Violation({constraint.expression})"
            
            # Define the violation evaluator
            def make_violation_evaluator(expr):
                def evaluate(design):
                    d = dict(design) if isinstance(design, tuple) else design
                    try:
                        if safe_eval(expr, d):
                            return 0.0 # Satisfied
                        else:
                            return 1.0 # Violated (Binary for now, could be continuous distance)
                    except:
                        return 1.0
                return evaluate
                
            # Register this as a MINIMIZE objective
            # Note: We add it to the library but maybe not the main objective function yet?
            # Actually, we should add it to the main objective function with a HIGH weight
            # so the optimizer prioritizes feasibility.
            
            # For the Heuristic Map, we want to wire modifiers to this violation.
            # If "A <= 50", and we violate it (A > 50), we want to DECREASE A.
            # Violation Objective Goal: MINIMIZE.
            # Modifier "dec_A" helps MINIMIZE violation -> Positive Weight.
            
            weights = {}
            if op == "<=" or op == "<":
                # LHS <= RHS. To fix violation (LHS > RHS), Decrease LHS, Increase RHS
                for v in left_vars:
                    weights[f"dec_{v}"] = 1.0
                    weights[f"inc_{v}"] = -1.0
                for v in right_vars:
                    weights[f"inc_{v}"] = 1.0
                    weights[f"dec_{v}"] = -1.0
            elif op == ">=" or op == ">":
                # LHS >= RHS. To fix violation (LHS < RHS), Increase LHS, Decrease RHS
                for v in left_vars:
                    weights[f"inc_{v}"] = 1.0
                    weights[f"dec_{v}"] = -1.0
                for v in right_vars:
                    weights[f"dec_{v}"] = 1.0
                    weights[f"inc_{v}"] = -1.0
            
            if weights:
                constraint_weights[violation_name] = weights
                
            # Add the objective to the system
            # We use a custom evaluator that wraps the constraint
            library.add_objective(make_violation_evaluator(constraint.expression), violation_name)
            # Add to main objective function with high importance (e.g. 10x normal objectives)
            objective_function.add_objective_by_weight(library.get_objective(violation_name), 10.0)


        for obj_config in problem.objectives:
            # Try to estimate bounds using sampling; fall back to seed examples if sampling fails
            est_min, est_max = estimate_bounds(obj_config.expression, problem.variables, samples=500)
            # If sampling failed, use seed designs min/max
            if est_min is None or est_max is None:
                est_min = float('inf')
                est_max = float('-inf')
                for ex in seed_designs:
                    d = dict(ex) if isinstance(ex, tuple) else ex
                    try:
                        v = float(safe_eval(obj_config.expression, d))
                        est_min = min(est_min, v)
                        est_max = max(est_max, v)
                    except Exception:
                        continue

            def make_objective_func(expr, goal, constraints, init_min, init_max):
                obs_min = init_min if init_min not in (None, float('inf')) else 0.0
                obs_max = init_max if init_max not in (None, float('-inf')) else 1.0

                def evaluate(design):
                    design_dict = dict(design) if isinstance(design, tuple) else design

                    # Note: We no longer hard-fail on constraints here because 
                    # constraints are now their own objectives!
                    
                    try:
                        raw_val = float(safe_eval(expr, design_dict))
                    except Exception:
                        return 0.0

                    nonlocal obs_min, obs_max
                    # Expand-only running min/max to avoid rapid rescaling
                    if raw_val < obs_min:
                        obs_min = raw_val
                    if raw_val > obs_max:
                        obs_max = raw_val

                    # Min-max normalize to 0-1, avoid divide-by-zero
                    if obs_max > obs_min:
                        normalized = (raw_val - obs_min) / (obs_max - obs_min)
                    else:
                        normalized = 0.5

                    # If this is a minimize objective, invert so smaller is better
                    if goal == 'minimize':
                        normalized = 1.0 - normalized

                    # Clamp
                    normalized = max(0.0, min(1.0, normalized))
                    return normalized

                return evaluate

            obj_func = make_objective_func(obj_config.expression, obj_config.goal, problem.constraints or [], est_min, est_max)
            library.add_objective(obj_func, obj_config.name)
            objective_function.add_objective_by_weight(library.get_objective(obj_config.name), 1.0)

        # Now that objectives exist, connect registered modifiers to objectives in heuristic_map
        # 1. Add random baseline weights
        weights_map = {}
        if registered_modifiers:
            for mod in registered_modifiers:
                weights_map[mod] = {o: 0.1 for o in objective_function} # Low baseline weight
        
        # 2. Add constraint-derived weights
        for viol_name, c_weights in constraint_weights.items():
            # Find the objective object
            try:
                obj = library.get_objective(viol_name)
                for mod_name, weight in c_weights.items():
                    # Find the modifier object
                    try:
                        mod = library.get_modifier(mod_name)
                        if mod not in weights_map: weights_map[mod] = {}
                        weights_map[mod][obj] = weight
                    except:
                        pass # Modifier might not exist (e.g. categorical var in linear constraint)
            except:
                pass

        heuristic_map.add_heuristic_weights(weights_map)

        optimizer = Optimizer(
            design_selector=SimpleDesignSelector(),
            modifier_selector=AdaptiveModifierSelector(),
            stopping_criteria=lambda **kwargs: False # Run until max_iterations
        )

        final_population = optimizer.optimize(
            objective_function=objective_function,
            heuristic_map=heuristic_map,
            seed_designs=seed_designs,
            max_iterations=config.max_iterations,
            population_cap=config.population_size
        )

        # 6. Format Results
        top_iterations = final_population.top_N_iterations(5)
        results = []
        for iter in top_iterations:
            # Convert tuple design back to dict
            design_dict = dict(iter.design) if isinstance(iter.design, tuple) else iter.design
            
            results.append({
                "variables": design_dict,
                "score": iter.score,
                "objectives": {o.name: s for o, s in iter.objective_scores.items()}
            })

        # Format heuristic map for frontend
        # Structure: { objectives: [], modifiers: [], weights: { obj: { mod: weight } } }
        hm_data = {
            "objectives": [o.name for o in objective_function],
            "modifiers": [m.name for m in registered_modifiers],
            "weights": {}
        }
        
        for obj in objective_function:
            hm_data["weights"][obj.name] = {}
            for mod in registered_modifiers:
                # Get weight from heuristic map if it exists
                # Note: Heuristic_Map structure is complex, accessing internal weights directly
                # This is a simplification assuming we can access the map
                try:
                    # Accessing internal weight structure - this depends on Heuristic_Map implementation
                    # For now, we'll reconstruct from our known weights_map if possible or just return what we built
                    if mod in weights_map and obj in weights_map[mod]:
                        hm_data["weights"][obj.name][mod.name] = weights_map[mod][obj]
                except:
                    pass

        return {
            "status": "success",
            "config": config.model_dump(),
            "results": results,
            "best_design": results[0] if results else None,
            "heuristic_map": hm_data
        }

    def clear_problems(self) -> Dict:
        self.problems.clear()
        return {
            "status": "success", 
            "message": "All problems cleared"
        }