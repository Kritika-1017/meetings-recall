from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.schemas.action_item import ActionItemOut

class MeetingCreate(BaseModel):
    title: str
    project: Optional[str] = None
    date: Optional[datetime] = None

class MeetingOut(BaseModel):
    id: int
    title: str
    project: Optional[str]
    date: datetime
    summary: Optional[str]
    brief: Optional[str]
    created_at: datetime
    action_items: List[ActionItemOut] = []
    class Config:
        from_attributes = True

class FollowUpOut(BaseModel):
    id: int
    meeting_id: int
    recipient: str
    subject: str
    body: str
    sent: bool
    sent_at: Optional[datetime] = None
    attachment_path: Optional[str] = None
    attachment_name: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class FollowUpUpdate(BaseModel):
    recipient: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    attachment_path: Optional[str] = None
    attachment_name: Optional[str] = None


class MeetingDetail(MeetingOut):
    raw_transcript: Optional[str]
    action_items: List[ActionItemOut] = []
    followups: List[FollowUpOut] = []

