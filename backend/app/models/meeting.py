from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

class Meeting(Base):
    __tablename__ = "meetings"
    id             = Column(Integer, primary_key=True, index=True)
    title          = Column(String, nullable=False)
    project        = Column(String, nullable=True)
    date           = Column(DateTime, default=datetime.utcnow)
    raw_transcript = Column(Text, nullable=True)
    summary        = Column(Text, nullable=True)
    brief          = Column(Text, nullable=True)
    audio_path     = Column(String, nullable=True)
    owner_id       = Column(Integer, ForeignKey("users.id"))
    created_at     = Column(DateTime, default=datetime.utcnow)
    owner          = relationship("User", back_populates="meetings")
    action_items   = relationship("ActionItem", back_populates="meeting", cascade="all, delete")
    followups      = relationship("FollowUp", back_populates="meeting", cascade="all, delete")
