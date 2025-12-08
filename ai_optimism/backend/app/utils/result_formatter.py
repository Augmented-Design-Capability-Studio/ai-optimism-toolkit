"""Result formatting utilities for optimization"""
from typing import List, Dict, Any, Callable, TYPE_CHECKING
from ..models.optimization import OptimizationProblem, Constraint
from ..utils.evaluation import safe_eval

if TYPE_CHECKING:
    from optimism_toolkit.optimizer.Design_Iteration import Design_Iteration


def format_design_variables(
    design_dict: dict,
    problem: OptimizationProblem
) -> Dict[str, Any]:
    """
    Format design variables, converting categorical indices to category names.
    
    Args:
        design_dict: The design dictionary
        problem: The optimization problem
    
    Returns:
        Formatted variables dictionary
    """
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
    return formatted_vars


def check_hard_constraints(
    design_dict: dict,
    hard_constraints: List[Constraint],
    build_evaluation_context: Callable
) -> bool:
    """
    Check if a design violates any hard constraints.
    
    Args:
        design_dict: The design dictionary
        hard_constraints: List of hard constraints
        build_evaluation_context_func: Function to build evaluation context
    
    Returns:
        True if design violates any hard constraint, False otherwise
    """
    if not hard_constraints:
        return False
    
    eval_dict = build_evaluation_context(design_dict)
    for constraint in hard_constraints:
        try:
            constraint_result = safe_eval(constraint.expression, eval_dict)
            if not constraint_result:
                return True
        except Exception as e:
            print(f"Error evaluating hard constraint '{constraint.title or constraint.expression}' ({constraint.expression}): {e}")
            return True
    
    return False


def format_optimization_results(
    top_iterations: List[Any],  # List[Design_Iteration] but imported lazily
    problem: OptimizationProblem,
    build_evaluation_context: Callable,
    max_results: int = 5
) -> List[Dict[str, Any]]:
    """
    Format optimization results, filtering out designs that violate hard constraints.
    
    Args:
        top_iterations: List of top design iterations
        problem: The optimization problem
        build_evaluation_context_func: Function to build evaluation context
        max_results: Maximum number of results to return
    
    Returns:
        List of formatted result dictionaries
    """
    results = []
    hard_constraints = [
        c for c in (problem.constraints or [])
        if getattr(c, 'type', 'hard') == 'hard'
    ]
    
    print(f"Filtering results: {len(hard_constraints)} hard constraints, {len(top_iterations)} top iterations")
    
    for iter in top_iterations:
        # Convert tuple design back to dict
        design_dict = dict(iter.design) if isinstance(iter.design, tuple) else iter.design
        
        # Check if design violates any hard constraints
        if check_hard_constraints(design_dict, hard_constraints, build_evaluation_context):
            print(f"Design violates hard constraint, skipping")
            continue
        
        # Format variables
        formatted_vars = format_design_variables(design_dict, problem)
        
        results.append({
            "variables": formatted_vars,
            "score": iter.score,
            "objectives": {o.name: s for o, s in iter.objective_scores.items()}
        })
        
        # Limit to max_results
        if len(results) >= max_results:
            break
    
    # If no valid results found, return best available with warning
    if not results and top_iterations:
        print("WARNING: No solutions satisfy all hard constraints. Returning best solution with constraint violations.")
        iter = top_iterations[0]
        design_dict = dict(iter.design) if isinstance(iter.design, tuple) else iter.design
        formatted_vars = format_design_variables(design_dict, problem)
        
        results.append({
            "variables": formatted_vars,
            "score": iter.score,
            "objectives": {o.name: s for o, s in iter.objective_scores.items()},
            "warning": "This solution violates hard constraints"
        })
    
    return results

