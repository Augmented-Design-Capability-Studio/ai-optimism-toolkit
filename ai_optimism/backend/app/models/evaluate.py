from pydantic import BaseModel
from typing import Dict, Any, List, Optional

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
