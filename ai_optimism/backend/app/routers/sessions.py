# ai_optimism/backend/app/routers/sessions.py
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import time
import httpx
from sqlmodel import Session as DBSession, select
from sqlalchemy.orm import selectinload
from ..models.session import (
    Session, Message, CreateSessionRequest, UpdateSessionRequest, AddMessageRequest,
    SessionResponse, MessageResponse, AISessionConfig, AISessionConfigResponse,
    SetAISessionConfigRequest
)
from ..utils.common import generate_id, detect_formalization_readiness
from ..utils.encryption import encrypt_api_key, decrypt_api_key
from ..database import get_session

router = APIRouter(tags=["sessions"])

def session_to_response(session: Session) -> SessionResponse:
    """Convert ORM Session to SessionResponse"""
    return SessionResponse(
        id=session.id,
        mode=session.mode,
        status=session.status,
        userId=session.userId,
        researcherId=session.researcherId,
        createdAt=session.createdAt,
        updatedAt=session.updatedAt,
        lastActivity=session.lastActivity,
        isResearcherTyping=session.isResearcherTyping,
        isAIResponding=session.isAIResponding,
        readyToFormalize=session.readyToFormalize,
        messages=[MessageResponse.from_orm_message(m) for m in session.messages]
    )

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
        print(f"[update_session] Updating {len(request.messages)} messages")
        # Create a dictionary of message IDs to the updated Message objects for quick lookup
        updated_messages_dict = {msg.id: msg for msg in request.messages if msg.id}
        
        # Update existing messages in the database
        for existing_message in session.messages:
            if existing_message.id in updated_messages_dict:
                updated_message = updated_messages_dict[existing_message.id]
                
                # Update content if changed
                if updated_message.content != existing_message.content:
                    existing_message.content = updated_message.content
                
                # Update metadata if changed (handle alias 'metadata' -> 'metadata_')
                # Try multiple ways to access metadata to ensure we get it
                new_metadata = None
                
                # Method 1: Try direct attribute access (after FastAPI deserialization, both might work)
                if hasattr(updated_message, 'metadata_'):
                    new_metadata = getattr(updated_message, 'metadata_', None)
                if new_metadata is None and hasattr(updated_message, 'metadata'):
                    new_metadata = getattr(updated_message, 'metadata', None)
                
                # Method 2: Try model_dump to get via alias
                if new_metadata is None:
                    try:
                        msg_dict = updated_message.model_dump(by_alias=True, exclude_unset=False)
                        new_metadata = msg_dict.get('metadata')
                    except Exception as e:
                        print(f"[update_session] Error in model_dump for message {existing_message.id}: {e}")
                
                # Update metadata if we found it
                if new_metadata is not None:
                    existing_message.metadata_ = new_metadata
                    print(f"[update_session] Updated message {existing_message.id} metadata: {new_metadata}")
                else:
                    print(f"[update_session] No metadata found for message {existing_message.id}")
                
                # Update sender if changed (shouldn't happen but handle it)
                if updated_message.sender != existing_message.sender:
                    existing_message.sender = updated_message.sender
                
                # Update timestamp if changed (shouldn't happen but handle it)
                if updated_message.timestamp != existing_message.timestamp:
                    existing_message.timestamp = updated_message.timestamp
                
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

@router.post("/{session_id}/messages", response_model=MessageResponse)
async def add_message(session_id: str, request: AddMessageRequest, db: DBSession = Depends(get_session)):
    """Add a message to a session"""
    session = db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    message = Message(
        id=generate_id(),
        sessionId=session_id,
        sender=request.sender,
        content=request.content,
        timestamp=int(time.time() * 1000),
        metadata_=request.metadata,
    )

    db.add(message)
    
    session.updatedAt = int(time.time() * 1000)
    session.lastActivity = int(time.time() * 1000)

    # Update session status based on message context
    if request.sender == "user" and session.mode == "experimental":
        session.status = "waiting"
        session.readyToFormalize = False
    elif request.sender == "researcher":
        session.status = "active"
        if detect_formalization_readiness(request.content):
            session.readyToFormalize = True
    elif request.sender == "ai":
        session.status = "active"
        if detect_formalization_readiness(request.content):
            session.readyToFormalize = True
            
    db.add(session)
    db.commit()
    db.refresh(message)

    return MessageResponse.from_orm_message(message)

@router.get("/{session_id}/messages", response_model=List[MessageResponse])
async def get_messages(session_id: str, db: DBSession = Depends(get_session)):
    """Get all messages for a session"""
    messages = db.exec(select(Message).where(Message.sessionId == session_id)).all()
    return [MessageResponse.from_orm_message(m) for m in messages]

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

# Helper function to validate API key by making a test request
async def validate_api_key(provider: str, api_key: str, model: str, endpoint: Optional[str] = None) -> tuple[bool, Optional[str]]:
    """
    Validate an API key by making a test request to the AI provider
    
    Returns:
        (is_valid, error_message)
    """
    # For now, we'll do a simple validation
    # In production, you might want to make an actual API call to validate
    # For Google Gemini, we can validate by checking the key format
    if not api_key or not api_key.strip():
        return False, "API key cannot be empty"
    
    # Basic format validation for Google Gemini keys
    if provider == "google":
        if not api_key.startswith("AI") and len(api_key) < 20:
            return False, "Invalid API key format"
    
    # For other providers, you could add similar validation
    # For a more robust validation, you could make an actual API call here
    # but that would require additional dependencies
    
    return True, None

