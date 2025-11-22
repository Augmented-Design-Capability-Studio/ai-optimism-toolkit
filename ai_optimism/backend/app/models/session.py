from typing import List, Optional, Dict, Any
from sqlmodel import SQLModel, Field, Relationship, JSON
from pydantic import BaseModel
import time

class Message(SQLModel, table=True):
    id: str = Field(primary_key=True)
    sessionId: str = Field(foreign_key="session.id")
    sender: str
    content: str
    timestamp: int
    metadata_: Optional[Dict[str, Any]] = Field(default=None, sa_type=JSON, alias="metadata")
    
    session: Optional["Session"] = Relationship(back_populates="messages")

    class Config:
        populate_by_name = True

class Session(SQLModel, table=True):
    id: str = Field(primary_key=True)
    mode: str
    status: str
    userId: str
    researcherId: Optional[str] = None
    createdAt: int
    updatedAt: int
    lastActivity: int
    isResearcherTyping: Optional[bool] = False
    isAIResponding: Optional[bool] = False
    readyToFormalize: Optional[bool] = False
    
    messages: List[Message] = Relationship(back_populates="session", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

# Response models to ensure proper serialization
class MessageResponse(BaseModel):
    id: str
    sessionId: str
    sender: str
    content: str
    timestamp: int
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True
        populate_by_name = True

    @classmethod
    def from_orm_message(cls, message: "Message") -> "MessageResponse":
        """Create MessageResponse from ORM Message object"""
        return cls(
            id=message.id,
            sessionId=message.sessionId,
            sender=message.sender,
            content=message.content,
            timestamp=message.timestamp,
            metadata=message.metadata_ if hasattr(message, 'metadata_') else None
        )

class SessionResponse(BaseModel):
    id: str
    mode: str
    status: str
    userId: str
    researcherId: Optional[str] = None
    createdAt: int
    updatedAt: int
    lastActivity: int
    isResearcherTyping: Optional[bool] = False
    isAIResponding: Optional[bool] = False
    readyToFormalize: Optional[bool] = False
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True

class CreateSessionRequest(SQLModel):
    mode: str
    userId: Optional[str] = "default-user"
    researcherId: Optional[str] = None

class MessageUpdateItem(BaseModel):
    """Simplified message model for updates (avoids SQLModel MetaData class issues)"""
    id: str
    sessionId: str
    sender: str
    content: str
    timestamp: int
    metadata: Optional[Dict[str, Any]] = None

class UpdateSessionRequest(SQLModel):
    mode: Optional[str] = None
    status: Optional[str] = None
    researcherId: Optional[str] = None
    isResearcherTyping: Optional[bool] = None
    isAIResponding: Optional[bool] = None
    readyToFormalize: Optional[bool] = None
    messages: Optional[List[MessageUpdateItem]] = None

class AddMessageRequest(SQLModel):
    sender: str
    content: str
    metadata: Optional[Dict[str, Any]] = None

class AISessionConfig(SQLModel, table=True):
    """AI provider configuration for a session (stores encrypted API key)"""
    sessionId: str = Field(primary_key=True, foreign_key="session.id")
    provider: str
    api_key_encrypted: str
    model: str
    endpoint: Optional[str] = None
    status: str = "disconnected"  # 'disconnected' | 'connected' | 'error'
    lastValidated: Optional[int] = None
    setBy: str  # 'user' | 'researcher'
    setAt: int
    errorMessage: Optional[str] = None

class AISessionConfigResponse(BaseModel):
    """Response model for AI config (excludes encrypted API key for security)"""
    sessionId: str
    provider: str
    model: str
    endpoint: Optional[str] = None
    status: str
    lastValidated: Optional[int] = None
    setBy: str
    setAt: int
    errorMessage: Optional[str] = None

    class Config:
        from_attributes = True

class SetAISessionConfigRequest(SQLModel):
    """Request model for setting AI config (includes unencrypted API key)"""
    provider: str
    apiKey: str
    model: str
    endpoint: Optional[str] = None
    setBy: str  # 'user' | 'researcher'