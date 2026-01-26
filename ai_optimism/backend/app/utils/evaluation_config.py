"""
Configuration for safe expression evaluation
Defines allowed operators and functions with safety limits
"""
import ast
import operator
import math
from typing import Callable, Any

# Safety limits to prevent DoS attacks and resource exhaustion
MAX_EXPRESSION_LENGTH = 10000  # Maximum expression string length
MAX_NESTING_DEPTH = 50  # Maximum AST nesting depth
MAX_COMPREHENSION_ITEMS = 10000  # Maximum items in list comprehensions
MAX_LEN_SIZE = 10000  # Maximum size for len() function
MAX_SORTED_SIZE = 1000  # Maximum size for sorted() function

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
    ast.In: lambda item, container: item in container,
    ast.NotIn: lambda item, container: item not in container,
}

# Safe wrapper functions with size limits
def safe_len(obj: Any) -> int:
    """Safe len() with size limit to prevent DoS"""
    length = len(obj)
    if length > MAX_LEN_SIZE:
        raise ValueError(f"Object too large for len(): {length} > {MAX_LEN_SIZE}")
    return length

def safe_sorted(iterable: Any, key: Callable = None, reverse: bool = False) -> list:
    """Safe sorted() with size limit"""
    if isinstance(iterable, (list, tuple)):
        if len(iterable) > MAX_SORTED_SIZE:
            raise ValueError(f"Sequence too large for sorting: {len(iterable)} > {MAX_SORTED_SIZE}")
    return sorted(iterable, key=key, reverse=reverse)

# Safe functions available in expressions
SAFE_FUNCTIONS = {
    # Basic math
    'abs': abs,
    'min': min,
    'max': max,
    'sum': sum,
    'round': round,
    'pow': pow,
    
    # Square root and powers
    'sqrt': math.sqrt,
    'exp': math.exp,
    
    # Logarithms
    'log': math.log,
    'log10': math.log10,
    'log2': math.log2,
    
    # Trigonometric functions
    'sin': math.sin,
    'cos': math.cos,
    'tan': math.tan,
    'asin': math.asin,
    'acos': math.acos,
    'atan': math.atan,
    
    # Angle conversions
    'degrees': math.degrees,
    'radians': math.radians,
    
    # Rounding
    'ceil': math.ceil,
    'floor': math.floor,
    'fabs': math.fabs,
    
    # Logic
    'all': all,
    'any': any,
    
    # Collections
    'set': set,
    'len': safe_len,
    'sorted': safe_sorted,
    
    # Type conversions
    'int': int,
    'float': float,
    'str': str,
    'bool': bool,
}



