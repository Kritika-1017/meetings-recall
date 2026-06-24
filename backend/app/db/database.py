from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from app.models import user, meeting, action_item, followup  # noqa
    Base.metadata.create_all(bind=engine)

    # Run dynamic migrations to ensure new fields exist on SQLite DB
    import sqlite3
    import os
    db_file = settings.DATABASE_URL.replace("sqlite:///./", "").replace("sqlite:///", "")
    if not os.path.isabs(db_file):
        db_file = os.path.abspath(db_file)
    try:
        conn = sqlite3.connect(db_file)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(followups)")
        columns = [row[1] for row in cursor.fetchall()]
        if "attachment_path" not in columns:
            cursor.execute("ALTER TABLE followups ADD COLUMN attachment_path TEXT")
        if "attachment_name" not in columns:
            cursor.execute("ALTER TABLE followups ADD COLUMN attachment_name TEXT")
        conn.commit()
    except Exception as e:
        print("Database migration error:", e)
    finally:
        conn.close()

