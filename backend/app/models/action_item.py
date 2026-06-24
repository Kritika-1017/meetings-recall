from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

class ActionItem(Base):
    __tablename__ = "action_items"
    id          = Column(Integer, primary_key=True, index=True)
    meeting_id  = Column(Integer, ForeignKey("meetings.id"))
    description = Column(Text, nullable=False)
    owner_name  = Column(String, nullable=True)
    due_date    = Column(DateTime, nullable=True)
    is_done     = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=datetime.utcnow)
    meeting     = relationship("Meeting", back_populates="action_items")
