from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import shutil, os, uuid

from app.db.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.meeting import Meeting
from app.models.action_item import ActionItem
from app.schemas.meeting import MeetingCreate, MeetingOut, MeetingDetail
from app.services import transcription, llm

router = APIRouter()
UPLOAD_DIR = "uploads/audio"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("", response_model=List[MeetingOut])
def list_meetings(project: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Meeting).filter(Meeting.owner_id == current_user.id)
    if project:
        q = q.filter(Meeting.project == project)
    return q.order_by(Meeting.date.desc()).all()

@router.post("", response_model=MeetingOut, status_code=201)
def create_meeting(payload: MeetingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = Meeting(**payload.dict(), owner_id=current_user.id)
    db.add(meeting); db.commit(); db.refresh(meeting)
    return meeting

@router.post("/{meeting_id}/upload-audio", response_model=MeetingDetail)
async def upload_and_process(meeting_id: int, audio: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Core endpoint: upload audio → transcribe → summarize → extract action items."""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.owner_id == current_user.id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    ext = os.path.splitext(audio.filename)[1]
    path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}{ext}")
    with open(path, "wb") as f:
        shutil.copyfileobj(audio.file, f)

    try:
        transcript = await transcription.transcribe_audio(path)
        summary    = await llm.summarize_meeting(transcript)
        items      = await llm.extract_action_items(transcript)
    except Exception as e:
        import httpx
        if isinstance(e, httpx.HTTPStatusError) and e.response.status_code == 401:
            raise HTTPException(
                status_code=400,
                detail="Groq API key is invalid or unauthorized. Please verify your GROQ_API_KEY in the backend .env file."
            )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process audio with AI: {str(e)}"
        )

    meeting.audio_path = path
    meeting.raw_transcript = transcript
    meeting.summary = summary
    db.commit()

    def parse_date(date_str):
        if not date_str:
            return None
        try:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except Exception:
            try:
                return datetime.strptime(date_str.split('T')[0], "%Y-%m-%d")
            except Exception:
                return None

    for item in items:
        raw_due_date = item.get("due_date")
        due_date = parse_date(raw_due_date) if raw_due_date else None
        db.add(ActionItem(
            meeting_id=meeting.id,
            description=item.get("description", ""),
            owner_name=item.get("owner_name"),
            due_date=due_date
        ))
    db.commit(); db.refresh(meeting)
    return meeting

@router.get("/{meeting_id}", response_model=MeetingDetail)
def get_meeting(meeting_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.owner_id == current_user.id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting

@router.get("/{meeting_id}/brief")
async def get_brief(meeting_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Pre-meeting brief: what was decided + who hasn't done their tasks."""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.owner_id == current_user.id).first()
    if not meeting or not meeting.summary:
        raise HTTPException(status_code=404, detail="Meeting not found or not yet processed")
    action_items = [{"description": a.description, "owner_name": a.owner_name, "is_done": a.is_done} for a in meeting.action_items]
    brief = await llm.generate_pre_meeting_brief(meeting.summary, action_items)
    meeting.brief = brief; db.commit()
    return {"brief": brief}

@router.delete("/{meeting_id}", status_code=204)
def delete_meeting(meeting_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.owner_id == current_user.id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    db.delete(meeting); db.commit()
