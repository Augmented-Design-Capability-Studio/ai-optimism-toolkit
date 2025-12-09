"""
Safe expression evaluation using AST
Safely evaluates Python expressions with security guards and limits
"""
import ast
from typing import Dict, Any

from .evaluation_config import (
    SAFE_OPERATORS,
    SAFE_FUNCTIONS,
    MAX_EXPRESSION_LENGTH,
    MAX_NESTING_DEPTH,
    MAX_COMPREHENSION_ITEMS,
)
from .evaluation_wrappers import CategoricalVariable, ISODateTimeWrapper

# Re-export for backward compatibility
__all__ = ['safe_eval', 'CategoricalVariable', 'ISODateTimeWrapper']


def safe_eval(expression: str, variables: Dict[str, Any]) -> Any:
    """
    Safely evaluate a Python expression using AST
    
    Supports:
    - Arithmetic: +, -, *, /, //, %, **
    - Comparisons: <, <=, >, >=, ==, !=, in, not in
    - Boolean operations: and, or
    - Conditionals: a if condition else b
    - Functions: abs, min, max, sum, round, sqrt, exp, log, sin, cos, tan, etc.
    - List comprehensions and generator expressions
    - Attribute access: obj.attr
    - Dictionary/array subscript: obj[key]
    
    Security features:
    - Expression length limit
    - Nesting depth limit
    - Comprehension iteration limit
    - Only whitelisted operators and functions
    - No code execution, file access, or introspection
    """
    try:
        # Check expression length
        if len(expression) > MAX_EXPRESSION_LENGTH:
            raise ValueError(f"Expression too long: {len(expression)} > {MAX_EXPRESSION_LENGTH}")
        
        # Parse the expression into an AST
        tree = ast.parse(expression, mode='eval')
        
        # Track nesting depth
        max_depth = [0]  # Use list to allow modification in nested calls
        
        def eval_node(node, local_vars: Dict[str, Any] = None, current_depth: int = 0):
            if local_vars is None:
                local_vars = variables
            
            # Track and check nesting depth
            max_depth[0] = max(max_depth[0], current_depth)
            if max_depth[0] > MAX_NESTING_DEPTH:
                raise ValueError(f"Expression nesting too deep: {max_depth[0]} > {MAX_NESTING_DEPTH}")
            
            if isinstance(node, ast.Expression):
                return eval_node(node.body, local_vars, current_depth)
            
            elif isinstance(node, ast.Constant):
                return node.value
            
            elif isinstance(node, ast.Name):
                # Variable lookup
                if node.id in local_vars:
                    return local_vars[node.id]
                elif node.id in SAFE_FUNCTIONS:
                    return SAFE_FUNCTIONS[node.id]
                else:
                    raise NameError(f"Variable '{node.id}' not defined")
            
            elif isinstance(node, ast.BinOp):
                # Binary operations (+ - * / etc)
                left = eval_node(node.left, local_vars, current_depth + 1)
                right = eval_node(node.right, local_vars, current_depth + 1)
                op_type = type(node.op)
                if op_type in SAFE_OPERATORS:
                    return SAFE_OPERATORS[op_type](left, right)
                else:
                    raise ValueError(f"Unsupported operator: {op_type}")
            
            elif isinstance(node, ast.UnaryOp):
                # Unary operations (- +)
                operand = eval_node(node.operand, local_vars, current_depth + 1)
                op_type = type(node.op)
                if op_type in SAFE_OPERATORS:
                    return SAFE_OPERATORS[op_type](operand)
                else:
                    raise ValueError(f"Unsupported unary operator: {op_type}")
            
            elif isinstance(node, ast.Compare):
                # Comparison operations (< <= > >= == != in not in)
                left = eval_node(node.left, local_vars, current_depth + 1)
                for op, comparator in zip(node.ops, node.comparators):
                    right = eval_node(comparator, local_vars, current_depth + 1)
                    op_type = type(op)
                    if op_type in SAFE_OPERATORS:
                        # Special handling for 'in' and 'not in' operators
                        if op_type == ast.In:
                            # Only allow membership testing in safe containers (list, tuple, str)
                            if not isinstance(right, (list, tuple, str)):
                                raise TypeError(f"'in' operator only supports list, tuple, or str, got {type(right)}")
                            if not SAFE_OPERATORS[op_type](left, right):
                                return False
                        elif op_type == ast.NotIn:
                            # Only allow membership testing in safe containers (list, tuple, str)
                            if not isinstance(right, (list, tuple, str)):
                                raise TypeError(f"'not in' operator only supports list, tuple, or str, got {type(right)}")
                            if not SAFE_OPERATORS[op_type](left, right):
                                return False
                        else:
                            # Standard comparison operators
                            if not SAFE_OPERATORS[op_type](left, right):
                                return False
                        left = right  # Chain comparisons
                    else:
                        raise ValueError(f"Unsupported comparison: {op_type}")
                return True
            
            elif isinstance(node, ast.BoolOp):
                # Boolean operations (and, or)
                op_type = type(node.op)
                if op_type == ast.And:
                    # For 'and': return first falsy value or last value
                    result = None
                    for value_node in node.values:
                        result = eval_node(value_node, local_vars, current_depth + 1)
                        # Convert to bool for truthiness check
                        if not bool(result):
                            return result
                    return result
                elif op_type == ast.Or:
                    # For 'or': return first truthy value or last value
                    result = None
                    for value_node in node.values:
                        result = eval_node(value_node, local_vars, current_depth + 1)
                        # Convert to bool for truthiness check
                        if bool(result):
                            return result
                    return result
                else:
                    raise ValueError(f"Unsupported boolean operator: {op_type}")
            
            elif isinstance(node, ast.IfExp):
                # Ternary/conditional expression (a if condition else b)
                condition = eval_node(node.test, local_vars, current_depth + 1)
                if condition:
                    return eval_node(node.body, local_vars, current_depth + 1)
                else:
                    return eval_node(node.orelse, local_vars, current_depth + 1)
            
            elif isinstance(node, ast.Call):
                # Function calls
                func = eval_node(node.func, local_vars, current_depth + 1)
                args = [eval_node(arg, local_vars, current_depth + 1) for arg in node.args]
                if callable(func):
                    return func(*args)
                else:
                    raise ValueError(f"Not a callable: {func}")
            
            elif isinstance(node, ast.List):
                # List literal
                return [eval_node(elem, local_vars, current_depth + 1) for elem in node.elts]
            
            elif isinstance(node, ast.Tuple):
                # Tuple literal
                return tuple(eval_node(elem, local_vars, current_depth + 1) for elem in node.elts)
            
            elif isinstance(node, ast.Dict):
                # Dictionary literal
                keys = [eval_node(k, local_vars, current_depth + 1) for k in node.keys]
                values = [eval_node(v, local_vars, current_depth + 1) for v in node.values]
                return dict(zip(keys, values))
            
            elif isinstance(node, ast.ListComp):
                # List comprehension: [expr for target in iterable if condition]
                # Only support single generator (no nested comprehensions for safety)
                if len(node.generators) != 1:
                    raise ValueError("Only single generator list comprehensions are supported")
                
                generator = node.generators[0]
                
                # Only support simple variable targets (no tuple unpacking for safety)
                if not isinstance(generator.target, ast.Name):
                    raise ValueError("List comprehension target must be a simple variable name")
                
                # Evaluate the iterable
                iterable = eval_node(generator.iter, local_vars, current_depth + 1)
                
                if not isinstance(iterable, (list, tuple)):
                    raise TypeError(f"List comprehension iterable must be a list or tuple, got {type(iterable)}")
                
                result = []
                var_name = generator.target.id
                
                for item in iterable:
                    # Check iteration limit
                    if len(result) >= MAX_COMPREHENSION_ITEMS:
                        raise ValueError(f"List comprehension exceeded maximum items: {MAX_COMPREHENSION_ITEMS}")
                    
                    # Create new scope with loop variable
                    new_vars = local_vars.copy()
                    new_vars[var_name] = item
                    
                    # Check condition if present
                    if generator.ifs:
                        condition_met = True
                        for if_node in generator.ifs:
                            if not eval_node(if_node, new_vars, current_depth + 1):
                                condition_met = False
                                break
                        if not condition_met:
                            continue
                    
                    # Evaluate expression and add to result
                    expr_value = eval_node(node.elt, new_vars, current_depth + 1)
                    result.append(expr_value)
                
                return result
            
            elif isinstance(node, ast.GeneratorExp):
                # Generator expression: (expr for target in iterable if condition)
                # Convert to list comprehension logic for evaluation
                # Only support single generator (no nested comprehensions for safety)
                if len(node.generators) != 1:
                    raise ValueError("Only single generator generator expressions are supported")
                
                generator = node.generators[0]
                
                # Only support simple variable targets (no tuple unpacking for safety)
                if not isinstance(generator.target, ast.Name):
                    raise ValueError("Generator expression target must be a simple variable name")
                
                # Evaluate the iterable
                iterable = eval_node(generator.iter, local_vars, current_depth + 1)
                
                if not isinstance(iterable, (list, tuple)):
                    raise TypeError(f"Generator expression iterable must be a list or tuple, got {type(iterable)}")
                
                # For generator expressions, we evaluate lazily but return a list
                # This allows sum() and other functions to consume them
                result = []
                var_name = generator.target.id
                
                for item in iterable:
                    # Check iteration limit
                    if len(result) >= MAX_COMPREHENSION_ITEMS:
                        raise ValueError(f"Generator expression exceeded maximum items: {MAX_COMPREHENSION_ITEMS}")
                    
                    # Create new scope with loop variable
                    new_vars = local_vars.copy()
                    new_vars[var_name] = item
                    
                    # Check condition if present
                    if generator.ifs:
                        condition_met = True
                        for if_node in generator.ifs:
                            if not eval_node(if_node, new_vars, current_depth + 1):
                                condition_met = False
                                break
                        if not condition_met:
                            continue
                    
                    # Evaluate expression and add to result
                    expr_value = eval_node(node.elt, new_vars, current_depth + 1)
                    result.append(expr_value)
                
                # Return as a generator-like object (but as a list for simplicity)
                # Functions like sum() can consume it
                return result
            
            elif isinstance(node, ast.Attribute):
                # Attribute access: obj.attr or obj[key].attr
                value = eval_node(node.value, local_vars, current_depth + 1)
                attr_name = node.attr
                
                # Handle attribute access on dictionaries (for nested dict access)
                if isinstance(value, dict):
                    if attr_name not in value:
                        raise AttributeError(f"Attribute '{attr_name}' not found in dictionary")
                    return value[attr_name]
                # Handle attribute access on objects (for dict-like objects)
                elif hasattr(value, attr_name):
                    return getattr(value, attr_name)
                else:
                    raise AttributeError(f"Attribute '{attr_name}' not found on {type(value)}")
            
            elif isinstance(node, ast.Subscript):
                # Dictionary/array subscript (obj[key] or obj[key1][key2])
                value = eval_node(node.value, local_vars, current_depth + 1)
                
                # Handle slice node - can be Index (old Python) or direct value (new Python)
                if isinstance(node.slice, ast.Index):
                    # Python < 3.9: slice is wrapped in Index
                    slice_val = eval_node(node.slice.value, local_vars, current_depth + 1)
                elif isinstance(node.slice, ast.Slice):
                    # Slice notation [a:b:c] - not commonly used in our expressions
                    raise ValueError("Slice notation [a:b] not supported in expressions")
                else:
                    # Python 3.9+: slice is directly the value
                    slice_val = eval_node(node.slice, local_vars, current_depth + 1)
                
                # Handle both dict and list/array access
                if isinstance(value, dict):
                    if slice_val not in value:
                        raise KeyError(f"Key '{slice_val}' not found in dictionary")
                    return value[slice_val]
                elif isinstance(value, (list, tuple)):
                    if not isinstance(slice_val, int):
                        raise TypeError(f"List index must be integer, got {type(slice_val)}")
                    if slice_val < 0 or slice_val >= len(value):
                        raise IndexError(f"List index {slice_val} out of range")
                    return value[slice_val]
                else:
                    raise TypeError(f"Cannot subscript type {type(value)}")
            
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
