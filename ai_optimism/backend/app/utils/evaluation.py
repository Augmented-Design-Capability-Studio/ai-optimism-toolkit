import ast
import operator
import math
from typing import Dict, Any
from datetime import datetime

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
    'all': all,
    'any': any,
}


class CategoricalVariable:
    """
    Wrapper that makes categorical variables accessible with direct attribute access.
    Allows expressions like variable.attribute_name instead of variable_attributes[variable]['attribute_name']
    """
    def __init__(self, category_name: str, attributes: Dict[str, Any]):
        self._category = category_name
        self._attributes = attributes
    
    def __str__(self):
        return self._category
    
    def __repr__(self):
        return f"CategoricalVariable('{self._category}')"
    
    def __getattr__(self, name):
        # When accessing .price, .arrival_time, etc.
        if self._category in self._attributes:
            if name in self._attributes[self._category]:
                value = self._attributes[self._category][name]
                # If it's an ISO datetime string, return a datetime-like object
                if isinstance(value, str) and 'T' in value and value.count('-') >= 2:
                    return ISODateTimeWrapper(value)
                return value
        raise AttributeError(f"Attribute '{name}' not found for category '{self._category}'")
    
    # Make it work in comparisons and arithmetic (if needed)
    def __eq__(self, other):
        return str(self) == str(other)
    
    def __ne__(self, other):
        return str(self) != str(other)
    
    def __hash__(self):
        return hash(self._category)


class ISODateTimeWrapper:
    """
    Wrapper for ISO datetime strings that allows .hour, .minute access
    without requiring datetime.fromisoformat() which isn't available in safe_eval
    """
    def __init__(self, iso_string: str):
        self._iso_string = iso_string
        # Parse ISO string manually: "2023-12-18T14:30:00"
        try:
            date_part, time_part = iso_string.split('T')
            year, month, day = map(int, date_part.split('-'))
            time_parts = time_part.split(':')
            self._hour = int(time_parts[0])
            self._minute = int(time_parts[1].split('.')[0]) if len(time_parts) > 1 else 0
            self._second = int(time_parts[2].split('.')[0]) if len(time_parts) > 2 else 0
        except (ValueError, IndexError):
            # If parsing fails, default to 0
            self._hour = 0
            self._minute = 0
            self._second = 0
    
    @property
    def hour(self):
        return self._hour
    
    @property
    def minute(self):
        return self._minute
    
    @property
    def second(self):
        return self._second
    
    def __str__(self):
        return self._iso_string
    
    def __repr__(self):
        return f"ISODateTimeWrapper('{self._iso_string}')"


