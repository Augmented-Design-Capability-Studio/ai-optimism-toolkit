"""
API endpoint for safely evaluating Python expressions
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import ast
import operator
import math

router = APIRouter()


class EvaluationRequest(BaseModel):
    """Request to evaluate expressions"""
    expressions: List[str]  # List of Python expressions to evaluate
    variables: Dict[str, Any]  # Variable name -> value mapping


class EvaluationResult(BaseModel):
    """Result of expression evaluation"""
    expression: str
    value: Optional[float]
    error: Optional[str]


class EvaluationResponse(BaseModel):
    """Response containing all evaluation results"""
    results: List[EvaluationResult]


# Safe operators for ast evaluation
SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
    ast.Eq: operator.eq,
    ast.NotEq: operator.ne,
    ast.Lt: operator.lt,
    ast.LtE: operator.le,
    ast.Gt: operator.gt,
    ast.GtE: operator.ge,
}

# Safe functions
SAFE_FUNCTIONS = {
    'abs': abs,
    'min': min,
    'max': max,
    'sum': sum,
    'round': round,
    'pow': pow,
    'sqrt': math.sqrt,
    'exp': math.exp,
    'log': math.log,
    'sin': math.sin,
    'cos': math.cos,
    'tan': math.tan,
}


def safe_eval(expression: str, variables: Dict[str, Any]) -> Any:
    """
    Safely evaluate a Python expression using AST
    Supports arithmetic, comparisons, conditionals, and common math functions
    """
    try:
        # Parse the expression into an AST
        tree = ast.parse(expression, mode='eval')
        
        def eval_node(node):
            if isinstance(node, ast.Expression):
                return eval_node(node.body)
            
            elif isinstance(node, ast.Constant):
                return node.value
            
            elif isinstance(node, ast.Name):
                # Variable lookup
                if node.id in variables:
                    return variables[node.id]
                elif node.id in SAFE_FUNCTIONS:
                    return SAFE_FUNCTIONS[node.id]
                else:
                    raise NameError(f"Variable '{node.id}' not defined")
            
            elif isinstance(node, ast.BinOp):
                # Binary operations (+ - * / etc)
                left = eval_node(node.left)
                right = eval_node(node.right)
                op_type = type(node.op)
                if op_type in SAFE_OPERATORS:
                    return SAFE_OPERATORS[op_type](left, right)
                else:
                    raise ValueError(f"Unsupported operator: {op_type}")
            
            elif isinstance(node, ast.UnaryOp):
                # Unary operations (- +)
                operand = eval_node(node.operand)
                op_type = type(node.op)
                if op_type in SAFE_OPERATORS:
                    return SAFE_OPERATORS[op_type](operand)
                else:
                    raise ValueError(f"Unsupported unary operator: {op_type}")
            
            elif isinstance(node, ast.Compare):
                # Comparison operations (< <= > >= == !=)
                left = eval_node(node.left)
                for op, comparator in zip(node.ops, node.comparators):
                    right = eval_node(comparator)
                    op_type = type(op)
                    if op_type in SAFE_OPERATORS:
                        if not SAFE_OPERATORS[op_type](left, right):
                            return False
                        left = right  # Chain comparisons
                    else:
                        raise ValueError(f"Unsupported comparison: {op_type}")
                return True
            
            elif isinstance(node, ast.IfExp):
                # Ternary/conditional expression (a if condition else b)
                condition = eval_node(node.test)
                if condition:
                    return eval_node(node.body)
                else:
                    return eval_node(node.orelse)
            
            elif isinstance(node, ast.Call):
                # Function calls
                func = eval_node(node.func)
                args = [eval_node(arg) for arg in node.args]
                if callable(func):
                    return func(*args)
                else:
                    raise ValueError(f"Not a callable: {func}")
            
            elif isinstance(node, ast.List):
                # List literal
                return [eval_node(elem) for elem in node.elts]
            
            elif isinstance(node, ast.Tuple):
                # Tuple literal
                return tuple(eval_node(elem) for elem in node.elts)
            
            else:
                raise ValueError(f"Unsupported AST node: {type(node)}")
        
        result = eval_node(tree)
        
        # Convert boolean to 1/0 for consistent numeric handling
        if isinstance(result, bool):
            return 1.0 if result else 0.0
        
        # Ensure numeric result
        if isinstance(result, (int, float)):
            return float(result)
        
        return result
        
    except Exception as e:
        raise ValueError(f"Evaluation error: {str(e)}")


@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_expressions(request: EvaluationRequest):
    """
    Safely evaluate multiple Python expressions with given variables
    
    Supports:
    - Arithmetic: +, -, *, /, //, %, **
    - Comparisons: <, <=, >, >=, ==, !=
    - Conditionals: a if condition else b
    - Functions: abs, min, max, sum, round, sqrt, exp, log, sin, cos, tan
    - Variables: Any numeric or string values provided in variables dict
    """
    results = []
    
    for expr in request.expressions:
        try:
            value = safe_eval(expr, request.variables)
            results.append(EvaluationResult(
                expression=expr,
                value=value if isinstance(value, (int, float)) else None,
                error=None
            ))
        except Exception as e:
            results.append(EvaluationResult(
                expression=expr,
                value=None,
                error=str(e)
            ))
    
    return EvaluationResponse(results=results)
