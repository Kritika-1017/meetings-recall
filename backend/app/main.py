from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import meetings, transcripts, action_items, followups, auth
from app.db.database import init_db

app = FastAPI(title="Meeting Memory Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    init_db()

app.include_router(auth.router,         prefix="/api/auth",         tags=["Auth"])
app.include_router(meetings.router,     prefix="/api/meetings",     tags=["Meetings"])
app.include_router(transcripts.router,  prefix="/api/transcripts",  tags=["Transcripts"])
app.include_router(action_items.router, prefix="/api/action-items", tags=["Action Items"])
app.include_router(followups.router,    prefix="/api/followups",    tags=["Follow-ups"])

@app.get("/")
def root():
    return {"message": "Meeting Memory Engine API running"}
