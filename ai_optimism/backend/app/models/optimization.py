from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal
from sqlmodel import SQLModel, Field as SQLField, JSON, Relationship
import time

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
    attributes: Optional[Dict[str, Dict[str, Any]]] = None  # Attributes for each category: { 'category1': { 'attr1': value, ... }, ... }
    modifierStrategy: Optional[ModifierStrategy] = None

class Objective(BaseModel):
    name: str
    expression: str
    goal: Literal["minimize", "maximize"]
    description: str

class Property(BaseModel):
    name: str
    expression: str
    description: Optional[str] = None  # Optional - omit for dictionary properties mapping categorical choices to attributes

class Constraint(BaseModel):
    expression: str
    description: str
    title: Optional[str] = None

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
    session_id: Optional[str] = None  # Link to session
    heuristic_weights: Optional[Dict[str, Dict[str, float]]] = None  # Custom heuristic weights


# SQLModel database tables for persistence
class OptimizationProblemDB(SQLModel, table=True):
    """Persisted optimization problem definition in database"""
    id: str = SQLField(primary_key=True)
    session_id: Optional[str] = SQLField(default=None, index=True)  # Link to session (nullable for backward compatibility)
    name: str
    description: Optional[str] = None
    variables: Dict[str, Any] = SQLField(sa_type=JSON)  # Store as JSON
    objectives: Dict[str, Any] = SQLField(sa_type=JSON)
    constraints: Optional[Dict[str, Any]] = SQLField(default=None, sa_type=JSON)
    properties: Optional[Dict[str, Any]] = SQLField(default=None, sa_type=JSON)
    created_at: int
    updated_at: int


class OptimizationRunDB(SQLModel, table=True):
    """Each optimization execution stored in database"""
    id: str = SQLField(primary_key=True)
    problem_id: str = SQLField(foreign_key="optimizationproblemdb.id", index=True)
    session_id: Optional[str] = SQLField(default=None, index=True)  # For quick lookup
    config: Dict[str, Any] = SQLField(sa_type=JSON)  # max_iterations, population_size, etc.
    heuristic_weights: Optional[Dict[str, Any]] = SQLField(default=None, sa_type=JSON)  # Custom weights used
    results: Dict[str, Any] = SQLField(sa_type=JSON)  # Top results, best design, etc.
    heuristic_map: Optional[Dict[str, Any]] = SQLField(default=None, sa_type=JSON)  # Full heuristic map data
    status: str  # 'running', 'completed', 'failed'
    started_at: int
    completed_at: Optional[int] = None
    error_message: Optional[str] = None