from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
import os, uuid, shutil
from app.db.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.meeting import Meeting
from app.models.followup import FollowUp
from app.services import llm, email_service
from app.schemas.meeting import FollowUpOut, FollowUpUpdate

router = APIRouter()
ATTACHMENT_DIR = "uploads/attachments"
os.makedirs(ATTACHMENT_DIR, exist_ok=True)

@router.post("/meeting/{meeting_id}/draft", response_model=FollowUpOut)
async def draft_followup(meeting_id: int, body: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """LLM drafts a follow-up email. Body: { recipient: 'email@example.com' }"""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.owner_id == current_user.id).first()
    if not meeting or not meeting.summary:
        raise HTTPException(status_code=404, detail="Meeting not found or not processed yet")
    recipient = body.get("recipient")
    if not recipient:
        raise HTTPException(status_code=400, detail="recipient required")
    items = [{"description": a.description, "owner_name": a.owner_name, "due_date": str(a.due_date)} for a in meeting.action_items]
    drafted = await llm.draft_followup_email(meeting.summary, items, recipient)
    followup = FollowUp(meeting_id=meeting_id, recipient=recipient, subject=drafted["subject"], body=drafted["body"])
    db.add(followup); db.commit(); db.refresh(followup)
    return followup

@router.patch("/{followup_id}", response_model=FollowUpOut)
def update_followup(followup_id: int, payload: FollowUpUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update a drafted follow-up email (only if it hasn't been sent yet)."""
    followup = (db.query(FollowUp).join(Meeting)
        .filter(FollowUp.id == followup_id, Meeting.owner_id == current_user.id).first())
    if not followup:
        raise HTTPException(status_code=404, detail="Not found")
    if followup.sent:
        raise HTTPException(status_code=400, detail="Cannot edit a sent email")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(followup, k, v)
    db.commit(); db.refresh(followup)
    return followup

@router.post("/{followup_id}/send")
def send_followup(followup_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    followup = (db.query(FollowUp).join(Meeting)
        .filter(FollowUp.id == followup_id, Meeting.owner_id == current_user.id).first())
    if not followup:
        raise HTTPException(status_code=404, detail="Not found")
    if followup.sent:
        raise HTTPException(status_code=400, detail="Already sent")
    if not email_service.send_email(
        followup.recipient,
        followup.subject,
        followup.body,
        attachment_path=followup.attachment_path,
        attachment_name=followup.attachment_name
    ):
        raise HTTPException(status_code=500, detail="Failed to send email")
    followup.sent = True; followup.sent_at = datetime.utcnow(); db.commit()
    return {"message": "Email sent"}

@router.get("/meeting/{meeting_id}", response_model=List[FollowUpOut])
def list_followups(meeting_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.owner_id == current_user.id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Not found")
    return meeting.followups

@router.delete("/{followup_id}", status_code=204)
def delete_followup(followup_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a drafted follow-up email."""
    followup = (db.query(FollowUp).join(Meeting)
        .filter(FollowUp.id == followup_id, Meeting.owner_id == current_user.id).first())
    if not followup:
        raise HTTPException(status_code=404, detail="Not found")

    # Delete attachment file if exists
    if followup.attachment_path and os.path.exists(followup.attachment_path):
        try:
            os.remove(followup.attachment_path)
        except Exception:
            pass

    db.delete(followup)
    db.commit()

@router.post("/{followup_id}/attach", response_model=FollowUpOut)
async def upload_attachment(followup_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Upload and associate an attachment to a drafted follow-up email."""
    followup = (db.query(FollowUp).join(Meeting)
        .filter(FollowUp.id == followup_id, Meeting.owner_id == current_user.id).first())
    if not followup:
        raise HTTPException(status_code=404, detail="Not found")
    if followup.sent:
        raise HTTPException(status_code=400, detail="Cannot add attachments to a sent email")

    # If there was an old attachment, delete it
    if followup.attachment_path and os.path.exists(followup.attachment_path):
        try:
            os.remove(followup.attachment_path)
        except Exception:
            pass

    ext = os.path.splitext(file.filename)[1]
    path = os.path.join(ATTACHMENT_DIR, f"{uuid.uuid4()}{ext}")
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    followup.attachment_path = path
    followup.attachment_name = file.filename
    db.commit(); db.refresh(followup)
    return followup

@router.delete("/{followup_id}/attach", response_model=FollowUpOut)
def remove_attachment(followup_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Remove the attachment from a drafted follow-up email."""
    followup = (db.query(FollowUp).join(Meeting)
        .filter(FollowUp.id == followup_id, Meeting.owner_id == current_user.id).first())
    if not followup:
        raise HTTPException(status_code=404, detail="Not found")
    if followup.sent:
        raise HTTPException(status_code=400, detail="Cannot modify a sent email")

    if followup.attachment_path and os.path.exists(followup.attachment_path):
        try:
            os.remove(followup.attachment_path)
        except Exception:
            pass

    followup.attachment_path = None
    followup.attachment_name = None
    db.commit(); db.refresh(followup)
    return followup

