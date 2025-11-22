"""AI configuration endpoints for sessions"""
from fastapi import APIRouter, HTTPException, Depends
import time
from sqlmodel import Session as DBSession, select
from ..models.session import (
    Session, AISessionConfig, AISessionConfigResponse, SetAISessionConfigRequest
)
from ..utils.session_helpers import validate_api_key
from ..utils.encryption import encrypt_api_key, decrypt_api_key
from ..database import get_session

router = APIRouter(prefix="/{session_id}/ai-config", tags=["sessions"])


@router.get("", response_model=AISessionConfigResponse)
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


@router.post("", response_model=AISessionConfigResponse)
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
        config = existing_config
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
        config = ai_config
    
    db.commit()
    db.refresh(config)
    
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


@router.get("/key")
async def get_ai_config_key(session_id: str, db: DBSession = Depends(get_session)):
    """Get decrypted API key for a session (for client-side AI connection)"""
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
        raise HTTPException(status_code=500, detail=f"Failed to decrypt API key: {str(e)}")
    
    # Return decrypted API key with provider and model info
    return {
        "apiKey": api_key,
        "provider": ai_config.provider,
        "model": ai_config.model,
        "endpoint": ai_config.endpoint,
        "status": ai_config.status,
    }


@router.post("/validate")
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

