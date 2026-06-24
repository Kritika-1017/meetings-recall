from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.meeting import Meeting

router = APIRouter()

@router.get("/{meeting_id}")
def get_transcript(meeting_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.owner_id == current_user.id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Not found")
    return {"meeting_id": meeting_id, "transcript": meeting.raw_transcript}

@router.put("/{meeting_id}")
def update_transcript(meeting_id: int, body: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Manually correct transcript."""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.owner_id == current_user.id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Not found")
    meeting.raw_transcript = body.get("transcript", meeting.raw_transcript)
    db.commit()
    return {"message": "Transcript updated"}
