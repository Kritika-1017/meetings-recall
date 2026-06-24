"""LLM service — Groq Chat API."""
import json, httpx
from app.core.config import settings

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

async def _call(system: str, user: str) -> str:
    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json"}
    payload = {"model": settings.GROQ_MODEL, "messages": [
        {"role": "system", "content": system},
        {"role": "user", "content": user}
    ], "temperature": 0.3}
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(GROQ_URL, headers=headers, json=payload)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]

async def summarize_meeting(transcript: str) -> str:
    return await _call(
        "You are an expert meeting analyst. Be concise.",
        f"Summarize this meeting in 3-5 bullet points:\n\n{transcript}"
    )

async def extract_action_items(transcript: str) -> list:
    raw = await _call(
        "Extract action items. Return ONLY a JSON array. Each item: {description, owner_name, due_date}. "
        "owner_name and due_date can be null. due_date as ISO string if present.",
        f"Extract action items:\n\n{transcript}"
    )
    clean = raw.strip().strip("```json").strip("```").strip()
    return json.loads(clean)

async def generate_pre_meeting_brief(summary: str, action_items: list) -> str:
    pending = [a for a in action_items if not a.get("is_done")]
    pending_text = "\n".join(
        f"- {a['description']} (owner: {a.get('owner_name','unknown')})" for a in pending
    ) or "All action items completed."
    return await _call(
        "You are a meeting assistant. Write concise pre-meeting briefs.",
        f"Last meeting summary:\n{summary}\n\nPending tasks:\n{pending_text}\n\n"
        "Write a 3-5 sentence pre-meeting brief calling out decisions and who owes what."
    )

async def draft_followup_email(summary: str, action_items: list, recipient: str) -> dict:
    items_text = "\n".join(
        f"- {a['description']} → {a.get('owner_name','TBD')} (due: {a.get('due_date','TBD')})"
        for a in action_items
    )
    raw = await _call(
        "Write professional follow-up emails. Return ONLY JSON with keys: subject, body.",
        f"Write follow-up email to {recipient}.\nSummary:\n{summary}\nAction items:\n{items_text}"
    )
    clean = raw.strip().strip("```json").strip("```").strip()
    return json.loads(clean)
