from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.action_item import ActionItem
from app.models.meeting import Meeting
from app.schemas.action_item import ActionItemCreate, ActionItemUpdate, ActionItemOut

router = APIRouter()

@router.get("", response_model=List[ActionItemOut])
def list_all_pending(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """All pending action items across all meetings — the memory view."""
    return (db.query(ActionItem).join(Meeting)
        .filter(Meeting.owner_id == current_user.id, ActionItem.is_done == False)
        .order_by(ActionItem.due_date.asc()).all())

@router.get("/meeting/{meeting_id}", response_model=List[ActionItemOut])
def list_by_meeting(meeting_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.owner_id == current_user.id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Not found")
    return meeting.action_items

@router.post("/meeting/{meeting_id}", response_model=ActionItemOut, status_code=201)
def add_action_item(meeting_id: int, payload: ActionItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.owner_id == current_user.id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Not found")
    item = ActionItem(meeting_id=meeting_id, **payload.dict())
    db.add(item); db.commit(); db.refresh(item)
    return item

@router.patch("/{item_id}", response_model=ActionItemOut)
def update_action_item(item_id: int, payload: ActionItemUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = (db.query(ActionItem).join(Meeting)
        .filter(ActionItem.id == item_id, Meeting.owner_id == current_user.id).first())
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(item, k, v)
    db.commit(); db.refresh(item)
    return item

@router.delete("/{item_id}", status_code=204)
def delete_action_item(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = (db.query(ActionItem).join(Meeting)
        .filter(ActionItem.id == item_id, Meeting.owner_id == current_user.id).first())
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item); db.commit()
