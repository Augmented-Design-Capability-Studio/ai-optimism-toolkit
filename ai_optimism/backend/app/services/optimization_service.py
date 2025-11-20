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
        from .toolkit_adapters import ConfigurableModifier, SimpleDesignSelector, RandomModifierSelector
        from ..utils.evaluation import safe_eval
        import random
        import math

        library = Heuristic_Library("WebOpt")
        heuristic_map = Heuristic_Map({})  # Initialize with empty dict
        objective_function = Objective_Function()

        # 2. Register Objectives
        # We create a single combined objective for now, or multiple if the toolkit supports it well.
        # The toolkit supports multiple objectives.
        
        for obj_config in problem.objectives:
            def make_objective_func(expr, goal, constraints):
                def evaluate(design):
                    # Convert tuple design to dict for evaluation
                    design_dict = dict(design) if isinstance(design, tuple) else design
                    
                    # Debug: print first few evaluations
                    import random
                    if random.random() < 0.01:  # Print 1% of evaluations
                        print(f"Evaluating design: {design_dict}")
                    
                    # Check constraints first
                    constraint_satisfied = True
                    for constraint in constraints:
                        try:
                            result = safe_eval(constraint.expression, design_dict)
                            if not result:
                                if random.random() < 0.01:
                                    print(f"Constraint violated: {constraint.expression} = {result}")
                                    print(f"  Design: {design_dict}")
                                constraint_satisfied = False
                                break
                        except Exception as e:
                            print(f"Constraint error: {e} for {constraint.expression}")
                            print(f"  Design: {design_dict}")
                            constraint_satisfied = False
                            break
                    
                    if not constraint_satisfied:
                        return 0.0  # Constraint violation penalty
                    
                    # Evaluate objective
                    try:
                        raw_val = safe_eval(expr, design_dict)
                        val = float(raw_val)
                        
                        if random.random() < 0.01:
                            print(f"Objective {expr} = {val}")
                    except Exception as e:
                        print(f"Objective evaluation error: {e}")
                        return 0.0
                    
                    # Normalize to 0-1 using sigmoid function
                    # This ensures toolkit requirement of 0-1 range
                    # For large values, sigmoid(x) ≈ 1; for small values ≈ 0
                    import math
                    
                    # For minimize, we want smaller values to give higher scores
                    if goal == 'minimize':
                        # Negate so smaller values become larger
                        val = -val
                    
                    # Apply sigmoid: 1 / (1 + e^(-x/scale))
                    # Scale factor helps with different value ranges
                    scale = 10.0  # Adjust this based on typical objective values
                    normalized = 1.0 / (1.0 + math.exp(-val / scale))
                    
                    return normalized
                return evaluate

            obj_func = make_objective_func(obj_config.expression, obj_config.goal, problem.constraints or [])
            library.add_objective(obj_func, obj_config.name)
            
            # Add to objective function (equal weights for now)
            objective_function.add_objective_by_weight(library.get_objective(obj_config.name), 1.0)

        # 3. Register Modifiers
        for variable in problem.variables:
            # Create modifier for this variable
            strategy = variable.modifierStrategy.model_dump() if variable.modifierStrategy else {'type': 'gaussian'}
            modifier_func = ConfigurableModifier(variable.name, strategy, variable.model_dump())
            
            mod_name = f"mod_{variable.name}"
            library.add_modifier(modifier_func, mod_name, deep_copy=True)
            
            # Register in map (connect to all objectives)
            modifier = library.get_modifier(mod_name)
            heuristic_map.add_heuristic_weights({modifier: {o: 1.0 for o in objective_function}})

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
            raise ValueError("Could not generate any valid seed designs. Check your constraints.")

        # 5. Run Optimization
        optimizer = Optimizer(
            design_selector=SimpleDesignSelector(),
            modifier_selector=RandomModifierSelector(),
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

        return {
            "status": "success",
            "config": config.model_dump(),
            "results": results,
            "best_design": results[0] if results else None
        }

    def clear_problems(self) -> Dict:
        self.problems.clear()
        return {
            "status": "success", 
            "message": "All problems cleared"
        }