def safe_eval(expression: str, variables: Dict[str, Any]) -> Any:
    """
    Safely evaluate a Python expression using AST
    Supports arithmetic, comparisons, conditionals, common math functions, list comprehensions,
    generator expressions, and attribute access (including dictionary key access via dot notation)
    """
    try:
        # Parse the expression into an AST
        tree = ast.parse(expression, mode='eval')
        
        def eval_node(node, local_vars: Dict[str, Any] = None):
            if local_vars is None:
                local_vars = variables
            
            if isinstance(node, ast.Expression):
                return eval_node(node.body, local_vars)
            
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
                left = eval_node(node.left, local_vars)
                right = eval_node(node.right, local_vars)
                op_type = type(node.op)
                if op_type in SAFE_OPERATORS:
                    return SAFE_OPERATORS[op_type](left, right)
                else:
                    raise ValueError(f"Unsupported operator: {op_type}")
            
            elif isinstance(node, ast.UnaryOp):
                # Unary operations (- +)
                operand = eval_node(node.operand, local_vars)
                op_type = type(node.op)
                if op_type in SAFE_OPERATORS:
                    return SAFE_OPERATORS[op_type](operand)
                else:
                    raise ValueError(f"Unsupported unary operator: {op_type}")
            
            elif isinstance(node, ast.Compare):
                # Comparison operations (< <= > >= == !=)
                left = eval_node(node.left, local_vars)
                for op, comparator in zip(node.ops, node.comparators):
                    right = eval_node(comparator, local_vars)
                    op_type = type(op)
                    if op_type in SAFE_OPERATORS:
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
                        result = eval_node(value_node, local_vars)
                        # Convert to bool for truthiness check
                        if not bool(result):
                            return result
                    return result
                elif op_type == ast.Or:
                    # For 'or': return first truthy value or last value
                    result = None
                    for value_node in node.values:
                        result = eval_node(value_node, local_vars)
                        # Convert to bool for truthiness check
                        if bool(result):
                            return result
                    return result
                else:
                    raise ValueError(f"Unsupported boolean operator: {op_type}")
            
            elif isinstance(node, ast.IfExp):
                # Ternary/conditional expression (a if condition else b)
                condition = eval_node(node.test, local_vars)
                if condition:
                    return eval_node(node.body, local_vars)
                else:
                    return eval_node(node.orelse, local_vars)
            
            elif isinstance(node, ast.Call):
                # Function calls
                func = eval_node(node.func, local_vars)
                args = [eval_node(arg, local_vars) for arg in node.args]
                if callable(func):
                    return func(*args)
                else:
                    raise ValueError(f"Not a callable: {func}")
            
            elif isinstance(node, ast.List):
                # List literal
                return [eval_node(elem, local_vars) for elem in node.elts]
            
            elif isinstance(node, ast.Tuple):
                # Tuple literal
                return tuple(eval_node(elem, local_vars) for elem in node.elts)
            
            elif isinstance(node, ast.Dict):
                # Dictionary literal
                keys = [eval_node(k, local_vars) for k in node.keys]
                values = [eval_node(v, local_vars) for v in node.values]
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
                iterable = eval_node(generator.iter, local_vars)
                
                if not isinstance(iterable, (list, tuple)):
                    raise TypeError(f"List comprehension iterable must be a list or tuple, got {type(iterable)}")
                
                result = []
                var_name = generator.target.id
                
                for item in iterable:
                    # Create new scope with loop variable
                    new_vars = local_vars.copy()
                    new_vars[var_name] = item
                    
                    # Check condition if present
                    if generator.ifs:
                        condition_met = True
                        for if_node in generator.ifs:
                            if not eval_node(if_node, new_vars):
                                condition_met = False
                                break
                        if not condition_met:
                            continue
                    
                    # Evaluate expression and add to result
                    expr_value = eval_node(node.elt, new_vars)
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
                iterable = eval_node(generator.iter, local_vars)
                
                if not isinstance(iterable, (list, tuple)):
                    raise TypeError(f"Generator expression iterable must be a list or tuple, got {type(iterable)}")
                
                # For generator expressions, we evaluate lazily but return a list
                # This allows sum() and other functions to consume them
                result = []
                var_name = generator.target.id
                
                for item in iterable:
                    # Create new scope with loop variable
                    new_vars = local_vars.copy()
                    new_vars[var_name] = item
                    
                    # Check condition if present
                    if generator.ifs:
                        condition_met = True
                        for if_node in generator.ifs:
                            if not eval_node(if_node, new_vars):
                                condition_met = False
                                break
                        if not condition_met:
                            continue
                    
                    # Evaluate expression and add to result
                    expr_value = eval_node(node.elt, new_vars)
                    result.append(expr_value)
                
                # Return as a generator-like object (but as a list for simplicity)
                # Functions like sum() can consume it
                return result
            
            elif isinstance(node, ast.Attribute):
                # Attribute access: obj.attr or obj[key].attr
                value = eval_node(node.value, local_vars)
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
                value = eval_node(node.value, local_vars)
                
                # Handle slice node - can be Index (old Python) or direct value (new Python)
                if isinstance(node.slice, ast.Index):
                    # Python < 3.9: slice is wrapped in Index
                    slice_val = eval_node(node.slice.value, local_vars)
                elif isinstance(node.slice, ast.Slice):
                    # Slice notation [a:b:c] - not commonly used in our expressions
                    raise ValueError("Slice notation [a:b] not supported in expressions")
                else:
                    # Python 3.9+: slice is directly the value
                    slice_val = eval_node(node.slice, local_vars)
                
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
