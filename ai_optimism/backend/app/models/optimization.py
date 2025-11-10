from pydantic import BaseModel, validator, Field
from typing import List, Dict, Any, Optional, Literal

class Variable(BaseModel):
    name: str
    type: Literal["numerical", "categorical"] = "numerical"
    # Numerical properties
    min: Optional[float] = None
    max: Optional[float] = None
    unit: Optional[str] = None
    # Categorical properties
    categories: Optional[List[str]] = None
    
    @validator('categories')
    def validate_categories(cls, v, values):
        if values.get('type') == 'categorical':
            if not v or len(v) < 2:
                raise ValueError('Categorical variables must have at least 2 categories')
        return v
    
    @validator('min', 'max')
    def validate_numerical_bounds(cls, v, values):
        if values.get('type') == 'numerical' and v is None:
            raise ValueError('Numerical variables must have min and max values')
        return v

class OptimizationProblem(BaseModel):
    name: str
    description: Optional[str] = None
    variables: List[Variable]  # List of Variable objects with type support
    objective_function: str  # Description or code for the objective function
    constraints: Optional[List[str]] = None  # Optional list of constraint descriptions
    categorical_modifier_strategy: Optional[Literal["cycle", "random"]] = "random"  # How to modify categorical variables

class OptimizationConfig(BaseModel):
    problem_id: str
    population_size: int = 50
    max_iterations: int = 100
    convergence_threshold: float = 0.001