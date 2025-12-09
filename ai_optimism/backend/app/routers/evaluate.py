"""
API endpoint for safely evaluating Python expressions
"""
from fastapi import APIRouter, HTTPException
from ..models.evaluate import EvaluationRequest, EvaluationResponse, EvaluationResult
from ..utils.evaluation import safe_eval, CategoricalVariable

router = APIRouter()


def build_evaluation_context(variables: dict, variable_definitions: list = None) -> dict:
    """
    Build evaluation context by wrapping categorical variables in CategoricalVariable objects.
    
    Args:
        variables: Dict of variable name -> value (category name for categorical vars)
        variable_definitions: Optional list of variable definitions with attributes
    
    Returns:
        Dict with categorical variables wrapped in CategoricalVariable objects
    """
    eval_dict = variables.copy()
    
    if variable_definitions:
        for var_def in variable_definitions:
            if var_def.type == 'categorical' and var_def.name in eval_dict:
                category_name = eval_dict[var_def.name]
                # If it's a string (category name) and we have attributes, wrap it
                if isinstance(category_name, str) and var_def.attributes:
                    eval_dict[var_def.name] = CategoricalVariable(category_name, var_def.attributes)
    
    return eval_dict


@router.post("/", response_model=EvaluationResponse)
async def evaluate_expressions(request: EvaluationRequest):
    """
    Safely evaluate multiple Python expressions with given variables
    
    Supports:
    - Arithmetic: +, -, *, /, //, %, **
    - Comparisons: <, <=, >, >=, ==, !=, in, not in
    - Boolean operations: and, or
    - Conditionals: a if condition else b
    - Math functions: abs, min, max, sum, round, sqrt, exp, log, log10, log2, sin, cos, tan, asin, acos, atan, degrees, radians, ceil, floor, fabs
    - Collection functions: set, len, sorted (with size limits)
    - Type conversions: int, float, str, bool
    - Logic functions: all, any
    - List comprehensions and generator expressions
    - Dictionary/array subscript: obj[key], obj[key1][key2]
    - Variables: Any numeric, string, or dictionary values provided in variables dict
    - Categorical variables: Wrapped in CategoricalVariable for attribute access
    
    Security: All expressions are evaluated with size limits, depth limits, and iteration limits to prevent DoS attacks.
    """
    # Build evaluation context with categorical variables wrapped
    eval_dict = build_evaluation_context(
        request.variables,
        request.variable_definitions
    )
    
    results = []
    
    for expr in request.expressions:
        try:
            value = safe_eval(expr, eval_dict)
            # Return the value as-is (can be numeric, dict, or other types)
            # Frontend will handle dictionaries appropriately for property injection
            results.append(EvaluationResult(
                expression=expr,
                value=value,
                error=None
            ))
        except Exception as e:
            results.append(EvaluationResult(
                expression=expr,
                value=None,
                error=str(e)
            ))
    
    return EvaluationResponse(results=results)
