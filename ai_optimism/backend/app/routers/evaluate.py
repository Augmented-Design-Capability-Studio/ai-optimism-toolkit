"""
API endpoint for safely evaluating Python expressions
"""
from fastapi import APIRouter, HTTPException
from ..models.evaluate import EvaluationRequest, EvaluationResponse, EvaluationResult
from ..utils.evaluation import safe_eval

router = APIRouter()


@router.post("/", response_model=EvaluationResponse)
async def evaluate_expressions(request: EvaluationRequest):
    """
    Safely evaluate multiple Python expressions with given variables
    
    Supports:
    - Arithmetic: +, -, *, /, //, %, **
    - Comparisons: <, <=, >, >=, ==, !=
    - Conditionals: a if condition else b
    - Functions: abs, min, max, sum, round, sqrt, exp, log, sin, cos, tan
    - Dictionary/array subscript: obj[key], obj[key1][key2]
    - Variables: Any numeric, string, or dictionary values provided in variables dict
    """
    results = []
    
    for expr in request.expressions:
        try:
            value = safe_eval(expr, request.variables)
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
