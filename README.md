# 🧠 Meeting Memory Engine

An AI-powered meeting assistant that transcribes audio, extracts action items, tracks them across meetings, and drafts follow-up emails.

---

## ✨ Features
- 🎙️ Upload meeting audio → Groq Whisper transcribes it
- 🤖 Groq LLM summarizes meeting & extracts action items with owners + due dates
- 📋 Track all pending action items across all meetings in one view
- 🧠 Generate a pre-meeting brief: what was decided last time + who didn't do their tasks
- 📧 LLM drafts follow-up emails → send via SMTP in one click
- 🔐 JWT auth (register/login)
- 📁 Group meetings by project

---

## 🏗️ Project Structure
```
meeting-memory-engine/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app entry point
│   │   ├── api/
│   │   │   ├── deps.py           # JWT auth dependency
│   │   │   └── endpoints/
│   │   │       ├── auth.py       # POST /register, /login
│   │   │       ├── meetings.py   # CRUD + audio upload + brief
│   │   │       ├── transcripts.py# GET/PUT transcript
│   │   │       ├── action_items.py # CRUD action items
│   │   │       └── followups.py  # Draft + send follow-up emails
│   │   ├── core/
│   │   │   ├── config.py         # Settings (env vars)
│   │   │   └── security.py       # JWT + password hashing
│   │   ├── db/
│   │   │   └── database.py       # SQLAlchemy + SQLite setup
│   │   ├── models/               # SQLAlchemy ORM models
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   └── services/
│   │       ├── transcription.py  # Groq Whisper API
│   │       ├── llm.py            # Groq Chat API (summarize, extract, brief, email)
│   │       └── email_service.py  # SMTP sender
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx               # Router + protected routes
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── DashboardPage.jsx     # Meeting list + create
    │   │   ├── MeetingDetailPage.jsx # Upload audio, view summary, action items, emails
    │   │   └── ActionItemsPage.jsx   # All pending tasks across meetings
    │   ├── hooks/
    │   │   └── useMeetings.js
    │   ├── services/
    │   │   └── api.js            # Axios API calls
    │   └── store/
    │       └── authStore.js      # Zustand auth state
    └── package.json
```

---

## 🚀 Getting Started

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env           # Fill in your GROQ_API_KEY etc.

uvicorn app.main:app --reload
# API docs → http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Environment Variables (backend/.env)
| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Get from https://console.groq.com |
| `SECRET_KEY` | Any random string for JWT |
| `SMTP_HOST` | e.g. smtp.gmail.com |
| `SMTP_PORT` | 587 |
| `SMTP_USER` | Your email |
| `SMTP_PASSWORD` | Gmail app password |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login → get JWT |
| GET | `/api/meetings` | List meetings (filter by project) |
| POST | `/api/meetings` | Create meeting |
| GET | `/api/meetings/{id}` | Get meeting detail |
| POST | `/api/meetings/{id}/upload-audio` | Upload audio → transcribe + analyze |
| GET | `/api/meetings/{id}/brief` | Generate pre-meeting brief |
| DELETE | `/api/meetings/{id}` | Delete meeting |
| GET | `/api/transcripts/{id}` | Get raw transcript |
| PUT | `/api/transcripts/{id}` | Manually edit transcript |
| GET | `/api/action-items` | All pending items (cross-meeting) |
| GET | `/api/action-items/meeting/{id}` | Items for one meeting |
| POST | `/api/action-items/meeting/{id}` | Manually add item |
| PATCH | `/api/action-items/{id}` | Mark done / update |
| DELETE | `/api/action-items/{id}` | Delete item |
| POST | `/api/followups/meeting/{id}/draft` | LLM drafts follow-up email |
| POST | `/api/followups/{id}/send` | Send drafted email |
| GET | `/api/followups/meeting/{id}` | List follow-ups for meeting |

---

## 🗓️ Suggested Build Plan (4 weeks)

**Week 1** — Backend core: auth, meeting CRUD, DB models, transcription  
**Week 2** — LLM services: summarization, action item extraction, brief generation  
**Week 3** — Frontend: auth flow, dashboard, meeting detail page, audio upload  
**Week 4** — Follow-up emails, action items tracker, polish + deploy

---

## 🛠️ Tech Stack
- **Backend**: FastAPI, SQLAlchemy, SQLite, Pydantic
- **AI**: Groq Whisper (transcription) + Groq LLaMA3 (LLM)
- **Auth**: JWT (python-jose) + bcrypt
- **Frontend**: React, Vite, TailwindCSS, Zustand, Axios
- **Email**: SMTP (Gmail app password)
