from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class OptimizationProblem(BaseModel):
    name: str
    description: Optional[str] = None
    variables: List[Dict[str, Any]]  # List of variables with their constraints
    objective_function: str  # Description or code for the objective function
    constraints: Optional[List[str]] = None  # Optional list of constraint descriptions

class OptimizationConfig(BaseModel):
    problem_id: str
    population_size: int = 50
    max_iterations: int = 100
    convergence_threshold: float = 0.001