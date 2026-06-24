from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

class FollowUp(Base):
    __tablename__ = "followups"
    id              = Column(Integer, primary_key=True, index=True)
    meeting_id      = Column(Integer, ForeignKey("meetings.id"))
    recipient       = Column(String, nullable=False)
    subject         = Column(String, nullable=False)
    body            = Column(Text, nullable=False)
    sent            = Column(Boolean, default=False)
    sent_at         = Column(DateTime, nullable=True)
    attachment_path = Column(String, nullable=True)
    attachment_name = Column(String, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    meeting         = relationship("Meeting", back_populates="followups")

