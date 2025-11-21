# ai_optimism/backend/app/routers/sessions.py
from fastapi import APIRouter, HTTPException
from typing import List, Optional
import time
from ..models.session import (
    Session, Message, CreateSessionRequest, UpdateSessionRequest, AddMessageRequest
)


def _detect_formalization_readiness(text: str) -> bool:
    """Check if message text indicates readiness to formalize"""
    lower_text = text.lower()
    
    # Check for explicit readiness signals
    is_ready = (
        ('enough information' in lower_text or 
         'ready to formalize' in lower_text or
         'can now formalize' in lower_text or 
         'sufficient information' in lower_text) and
        ('formalize' in lower_text or 'formalise' in lower_text)
    ) or (
        ('would you like' in lower_text or 
         'shall i' in lower_text or 
         'should i' in lower_text or 
         'want me to' in lower_text) and
        ('formalize' in lower_text or 
         'formalise' in lower_text or 
         'structured' in lower_text or 
         'problem definition' in lower_text)
    )
    
    return is_ready

router = APIRouter(tags=["sessions"])

# In-memory storage for sessions (replace with database later)
_sessions: List[Session] = []

def _generate_id() -> str:
    """Generate a unique ID for sessions/messages"""
    import time
    import random
    return f"{int(time.time() * 1000)}-{random.randint(1000, 9999)}"

@router.post("/", response_model=Session)
async def create_session(request: CreateSessionRequest):
    """Create a new chat session"""
    session = Session(
        id=_generate_id(),
        mode=request.mode,
        status="active",
        userId=request.userId,
        researcherId=request.researcherId,
        createdAt=int(time.time() * 1000),
        updatedAt=int(time.time() * 1000),
        lastActivity=int(time.time() * 1000),
        messages=[],
        readyToFormalize=False,
    )
    _sessions.append(session)
    return session

@router.get("/", response_model=List[Session])
async def list_sessions():
    """Get all sessions"""
    return _sessions

@router.get("/{session_id}", response_model=Session)
async def get_session(session_id: str):
    """Get a specific session by ID"""
    session = next((s for s in _sessions if s.id == session_id), None)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.put("/{session_id}", response_model=Session)
async def update_session(session_id: str, request: UpdateSessionRequest):
    """Update a session"""
    session = next((s for s in _sessions if s.id == session_id), None)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Update fields if provided
    if request.mode is not None:
        session.mode = request.mode
    if request.status is not None:
        session.status = request.status
    if request.researcherId is not None:
        session.researcherId = request.researcherId
    if request.isResearcherTyping is not None:
        session.isResearcherTyping = request.isResearcherTyping
    if request.isAIResponding is not None:
        session.isAIResponding = request.isAIResponding
    if request.readyToFormalize is not None:
        session.readyToFormalize = request.readyToFormalize
    if request.messages is not None:
        session.messages = request.messages

    session.updatedAt = int(time.time() * 1000)
    return session

@router.post("/{session_id}/heartbeat")
async def session_heartbeat(session_id: str):
    """Update session last activity timestamp"""
    session = next((s for s in _sessions if s.id == session_id), None)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.lastActivity = int(time.time() * 1000)
    return {"status": "ok"}

@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """Delete a session"""
    global _sessions
    initial_length = len(_sessions)
    _sessions = [s for s in _sessions if s.id != session_id]

    if len(_sessions) == initial_length:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"message": "Session deleted"}

@router.post("/{session_id}/messages", response_model=Message)
async def add_message(session_id: str, request: AddMessageRequest):
    """Add a message to a session"""
    session = next((s for s in _sessions if s.id == session_id), None)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    message = Message(
        id=_generate_id(),
        sessionId=session_id,
        sender=request.sender,
        content=request.content,
        timestamp=int(time.time() * 1000),
        metadata=request.metadata,
    )

    session.messages.append(message)
    session.updatedAt = int(time.time() * 1000)
    session.lastActivity = int(time.time() * 1000)  # Update activity timestamp for any message

    # Update session status based on message context
    if request.sender == "user" and session.mode == "experimental":
        session.status = "waiting"
        # Reset readyToFormalize when user sends a new message (conversation continues)
        session.readyToFormalize = False
    elif request.sender == "researcher":
        session.status = "active"
        # Check if researcher message indicates readiness to formalize
        if _detect_formalization_readiness(request.content):
            session.readyToFormalize = True
    elif request.sender == "ai":
        session.status = "active"
        # Check if AI message indicates readiness to formalize
        if _detect_formalization_readiness(request.content):
            session.readyToFormalize = True

    return message

@router.get("/{session_id}/messages", response_model=List[Message])
async def get_messages(session_id: str):
    """Get all messages for a session"""
    session = next((s for s in _sessions if s.id == session_id), None)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session.messages

@router.get("/waiting/", response_model=List[Session])
async def get_waiting_sessions():
    """Get sessions waiting for researcher response"""
    return [s for s in _sessions if s.status == "waiting"]

@router.delete("/clear/")
async def clear_all_sessions():
    """Clear all sessions (for testing/development)"""
    global _sessions
    _sessions.clear()
    return {"message": "All sessions cleared"}