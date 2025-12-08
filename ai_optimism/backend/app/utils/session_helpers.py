"""Helper functions for session-related operations"""
from typing import Optional
from sqlmodel import Session as DBSession, select
from ..models.session import (
    Session, SessionResponse, MessageResponse, 
    AISessionConfig, MessageUpdateItem, AISessionConfigResponse
)
from .encryption import decrypt_api_key

# Import to check against MetaData class (not to use the class)
try:
    from sqlalchemy import MetaData as SQLAMetaData
except ImportError:
    SQLAMetaData = None


def session_to_response(session: Session, db: Optional[DBSession] = None) -> SessionResponse:
    """Convert ORM Session to SessionResponse, optionally including AI config"""
    # Load AI config if database session is provided
    ai_config_response = None
    if db:
        ai_config = db.exec(
            select(AISessionConfig).where(AISessionConfig.sessionId == session.id)
        ).first()
        
        if ai_config:
            ai_config_response = AISessionConfigResponse(
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
    
    return SessionResponse(
        id=session.id,
        mode=session.mode,
        status=session.status,
        userId=session.userId,
        researcherId=session.researcherId,
        createdAt=session.createdAt,
        updatedAt=session.updatedAt,
        lastActivity=session.lastActivity,
        isAIResponding=session.isAIResponding,
        readyToFormalize=session.readyToFormalize,
        ipAddress=getattr(session, 'ipAddress', None),
        version=getattr(session, 'version', None),
        systemPrompt=getattr(session, 'systemPrompt', None),
        messages=[MessageResponse.from_orm_message(m) for m in session.messages],
        aiConfig=ai_config_response
    )


def get_msg_attr(msg, attr, default=None):
    """Helper to get attribute from message (handles dict or object)"""
    if isinstance(msg, dict):
        return msg.get(attr, default)
    return getattr(msg, attr, default)


def is_valid_metadata(metadata_value):
    """Check if metadata_value is a valid dict (not SQLAlchemy MetaData class)"""
    if metadata_value is None:
        return False
    if SQLAMetaData is not None and isinstance(metadata_value, SQLAMetaData):
        return False
    return isinstance(metadata_value, dict)


async def validate_api_key(provider: str, api_key: str, model: str, endpoint: Optional[str] = None) -> tuple[bool, Optional[str]]:
    """
    Validate an API key by making a test request to the AI provider
    
    Returns:
        (is_valid, error_message)
    """
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

