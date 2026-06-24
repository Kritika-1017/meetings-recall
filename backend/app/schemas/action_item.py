from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ActionItemCreate(BaseModel):
    description: str
    owner_name: Optional[str] = None
    due_date: Optional[datetime] = None

class ActionItemUpdate(BaseModel):
    is_done: Optional[bool] = None
    due_date: Optional[datetime] = None

class ActionItemOut(BaseModel):
    id: int
    meeting_id: int
    description: str
    owner_name: Optional[str]
    due_date: Optional[datetime]
    is_done: bool
    created_at: datetime
    class Config:
        from_attributes = True
