"""Constraint analysis and violation objective creation utilities"""
from typing import Dict, List, Tuple, Optional
import re
from ..models.optimization import Constraint
from ..utils.evaluation import safe_eval


def analyze_constraint(expression: str) -> Tuple[List[str], List[str], Optional[str]]:
    """
    Parse a simple linear constraint expression to extract variables and operator.
    
    Args:
        expression: Constraint expression like "A + B <= 10" or "A >= 5"
    
    Returns:
        Tuple of (left_vars, right_vars, operator) or ([], [], None) if parsing fails
    """
    # Remove spaces
    expr = expression.replace(" ", "")
    
    # Find operator
    if "<=" in expr:
        op = "<="
    elif ">=" in expr:
        op = ">="
    elif "<" in expr:
        op = "<"
    elif ">" in expr:
        op = ">"
    else:
        return [], [], None
    
    left, right = expr.split(op)
    
    # Extract variables (simple regex for identifiers)
    # This is a heuristic; complex math might confuse it but sufficient for A+B
    var_pattern = r'[a-zA-Z_][a-zA-Z0-9_]*'
    left_vars = re.findall(var_pattern, left)
    right_vars = re.findall(var_pattern, right)
    
    return left_vars, right_vars, op


def create_violation_objective_name(constraint: Constraint) -> str:
    """
    Generate a readable name for a constraint violation objective.
    
    Args:
        constraint: The constraint object
    
    Returns:
        A name for the violation objective
    """
    if constraint.title and constraint.title.strip():
        return f"Violation: {constraint.title}"
    elif constraint.description and constraint.description.strip():
        return f"Violation: {constraint.description}"
    else:
        # Fallback to expression, but limit length for readability
        expr_display = constraint.expression if len(constraint.expression) <= 30 else constraint.expression[:27] + "..."
        return f"Violation({expr_display})"


def create_violation_evaluator(expression: str, build_evaluation_context):
    """
    Create an evaluator function for a constraint violation.
    
    Args:
        expression: The constraint expression to evaluate
        build_evaluation_context: Function to build evaluation context from design
    
    Returns:
        A function that evaluates the constraint and returns 1.0 if satisfied, 0.0 if violated
    """
    def evaluate(design):
        d = dict(design) if isinstance(design, tuple) else design
        # Build complete evaluation context with variables, attributes, and properties
        eval_dict = build_evaluation_context(d)
        try:
            if safe_eval(expression, eval_dict):
                return 1.0  # Satisfied - contributes to score (higher is better)
            else:
                return 0.0  # Violated - contributes nothing (penalty)
        except Exception as e:
            print(f"Warning: Error evaluating constraint '{expression}': {e}")
            return 0.0  # On error, treat as violated
    
    return evaluate


def get_constraint_modifier_weights(
    left_vars: List[str],
    right_vars: List[str],
    op: str
) -> Dict[str, float]:
    """
    Determine modifier weights for constraint violation objectives.
    
    Args:
        left_vars: Variables on the left side of the constraint
        right_vars: Variables on the right side of the constraint
        op: The operator (<=, >=, <, >)
    
    Returns:
        Dictionary mapping modifier names to weights
    """
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
    
    return weights


def get_constraint_weight(constraint: Constraint) -> float:
    """
    Get the weight for a constraint based on its type.
    
    Args:
        constraint: The constraint object
    
    Returns:
        Weight value (100000.0 for hard constraints, user-specified or 10.0 for soft)
    """
    constraint_type = getattr(constraint, 'type', 'hard')  # Default to hard for backward compatibility
    # For hard constraints, use extremely high weight to ensure they dominate
    # For soft constraints, use user-specified weight (default 10.0)
    if constraint_type == 'soft':
        return getattr(constraint, 'weight', 10.0)
    else:
        return 100000.0

