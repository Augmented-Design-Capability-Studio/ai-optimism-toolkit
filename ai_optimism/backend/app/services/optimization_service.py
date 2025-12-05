from typing import List, Dict, Optional
from sqlmodel import Session, select
from ..models.optimization import (
    OptimizationProblem, OptimizationConfig,
    OptimizationProblemDB, OptimizationRunDB
)
from ..utils.common import generate_id
import time

class OptimizationService:
    def __init__(self):
        # Keep in-memory dict for backward compatibility during migration
        self.problems: Dict[str, OptimizationProblem] = {}
    
    def create_problem(self, problem: OptimizationProblem, session_id: Optional[str] = None) -> Dict:
        """Create a new optimization problem and save to database"""
        problem_id = generate_id()
        current_time = int(time.time() * 1000)
        
        # Convert Pydantic model to dict for JSON storage
        problem_dict = {
            "variables": [v.model_dump() for v in problem.variables],
            "objectives": [o.model_dump() for o in problem.objectives],
            "constraints": [c.model_dump() for c in (problem.constraints or [])],
            "properties": [p.model_dump() for p in (problem.properties or [])] if problem.properties else None,
        }
        
        # Save to database
        db_problem = OptimizationProblemDB(
            id=problem_id,
            session_id=session_id,
            name=problem.name,
            description=problem.description,
            variables=problem_dict["variables"],
            objectives=problem_dict["objectives"],
            constraints=problem_dict["constraints"],
            properties=problem_dict["properties"],
            created_at=current_time,
            updated_at=current_time
        )
        
        # Also keep in memory for backward compatibility
        self.problems[problem_id] = problem
        
        # Save to database
        from ..database import engine
        with Session(engine) as db:
            db.add(db_problem)
            db.commit()
            db.refresh(db_problem)
        
        return {"id": problem_id, "problem": problem}
    
    def list_problems(self, session_id: Optional[str] = None) -> List[Dict]:
        """List optimization problems, optionally filtered by session_id"""
        results = []
        
        from ..database import engine
        with Session(engine) as db:
            if session_id:
                # Filter by session
                statement = select(OptimizationProblemDB).where(
                    OptimizationProblemDB.session_id == session_id
                )
                db_problems = db.exec(statement).all()
            else:
                # Get all problems
                db_problems = db.exec(select(OptimizationProblemDB)).all()
            
            for db_problem in db_problems:
                # Convert back to Pydantic model for API response
                from ..models.optimization import Variable, Objective, Constraint, Property
                
                variables = [Variable(**v) for v in db_problem.variables]
                objectives = [Objective(**o) for o in db_problem.objectives]
                constraints = [Constraint(**c) for c in (db_problem.constraints or [])]
                properties = [Property(**p) for p in (db_problem.properties or [])] if db_problem.properties else None
                
                problem = OptimizationProblem(
                    name=db_problem.name,
                    description=db_problem.description,
                    variables=variables,
                    objectives=objectives,
                    constraints=constraints,
                    properties=properties
                )
                results.append({"id": db_problem.id, "problem": problem})
        
        # Also include in-memory problems for backward compatibility
        for k, v in self.problems.items():
            if not any(r["id"] == k for r in results):
                results.append({"id": k, "problem": v})
        
        return results
    
    def run_optimization(self, config: OptimizationConfig) -> Dict:
        """Run optimization and save results to database"""
        # Try to get problem from database first
        problem = None
        db_problem = None
        
        from ..database import engine
        with Session(engine) as db:
            db_problem = db.get(OptimizationProblemDB, config.problem_id)
            if db_problem:
                # Convert from database format
                from ..models.optimization import Variable, Objective, Constraint, Property
                variables = [Variable(**v) for v in db_problem.variables]
                objectives = [Objective(**o) for o in db_problem.objectives]
                constraints = [Constraint(**c) for c in (db_problem.constraints or [])]
                properties = [Property(**p) for p in (db_problem.properties or [])] if db_problem.properties else None
                problem = OptimizationProblem(
                    name=db_problem.name,
                    description=db_problem.description,
                    variables=variables,
                    objectives=objectives,
                    constraints=constraints,
                    properties=properties
                )
        
        # Fallback to in-memory for backward compatibility
        if not problem:
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

        # Helper function to build complete evaluation context with variables, attributes, and properties
        def build_evaluation_context(design_dict):
            """
            Build complete evaluation context including:
            1. Variables (with categorical indices converted to category names)
            2. Attribute dictionaries (e.g., outbound_flight_attributes)
            3. Properties (evaluated and added to context)
            """
            from ..utils.evaluation import safe_eval
            
            # Step 1: Convert categorical indices to category names
            eval_dict = design_dict.copy()
            for var in problem.variables:
                if var.type == 'categorical' and var.categories and var.name in eval_dict:
                    idx = eval_dict[var.name]
                    # If it's an index (integer), convert to category name
                    if isinstance(idx, (int, float)) and 0 <= int(idx) < len(var.categories):
                        eval_dict[var.name] = var.categories[int(idx)]
            
            # Step 2: Add attribute dictionaries for categorical variables
            for var in problem.variables:
                if var.type == 'categorical' and var.attributes:
                    # Add attributes dictionary as {var_name}_attributes
                    attributes_key = f"{var.name}_attributes"
                    eval_dict[attributes_key] = var.attributes
            
            # Step 3: Evaluate properties and add them to the evaluation context
            if problem.properties:
                for prop in problem.properties:
                    try:
                        prop_value = safe_eval(prop.expression, eval_dict)
                        eval_dict[prop.name] = prop_value
                    except Exception as e:
                        # If property evaluation fails, skip it (will cause error in constraint if referenced)
                        print(f"Warning: Failed to evaluate property '{prop.name}': {e}")
                        pass
            
            return eval_dict
        
        # Helper function to convert categorical indices to category names for evaluation (legacy, for backward compatibility)
        def convert_categorical_for_eval(design_dict):
            """Convert categorical variable indices to category names for expression evaluation"""
            eval_dict = design_dict.copy()
            for var in problem.variables:
                if var.type == 'categorical' and var.categories and var.name in eval_dict:
                    idx = eval_dict[var.name]
                    # If it's an index (integer), convert to category name
                    if isinstance(idx, (int, float)) and 0 <= int(idx) < len(var.categories):
                        eval_dict[var.name] = var.categories[int(idx)]
            return eval_dict

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
                        # Build complete evaluation context with variables, attributes, and properties
                        eval_dict = build_evaluation_context(design)
                        if not safe_eval(constraint.expression, eval_dict):
                            all_constraints_satisfied = False
                            break
                    except Exception as e:
                        # If evaluation fails, treat as constraint violation
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
                        # Use category index - will be converted by build_evaluation_context
                        sample[v.name] = random.randint(0, len(v.categories) - 1)
                    else:
                        min_val = v.min if v.min is not None else 0
                        max_val = v.max if v.max is not None else 100
                        sample[v.name] = random.uniform(min_val, max_val)
                try:
                    # Build complete evaluation context with variables, attributes, and properties
                    eval_dict = build_evaluation_context(sample)
                    val = float(safe_eval(expr, eval_dict))
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
            
            # Use constraint title if available, then description, then expression
            # This makes the heuristic map more readable
            if constraint.title and constraint.title.strip():
                violation_name = f"Violation: {constraint.title}"
            elif constraint.description and constraint.description.strip():
                violation_name = f"Violation: {constraint.description}"
            else:
                # Fallback to expression, but limit length for readability
                expr_display = constraint.expression if len(constraint.expression) <= 30 else constraint.expression[:27] + "..."
                violation_name = f"Violation({expr_display})"
            
            # Define the violation evaluator
            def make_violation_evaluator(expr):
                def evaluate(design):
                    d = dict(design) if isinstance(design, tuple) else design
                    # Build complete evaluation context with variables, attributes, and properties
                    eval_dict = build_evaluation_context(d)
                    try:
                        if safe_eval(expr, eval_dict):
                            return 1.0 # Satisfied - contributes to score (higher is better)
                        else:
                            return 0.0 # Violated - contributes nothing (penalty)
                    except Exception as e:
                        print(f"Warning: Error evaluating constraint '{expr}': {e}")
                        return 0.0 # On error, treat as violated
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
            
            # Determine constraint type and weight
            constraint_type = getattr(constraint, 'type', 'hard')  # Default to hard for backward compatibility
            # For hard constraints, use extremely high weight to ensure they dominate
            # For soft constraints, use user-specified weight (default 10.0)
            constraint_weight = getattr(constraint, 'weight', 10.0) if constraint_type == 'soft' else 100000.0
            
            # Hard constraints: use extremely high weight (100000.0) to ensure they're absolutely prioritized
            # Soft constraints: use user-specified weight (default 10.0)
            objective_function.add_objective_by_weight(
                library.get_objective(violation_name), 
                constraint_weight
            )


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
                        # Build complete evaluation context with variables, attributes, and properties
                        eval_dict = build_evaluation_context(d)
                        v = float(safe_eval(obj_config.expression, eval_dict))
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
                    
                    # Build complete evaluation context with variables, attributes, and properties
                    eval_dict = build_evaluation_context(design_dict)
                    
                    try:
                        raw_val = float(safe_eval(expr, eval_dict))
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
            # Use objective weight if provided, default to 1.0
            objective_weight = obj_config.weight if obj_config.weight is not None else 1.0
            objective_function.add_objective_by_weight(library.get_objective(obj_config.name), objective_weight)

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

        # 3. Merge custom heuristic weights from config if provided
        if config.heuristic_weights:
            # config.heuristic_weights format: { "objective_name": { "modifier_name": weight } }
            for obj_name, mod_weights in config.heuristic_weights.items():
                try:
                    obj = library.get_objective(obj_name)
                    for mod_name, weight in mod_weights.items():
                        try:
                            mod = library.get_modifier(mod_name)
                            if mod not in weights_map: weights_map[mod] = {}
                            weights_map[mod][obj] = weight  # Override with custom weight
                        except:
                            pass
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

        # 6. Format Results - Filter out designs that violate hard constraints
        # Get more iterations to filter from (up to 50 to ensure we find valid solutions)
        top_iterations = final_population.top_N_iterations(50)
        results = []
        hard_constraints = [c for c in (problem.constraints or []) if getattr(c, 'type', 'hard') == 'hard']
        
        print(f"Filtering results: {len(hard_constraints)} hard constraints, {len(top_iterations)} top iterations")
        
        for iter in top_iterations:
            # Convert tuple design back to dict
            design_dict = dict(iter.design) if isinstance(iter.design, tuple) else iter.design
            
            # Check if design violates any hard constraints
            violates_hard_constraint = False
            if hard_constraints:
                # Build complete evaluation context with variables, attributes, and properties
                eval_dict = build_evaluation_context(design_dict)
                for constraint in hard_constraints:
                    try:
                        constraint_result = safe_eval(constraint.expression, eval_dict)
                        if not constraint_result:
                            violates_hard_constraint = True
                            print(f"Design violates hard constraint '{constraint.title or constraint.expression}': {constraint.expression}")
                            break
                    except Exception as e:
                        print(f"Error evaluating hard constraint '{constraint.title or constraint.expression}' ({constraint.expression}): {e}")
                        violates_hard_constraint = True
                        break
            
            # Skip designs that violate hard constraints
            if violates_hard_constraint:
                continue
            
            # Convert categorical indices to category names for frontend
            formatted_vars = {}
            for var in problem.variables:
                if var.name in design_dict:
                    if var.type == 'categorical' and var.categories:
                        idx = design_dict[var.name]
                        # Convert index to category name
                        if isinstance(idx, (int, float)) and 0 <= int(idx) < len(var.categories):
                            formatted_vars[var.name] = var.categories[int(idx)]
                        else:
                            formatted_vars[var.name] = design_dict[var.name]
                    else:
                        formatted_vars[var.name] = design_dict[var.name]
            
            results.append({
                "variables": formatted_vars,  # Use formatted_vars with category names
                "score": iter.score,
                "objectives": {o.name: s for o, s in iter.objective_scores.items()}
            })
            
            # Limit to top 5 valid results
            if len(results) >= 5:
                break
        
        # If no valid results found (all violate hard constraints), use best available with warning
        if not results and top_iterations:
            print("WARNING: No solutions satisfy all hard constraints. Returning best solution with constraint violations.")
            iter = top_iterations[0]
            design_dict = dict(iter.design) if isinstance(iter.design, tuple) else iter.design
            formatted_vars = {}
            for var in problem.variables:
                if var.name in design_dict:
                    if var.type == 'categorical' and var.categories:
                        idx = design_dict[var.name]
                        if isinstance(idx, (int, float)) and 0 <= int(idx) < len(var.categories):
                            formatted_vars[var.name] = var.categories[int(idx)]
                        else:
                            formatted_vars[var.name] = design_dict[var.name]
                    else:
                        formatted_vars[var.name] = design_dict[var.name]
            
            results.append({
                "variables": formatted_vars,
                "score": iter.score,
                "objectives": {o.name: s for o, s in iter.objective_scores.items()},
                "warning": "This solution violates hard constraints"
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

        # Convert weights_map to dict format for storage (objective_name -> modifier_name -> weight)
        weights_dict = {}
        for mod, obj_weights in weights_map.items():
            for obj, weight in obj_weights.items():
                if obj.name not in weights_dict:
                    weights_dict[obj.name] = {}
                weights_dict[obj.name][mod.name] = weight

        # Save optimization run to database
        run_id = generate_id()
        started_at = int(time.time() * 1000)
        
        run_data = {
            "status": "success",
            "config": config.model_dump(),
            "results": results,
            "best_design": results[0] if results else None,
            "heuristic_map": hm_data
        }
        
        optimization_run = OptimizationRunDB(
            id=run_id,
            problem_id=config.problem_id,
            session_id=config.session_id,
            config={
                "population_size": config.population_size,
                "max_iterations": config.max_iterations,
                "convergence_threshold": config.convergence_threshold
            },
            heuristic_weights=weights_dict if weights_dict else None,
            results={
                "results": results,
                "best_design": results[0] if results else None
            },
            heuristic_map=hm_data,
            status="completed",
            started_at=started_at,
            completed_at=int(time.time() * 1000),
            error_message=None
        )
        
        from ..database import engine
        with Session(engine) as db:
            db.add(optimization_run)
            db.commit()
            db.refresh(optimization_run)

        return {
            "status": "success",
            "run_id": run_id,
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