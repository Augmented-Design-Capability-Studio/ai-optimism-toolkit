from pydantic import BaseModel
from typing import Dict, Any, List, Optional

class VariableDefinition(BaseModel):
    """Definition of a variable for evaluation context"""
    name: str
    type: str  # 'continuous', 'discrete', 'categorical'
    attributes: Optional[Dict[str, Dict[str, Any]]] = None  # For categorical: category_name -> attributes dict

class EvaluationRequest(BaseModel):
    """Request to evaluate expressions"""
    expressions: List[str]  # List of Python expressions to evaluate
    variables: Dict[str, Any]  # Variable name -> value mapping
    variable_definitions: Optional[List[VariableDefinition]] = None  # Optional: variable definitions with attributes for categorical wrapping


class EvaluationResult(BaseModel):
    """Result of expression evaluation"""
    expression: str
    value: Optional[Any]  # Can be float, int, dict, or other types
    error: Optional[str]


class EvaluationResponse(BaseModel):
    """Response containing all evaluation results"""
    results: List[EvaluationResult]
