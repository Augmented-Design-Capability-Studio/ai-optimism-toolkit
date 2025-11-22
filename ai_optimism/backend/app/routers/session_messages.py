"""Message endpoints for sessions"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
import time
from sqlmodel import Session as DBSession, select
from ..models.session import (
    Message, AddMessageRequest, MessageResponse, Session
)
from ..utils.common import generate_id, detect_formalization_readiness
from ..database import get_session

router = APIRouter(prefix="/{session_id}/messages", tags=["sessions"])


@router.post("", response_model=MessageResponse)
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


@router.get("", response_model=List[MessageResponse])
async def get_messages(session_id: str, db: DBSession = Depends(get_session)):
    """Get all messages for a session"""
    messages = db.exec(select(Message).where(Message.sessionId == session_id)).all()
    return [MessageResponse.from_orm_message(m) for m in messages]

