"""Transcription service — Groq Whisper API."""
import httpx
from app.core.config import settings

async def transcribe_audio(file_path: str) -> str:
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
    async with httpx.AsyncClient(timeout=120) as client:
        with open(file_path, "rb") as f:
            response = await client.post(
                url, headers=headers,
                files={"file": (file_path, f, "audio/mpeg")},
                data={"model": settings.WHISPER_MODEL, "response_format": "text"}
            )
        response.raise_for_status()
        return response.text
