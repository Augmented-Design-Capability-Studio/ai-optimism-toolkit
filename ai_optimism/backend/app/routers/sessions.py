"""Session CRUD endpoints"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
import time
from sqlmodel import Session as DBSession, select
from sqlalchemy.orm import selectinload
from ..models.session import (
    Session, CreateSessionRequest, UpdateSessionRequest,
    SessionResponse, MessageUpdateItem
)
from ..utils.common import generate_id
from ..utils.session_helpers import (
    session_to_response, get_msg_attr, is_valid_metadata
)
from ..database import get_session
from .session_messages import router as messages_router
from .session_ai_config import router as ai_config_router

router = APIRouter(tags=["sessions"])

# Include sub-routers
router.include_router(messages_router)
router.include_router(ai_config_router)


@router.post("/", response_model=SessionResponse)
async def create_session(request: CreateSessionRequest, db: DBSession = Depends(get_session)):
    """Create a new chat session"""
    session = Session(
        id=generate_id(),
        mode=request.mode,
        status="active",
        userId=request.userId,
        researcherId=request.researcherId,
        createdAt=int(time.time() * 1000),
        updatedAt=int(time.time() * 1000),
        lastActivity=int(time.time() * 1000),
        readyToFormalize=False,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    # Reload with messages
    session = db.exec(select(Session).where(Session.id == session.id).options(selectinload(Session.messages))).first()
    return session_to_response(session)


@router.get("/", response_model=List[SessionResponse])
async def list_sessions(db: DBSession = Depends(get_session)):
    """Get all sessions"""
    sessions = db.exec(select(Session).options(selectinload(Session.messages))).all()
    return [session_to_response(s) for s in sessions]


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session_by_id(session_id: str, db: DBSession = Depends(get_session)):
    """Get a specific session by ID"""
    session = db.exec(select(Session).where(Session.id == session_id).options(selectinload(Session.messages))).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session_to_response(session)


@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(session_id: str, request: UpdateSessionRequest, db: DBSession = Depends(get_session)):
    """Update a session"""
    # Load session with messages relationship
    session = db.exec(select(Session).where(Session.id == session_id).options(selectinload(Session.messages))).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Update fields if provided (excluding messages which we handle separately)
    session_data = request.model_dump(exclude_unset=True)
    messages_to_update = session_data.pop("messages", None)
    
    for key, value in session_data.items():
        setattr(session, key, value)

    # Handle message updates if provided
    if request.messages is not None:
        # Create a dictionary of message IDs to the updated message objects for quick lookup
        updated_messages_dict = {}
        for msg in request.messages:
            msg_id = get_msg_attr(msg, 'id')
            if msg_id:
                updated_messages_dict[msg_id] = msg
        
        # Update existing messages in the database
        for existing_message in session.messages:
            if existing_message.id in updated_messages_dict:
                updated_message = updated_messages_dict[existing_message.id]
                
                # Update content if changed
                new_content = get_msg_attr(updated_message, 'content')
                if new_content is not None and new_content != existing_message.content:
                    existing_message.content = new_content
                
                # Update metadata if changed
                new_metadata = None
                
                # Try attribute access directly (MessageUpdateItem is a Pydantic model)
                if hasattr(updated_message, 'metadata'):
                    metadata_val = getattr(updated_message, 'metadata', None)
                    if is_valid_metadata(metadata_val):
                        new_metadata = metadata_val
                
                # Try model_dump (Pydantic models support this)
                if new_metadata is None:
                    try:
                        if hasattr(updated_message, 'model_dump'):
                            msg_dict = updated_message.model_dump(exclude_unset=False)
                            metadata_val = msg_dict.get('metadata')
                            if is_valid_metadata(metadata_val):
                                new_metadata = metadata_val
                    except Exception:
                        pass  # Fall through to next method
                
                # Try as dictionary (fallback)
                if new_metadata is None and isinstance(updated_message, dict):
                    metadata_val = updated_message.get('metadata')
                    if is_valid_metadata(metadata_val):
                        new_metadata = metadata_val
                
                # Update metadata if we found valid metadata
                if new_metadata is not None and isinstance(new_metadata, dict):
                    existing_message.metadata_ = new_metadata
                
                # Update sender if changed
                new_sender = get_msg_attr(updated_message, 'sender')
                if new_sender is not None and new_sender != existing_message.sender:
                    existing_message.sender = new_sender
                
                # Update timestamp if changed
                new_timestamp = get_msg_attr(updated_message, 'timestamp')
                if new_timestamp is not None and new_timestamp != existing_message.timestamp:
                    existing_message.timestamp = new_timestamp
                
                db.add(existing_message)

    session.updatedAt = int(time.time() * 1000)
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # Reload with messages to ensure we have the latest data
    session = db.exec(select(Session).where(Session.id == session_id).options(selectinload(Session.messages))).first()
    return session_to_response(session)


@router.post("/{session_id}/heartbeat")
async def session_heartbeat(session_id: str, db: DBSession = Depends(get_session)):
    """Update session last activity timestamp"""
    session = db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.lastActivity = int(time.time() * 1000)
    db.add(session)
    db.commit()
    return {"status": "ok"}


@router.delete("/{session_id}")
async def delete_session(session_id: str, db: DBSession = Depends(get_session)):
    """Delete a session"""
    session = db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}


@router.get("/waiting/", response_model=List[SessionResponse])
async def get_waiting_sessions(db: DBSession = Depends(get_session)):
    """Get sessions waiting for researcher response"""
    sessions = db.exec(select(Session).where(Session.status == "waiting").options(selectinload(Session.messages))).all()
    return [session_to_response(s) for s in sessions]


@router.delete("/clear/")
async def clear_all_sessions(db: DBSession = Depends(get_session)):
    """Clear all sessions (for testing/development)"""
    sessions = db.exec(select(Session)).all()
    for session in sessions:
        db.delete(session)
    db.commit()
    return {"message": "All sessions cleared"}
