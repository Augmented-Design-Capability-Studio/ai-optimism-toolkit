from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal

class ModifierStrategy(BaseModel):
    type: Literal["gaussian", "uniform", "random_reset", "neighbor_step"]
    sigma: Optional[float] = None
    stepSize: Optional[float] = None
    probability: Optional[float] = 1.0

class Variable(BaseModel):
    name: str
    type: Literal["continuous", "discrete", "categorical"]
    min: Optional[float] = None
    max: Optional[float] = None
    default: Optional[float] = None
    unit: Optional[str] = None
    description: str
    categories: Optional[List[str]] = None
    currentCategory: Optional[str] = None
    modifierStrategy: Optional[ModifierStrategy] = None

class Objective(BaseModel):
    name: str
    expression: str
    goal: Literal["minimize", "maximize"]
    description: str

class Property(BaseModel):
    name: str
    expression: str
    description: str

class Constraint(BaseModel):
    expression: str
    description: str

class OptimizationProblem(BaseModel):
    name: str
    description: Optional[str] = None
    variables: List[Variable]
    objectives: List[Objective]
    properties: Optional[List[Property]] = None
    constraints: Optional[List[Constraint]] = None

class OptimizationConfig(BaseModel):
    problem_id: str
    population_size: int = 50
    max_iterations: int = 100
    convergence_threshold: float = 0.001