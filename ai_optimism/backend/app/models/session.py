# ai_optimism/backend/app/models/session.py
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List, Literal
from datetime import datetime

class MessageMetadata(BaseModel):
    type: Optional[Literal["formalization", "controls-generation"]] = None
    incomplete: Optional[bool] = None
    controlsGenerated: Optional[bool] = None
    controlsError: Optional[str] = None
    structuredData: Optional[Any] = None

class Message(BaseModel):
    id: str
    sessionId: str
    sender: Literal["user", "researcher", "ai"]
    content: str
    timestamp: int
    metadata: Optional[MessageMetadata] = None

class Session(BaseModel):
    id: str
    mode: Literal["ai", "experimental"]
    status: Literal["active", "waiting", "formalized", "completed"]
    userId: str
    researcherId: Optional[str] = None
    createdAt: int
    updatedAt: int
    lastActivity: int  # Timestamp of last client activity
    messages: List[Message] = []
    isResearcherTyping: Optional[bool] = None
    isAIResponding: Optional[bool] = None

class CreateSessionRequest(BaseModel):
    mode: Literal["ai", "experimental"]
    userId: str = "default-user"
    researcherId: Optional[str] = None

class UpdateSessionRequest(BaseModel):
    mode: Optional[Literal["ai", "experimental"]] = None
    status: Optional[Literal["active", "waiting", "formalized", "completed"]] = None
    researcherId: Optional[str] = None
    isResearcherTyping: Optional[bool] = None
    isAIResponding: Optional[bool] = None

class AddMessageRequest(BaseModel):
    sender: Literal["user", "researcher", "ai"]
    content: str
    metadata: Optional[MessageMetadata] = None