# ai_optimism/backend/app/routers/sessions.py
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import time
import httpx
from sqlmodel import Session as DBSession, select
from sqlalchemy.orm import selectinload
# Import to check against MetaData class (not to use the class)
try:
    from sqlalchemy import MetaData as SQLAMetaData
except ImportError:
    SQLAMetaData = None
from ..models.session import (
    Session, Message, CreateSessionRequest, UpdateSessionRequest, AddMessageRequest,
    SessionResponse, MessageResponse, AISessionConfig, AISessionConfigResponse,
    SetAISessionConfigRequest, MessageUpdateItem
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
    try:
        print(f"[update_session] Received update request for session {session_id}")
        print(f"[update_session] Has messages: {request.messages is not None}")
        if request.messages:
            print(f"[update_session] Number of messages: {len(request.messages)}")
            # Log first message to see structure
            if request.messages:
                first_msg = request.messages[0]
                print(f"[update_session] First message type: {type(first_msg)}")
                print(f"[update_session] First message id: {getattr(first_msg, 'id', None) if not isinstance(first_msg, dict) else first_msg.get('id')}")
                if isinstance(first_msg, dict):
                    print(f"[update_session] First message keys: {list(first_msg.keys())}")
                    print(f"[update_session] First message metadata: {first_msg.get('metadata')}")
                    print(f"[update_session] First message metadata type: {type(first_msg.get('metadata'))}")
                elif hasattr(first_msg, 'model_dump'):
                    try:
                        first_msg_dict = first_msg.model_dump(by_alias=True)
                        print(f"[update_session] First message (model_dump) keys: {list(first_msg_dict.keys())}")
                        print(f"[update_session] First message (model_dump) metadata: {first_msg_dict.get('metadata')}")
                        print(f"[update_session] First message (model_dump) metadata type: {type(first_msg_dict.get('metadata'))}")
                    except Exception as e:
                        print(f"[update_session] Error in model_dump for first message: {e}")
                elif hasattr(first_msg, '__dict__'):
                    print(f"[update_session] First message attributes: {list(first_msg.__dict__.keys())}")
                    if 'metadata' in first_msg.__dict__:
                        print(f"[update_session] First message __dict__ metadata: {first_msg.__dict__['metadata']} (type: {type(first_msg.__dict__['metadata'])})")
                    elif 'metadata_' in first_msg.__dict__:
                        print(f"[update_session] First message __dict__ metadata_: {first_msg.__dict__['metadata_']} (type: {type(first_msg.__dict__['metadata_'])})")
        
        # Load session with messages relationship
        session = db.exec(select(Session).where(Session.id == session_id).options(selectinload(Session.messages))).first()
        if not session:
            print(f"[update_session] Session {session_id} not found")
            raise HTTPException(status_code=404, detail="Session not found")
        
        print(f"[update_session] Session found with {len(session.messages)} existing messages")

        # Update fields if provided (excluding messages which we handle separately)
        session_data = request.model_dump(exclude_unset=True)
        messages_to_update = session_data.pop("messages", None)
        
        for key, value in session_data.items():
            setattr(session, key, value)

        # Helper to get attribute from message (handles dict or object)
        def get_msg_attr(msg, attr, default=None):
            if isinstance(msg, dict):
                return msg.get(attr, default)
            return getattr(msg, attr, default)
        
        # Helper to validate metadata is not SQLAlchemy MetaData class
        def is_valid_metadata(metadata_value):
            """Check if metadata_value is a valid dict (not SQLAlchemy MetaData class)"""
            if metadata_value is None:
                return False
            if SQLAMetaData is not None and isinstance(metadata_value, SQLAMetaData):
                return False
            return isinstance(metadata_value, dict)

        # Handle message updates if provided
        if request.messages is not None:
            print(f"[update_session] Updating {len(request.messages)} messages")
            # Create a dictionary of message IDs to the updated message objects for quick lookup
            # MessageUpdateItem is a Pydantic model, so accessing .id should work directly
            updated_messages_dict = {}
            for msg in request.messages:
                msg_id = getattr(msg, 'id', None) if not isinstance(msg, dict) else msg.get('id')
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
                    # MessageUpdateItem has a simple 'metadata' field (Pydantic BaseModel)
                    # So we can access it directly via attribute or model_dump
                    new_metadata = None
                    
                    # Method 1: Try attribute access directly (MessageUpdateItem is a Pydantic model)
                    if hasattr(updated_message, 'metadata'):
                        metadata_val = getattr(updated_message, 'metadata', None)
                        if is_valid_metadata(metadata_val):
                            new_metadata = metadata_val
                            print(f"[update_session] Got metadata via attribute access for message {existing_message.id}")
                    
                    # Method 2: Try model_dump (Pydantic models support this)
                    if new_metadata is None:
                        try:
                            if hasattr(updated_message, 'model_dump'):
                                msg_dict = updated_message.model_dump(exclude_unset=False)
                                metadata_val = msg_dict.get('metadata')
                                if is_valid_metadata(metadata_val):
                                    new_metadata = metadata_val
                                    print(f"[update_session] Got metadata via model_dump for message {existing_message.id}")
                        except Exception as e:
                            print(f"[update_session] Error in model_dump for message {existing_message.id}: {e}")
                    
                    # Method 3: Try as dictionary (fallback)
                    if new_metadata is None and isinstance(updated_message, dict):
                        metadata_val = updated_message.get('metadata')
                        if is_valid_metadata(metadata_val):
                            new_metadata = metadata_val
                            print(f"[update_session] Got metadata via dict access for message {existing_message.id}")
                    
                    # Update metadata if we found valid metadata
                    if new_metadata is not None and isinstance(new_metadata, dict):
                        existing_message.metadata_ = new_metadata
                        print(f"[update_session] Updated message {existing_message.id} metadata: {new_metadata}")
                    else:
                        print(f"[update_session] No valid metadata found for message {existing_message.id}")
                        print(f"[update_session] Message type: {type(updated_message)}")
                        if hasattr(updated_message, 'metadata'):
                            print(f"[update_session] Message.metadata attribute: {getattr(updated_message, 'metadata', None)} (type: {type(getattr(updated_message, 'metadata', None))})")
                        if isinstance(updated_message, dict):
                            print(f"[update_session] Message dict keys: {list(updated_message.keys())}")
                            print(f"[update_session] Message dict metadata value: {updated_message.get('metadata')} (type: {type(updated_message.get('metadata'))})")
                    
                    # Update sender if changed (shouldn't happen but handle it)
                    new_sender = get_msg_attr(updated_message, 'sender')
                    if new_sender is not None and new_sender != existing_message.sender:
                        existing_message.sender = new_sender
                    
                    # Update timestamp if changed (shouldn't happen but handle it)
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
        print(f"[update_session] Session updated successfully, returning response")
        return session_to_response(session)
    except HTTPException:
        raise
    except Exception as e:
        print(f"[update_session] ERROR updating session {session_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

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