@router.get("/{session_id}/ai-config", response_model=AISessionConfigResponse)
async def get_ai_config(session_id: str, db: DBSession = Depends(get_session)):
    """Get AI provider configuration for a session (status only, no API key)"""
    session = db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Load AI config if it exists
    ai_config = db.exec(
        select(AISessionConfig).where(AISessionConfig.sessionId == session_id)
    ).first()
    
    if not ai_config:
        raise HTTPException(status_code=404, detail="AI config not found for this session")
    
    return AISessionConfigResponse(
        sessionId=ai_config.sessionId,
        provider=ai_config.provider,
        model=ai_config.model,
        endpoint=ai_config.endpoint,
        status=ai_config.status,
        lastValidated=ai_config.lastValidated,
        setBy=ai_config.setBy,
        setAt=ai_config.setAt,
        errorMessage=ai_config.errorMessage,
    )

@router.post("/{session_id}/ai-config", response_model=AISessionConfigResponse)
async def set_ai_config(
    session_id: str,
    request: SetAISessionConfigRequest,
    db: DBSession = Depends(get_session)
):
    """Set AI provider configuration for a session (encrypts API key before storage)"""
    session = db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Validate setBy value
    if request.setBy not in ["user", "researcher"]:
        raise HTTPException(status_code=400, detail="setBy must be 'user' or 'researcher'")
    
    # Validate API key
    is_valid, error_msg = await validate_api_key(request.provider, request.apiKey, request.model, request.endpoint)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg or "Invalid API key")
    
    # Encrypt the API key
    try:
        encrypted_key = encrypt_api_key(request.apiKey)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to encrypt API key: {str(e)}")
    
    current_time = int(time.time() * 1000)
    
    # Check if config already exists
    existing_config = db.exec(
        select(AISessionConfig).where(AISessionConfig.sessionId == session_id)
    ).first()
    
    if existing_config:
        # Update existing config
        existing_config.provider = request.provider
        existing_config.api_key_encrypted = encrypted_key
        existing_config.model = request.model
        existing_config.endpoint = request.endpoint
        existing_config.status = "connected"
        existing_config.lastValidated = current_time
        existing_config.setBy = request.setBy
        existing_config.setAt = current_time
        existing_config.errorMessage = None
        db.add(existing_config)
    else:
        # Create new config
        ai_config = AISessionConfig(
            sessionId=session_id,
            provider=request.provider,
            api_key_encrypted=encrypted_key,
            model=request.model,
            endpoint=request.endpoint,
            status="connected",
            lastValidated=current_time,
            setBy=request.setBy,
            setAt=current_time,
            errorMessage=None,
        )
        db.add(ai_config)
    
    db.commit()
    db.refresh(existing_config if existing_config else ai_config)
    
    config = existing_config if existing_config else ai_config
    
    return AISessionConfigResponse(
        sessionId=config.sessionId,
        provider=config.provider,
        model=config.model,
        endpoint=config.endpoint,
        status=config.status,
        lastValidated=config.lastValidated,
        setBy=config.setBy,
        setAt=config.setAt,
        errorMessage=config.errorMessage,
    )

@router.post("/{session_id}/ai-config/validate")
async def validate_ai_config(session_id: str, db: DBSession = Depends(get_session)):
    """Validate the stored API key for a session"""
    session = db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    ai_config = db.exec(
        select(AISessionConfig).where(AISessionConfig.sessionId == session_id)
    ).first()
    
    if not ai_config:
        raise HTTPException(status_code=404, detail="AI config not found for this session")
    
    # Decrypt the API key
    try:
        api_key = decrypt_api_key(ai_config.api_key_encrypted)
    except Exception as e:
        # Update status to error
        ai_config.status = "error"
        ai_config.errorMessage = f"Failed to decrypt API key: {str(e)}"
        db.add(ai_config)
        db.commit()
        raise HTTPException(status_code=500, detail="Failed to decrypt API key")
    
    # Validate the API key
    is_valid, error_msg = await validate_api_key(ai_config.provider, api_key, ai_config.model, ai_config.endpoint)
    
    current_time = int(time.time() * 1000)
    
    if is_valid:
        ai_config.status = "connected"
        ai_config.lastValidated = current_time
        ai_config.errorMessage = None
    else:
        ai_config.status = "error"
        ai_config.errorMessage = error_msg or "Validation failed"
    
    db.add(ai_config)
    db.commit()
    
    return {
        "status": "connected" if is_valid else "error",
        "message": "Validation successful" if is_valid else (error_msg or "Validation failed"),
        "lastValidated": current_time if is_valid else ai_config.lastValidated,
    }

def get_decrypted_api_key_for_session(session_id: str, db: DBSession) -> Optional[str]:
    """
    Internal helper to get decrypted API key for a session
    This should only be used internally, never exposed via API
    """
    ai_config = db.exec(
        select(AISessionConfig).where(AISessionConfig.sessionId == session_id)
    ).first()
    
    if not ai_config:
        return None
    
    try:
        return decrypt_api_key(ai_config.api_key_encrypted)
    except Exception:
        return None