from typing import List, Dict, Optional, Callable
from sqlmodel import Session, select
from ..models.optimization import (
    OptimizationProblem, OptimizationConfig,
    OptimizationProblemDB, OptimizationRunDB
)
from ..utils.common import generate_id
from ..utils.constraint_analysis import (
    analyze_constraint, create_violation_objective_name,
    create_violation_evaluator, get_constraint_modifier_weights,
    get_constraint_weight
)
from ..utils.seed_designs import generate_seed_designs
from ..utils.objective_setup import estimate_bounds, create_objective_function
from ..utils.result_formatter import format_optimization_results
from .progress_tracking_optimizer import ProgressTrackingOptimizer
import time
import threading

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
    
    def run_optimization(self, config: OptimizationConfig, progress_callback=None, run_id=None) -> Dict:
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
            1. Variables (with categorical indices converted to CategoricalVariable objects)
            2. Properties (evaluated and added to context)
            """
            from ..utils.evaluation import safe_eval, CategoricalVariable
            
            # Step 1: Convert categorical indices to CategoricalVariable objects
            eval_dict = design_dict.copy()
            for var in problem.variables:
                if var.type == 'categorical' and var.categories and var.name in eval_dict:
                    idx = eval_dict[var.name]
                    # If it's an index (integer), convert to category name and wrap in CategoricalVariable
                    if isinstance(idx, (int, float)) and 0 <= int(idx) < len(var.categories):
                        category_name = var.categories[int(idx)]
                        # Wrap in CategoricalVariable if attributes exist, otherwise just use category name
                        if var.attributes:
                            eval_dict[var.name] = CategoricalVariable(category_name, var.attributes)
                        else:
                            eval_dict[var.name] = category_name
            
            # Step 2: Evaluate properties and add them to the evaluation context
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
        seed_designs = generate_seed_designs(
            problem,
            config.population_size,
            build_evaluation_context
        )

        # 5. Register Constraints as Violation Objectives
        constraint_weights = {}  # Map of objective_name -> {modifier_name: weight}
        
        for constraint in (problem.constraints or []):
            # Analyze constraint to extract variables and operator
            left_vars, right_vars, op = analyze_constraint(constraint.expression)
            violation_name = create_violation_objective_name(constraint)
            
            # Create violation evaluator
            violation_evaluator = create_violation_evaluator(
                constraint.expression,
                build_evaluation_context
            )
            
            # Get modifier weights for this constraint
            weights = get_constraint_modifier_weights(left_vars, right_vars, op)
            if weights:
                constraint_weights[violation_name] = weights
                
            # Register violation objective
            library.add_objective(violation_evaluator, violation_name)
            
            # Add to objective function with appropriate weight
            constraint_weight = get_constraint_weight(constraint)
            objective_function.add_objective_by_weight(
                library.get_objective(violation_name), 
                constraint_weight
            )


        # Store objective bounds for frontend normalization
        objective_bounds = {}
        
        for obj_config in problem.objectives:
            # Try to estimate bounds using sampling; fall back to seed examples if sampling fails
            est_min, est_max = estimate_bounds(
                obj_config.expression,
                problem.variables,
                build_evaluation_context,
                samples=500
            )
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
            
            # Store bounds for this objective (convert inf to None for JSON serialization)
            if est_min != float('inf') and est_max != float('-inf'):
                objective_bounds[obj_config.name] = {
                    "min": est_min if est_min != float('inf') else None,
                    "max": est_max if est_max != float('-inf') else None
                }
            else:
                objective_bounds[obj_config.name] = {"min": None, "max": None}

            obj_func = create_objective_function(
                obj_config.expression,
                obj_config.goal,
                est_min,
                est_max,
                build_evaluation_context
            )
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

        optimizer = ProgressTrackingOptimizer(
            design_selector=SimpleDesignSelector(),
            modifier_selector=AdaptiveModifierSelector(),
            stopping_criteria=lambda **kwargs: False,  # Run until max_iterations
            progress_callback=progress_callback
        )

        final_population = optimizer.optimize(
            objective_function=objective_function,
            heuristic_map=heuristic_map,
            seed_designs=seed_designs,
            max_iterations=config.max_iterations,
            population_cap=config.population_size
        )

        # 6. Format Results - Filter out designs that violate hard constraints
        top_iterations = final_population.top_N_iterations(50)
        results = format_optimization_results(
            top_iterations,
            problem,
            build_evaluation_context
        )

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
            "heuristic_map": hm_data,
            "objective_bounds": objective_bounds  # Min/max bounds for normalization
        }

    def clear_problems(self) -> Dict:
        self.problems.clear()
        return {
            "status": "success", 
            "message": "All problems cleared"
        }