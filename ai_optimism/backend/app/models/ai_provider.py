from pydantic import BaseModel, Field
from typing import Optional, Literal

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
