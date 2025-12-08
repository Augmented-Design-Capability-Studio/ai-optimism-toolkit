from __future__ import annotations

from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Literal
from sqlmodel import SQLModel, Field, JSON, Relationship
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
    weight: Optional[float] = 1.0  # Weight for combining multiple objectives (default: 1.0)
    min: Optional[float] = None  # Estimated minimum value for normalization
    max: Optional[float] = None  # Estimated maximum value for normalization

class Property(BaseModel):
    name: str
    expression: str
    description: Optional[str] = None  # Optional - omit for dictionary properties mapping categorical choices to attributes

class Constraint(BaseModel):
    expression: str
    description: str
    title: Optional[str] = None
    type: Optional[Literal["hard", "soft"]] = "hard"  # Hard: must be satisfied, Soft: preferred but can be violated
    weight: Optional[float] = 10.0  # For soft constraints: penalty weight

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
    id: str = Field(primary_key=True)
    session_id: Optional[str] = Field(default=None, index=True)  # Link to session (nullable for backward compatibility)
    name: str
    description: Optional[str] = None
    variables: Dict[str, Any] = Field(sa_type=JSON)  # Store as JSON
    objectives: Dict[str, Any] = Field(sa_type=JSON)
    constraints: Optional[Dict[str, Any]] = Field(default=None, sa_type=JSON)
    properties: Optional[Dict[str, Any]] = Field(default=None, sa_type=JSON)
    created_at: int
    updated_at: int


class OptimizationRunDB(SQLModel, table=True):
    """Each optimization execution stored in database"""
    id: str = Field(primary_key=True)
    problem_id: str = Field(foreign_key="optimizationproblemdb.id", index=True)
    session_id: Optional[str] = Field(default=None, index=True)  # For quick lookup
    config: Dict[str, Any] = Field(sa_type=JSON)  # max_iterations, population_size, etc.
    heuristic_weights: Optional[Dict[str, Any]] = Field(default=None, sa_type=JSON)  # Custom weights used
    results: Dict[str, Any] = Field(sa_type=JSON)  # Top results, best design, etc.
    heuristic_map: Optional[Dict[str, Any]] = Field(default=None, sa_type=JSON)  # Full heuristic map data
    status: str  # 'running', 'completed', 'failed'
    started_at: int
    completed_at: Optional[int] = None
    error_message: Optional[str] = None