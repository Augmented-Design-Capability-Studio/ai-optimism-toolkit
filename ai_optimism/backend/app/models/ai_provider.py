from pydantic import BaseModel, Field
from typing import Optional, Literal, List, Dict, Any

class AIProviderConfig(BaseModel):
    provider: Literal["openai", "anthropic", "google", "ollama", "custom"]
    api_key: str
    model: str
    endpoint: Optional[str] = None  # for custom/local providers
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=4000, ge=1, le=32000)

class AIValidationRequest(BaseModel):
    provider: Literal["openai", "anthropic", "google", "ollama", "custom"]
    api_key: str
    model: str
    endpoint: Optional[str] = None

class AIValidationResponse(BaseModel):
    status: Literal["success", "error"]
    message: str
    provider: str
    model: str
    details: Optional[dict] = None

class GenerateVariablesRequest(BaseModel):
    problem_name: str
    description: Optional[str] = None
    provider: Literal["openai", "anthropic", "google", "ollama", "custom"]
    api_key: str
    model: str
    endpoint: Optional[str] = None

class GeneratedVariable(BaseModel):
    name: str
    type: Literal["numerical", "categorical"]
    min: Optional[float] = None
    max: Optional[float] = None
    unit: Optional[str] = None
    categories: Optional[List[str]] = None
    modifier_strategy: Optional[Literal["cycle", "random"]] = None
    reasoning: Optional[str] = None  # Why this variable was suggested

class GenerateVariablesResponse(BaseModel):
    status: Literal["success", "error"]
    message: str
    variables: Optional[List[GeneratedVariable]] = None

class GeneratePropertiesRequest(BaseModel):
    problem_name: str
    description: Optional[str] = None
    variables: List[GeneratedVariable]
    provider: Literal["openai", "anthropic", "google", "ollama", "custom"]
    api_key: str
    model: str
    endpoint: Optional[str] = None

class GeneratedProperty(BaseModel):
    name: str
    expression: str
    description: str

class GeneratePropertiesResponse(BaseModel):
    status: Literal["success", "error"]
    message: str
    properties: Optional[List[GeneratedProperty]] = None

class GenerateObjectiveRequest(BaseModel):
    problem_name: str
    description: str
    objective_description: str
    variables: List[GeneratedVariable]
    properties: Optional[List[GeneratedProperty]] = None
    provider: Literal["openai", "anthropic", "google", "ollama", "custom"]
    api_key: str
    model: str
    endpoint: Optional[str] = None

class GenerateObjectiveResponse(BaseModel):
    status: Literal["success", "error"]
    message: str
    code: Optional[str] = None
    explanation: Optional[str] = None

class GenerateConstraintsRequest(BaseModel):
    problem_name: str
    description: Optional[str] = None
    variables: List[GeneratedVariable]
    properties: Optional[List[GeneratedProperty]] = None
    provider: Literal["openai", "anthropic", "google", "ollama", "custom"]
    api_key: str
    model: str
    endpoint: Optional[str] = None

class GeneratedConstraint(BaseModel):
    expression: str
    description: str

class GenerateConstraintsResponse(BaseModel):
    status: Literal["success", "error"]
    message: str
    constraints: Optional[List[GeneratedConstraint]] = None
