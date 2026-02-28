import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from src.services.suno_client import generate_bgm, handle_suno_callback
from src.services.session_store import get_session, update_session

logger = logging.getLogger(__name__)
router = APIRouter()


class MusicGenRequest(BaseModel):
    session_id: str
    unit_name: str
    concepts: list[str] = []
    mood: str = "energetic"
    genre: str = "K-pop"
    lyrics_hint: str = ""
    instrumental_style: str = ""


@router.post("/generate")
async def generate(request: MusicGenRequest):
    session = get_session(request.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        audio_url = await generate_bgm(
            title=f"{request.unit_name} - Debut Teaser",
            genre=request.genre,
            mood_keywords=request.concepts + [request.mood],
            lyrics_hint=request.lyrics_hint,
            instrumental_style=request.instrumental_style,
        )
    except Exception as e:
        logger.exception("Music generation failed")
        raise HTTPException(status_code=500, detail=f"Music generation failed: {e}")

    if audio_url:
        update_session(request.session_id, music_url=audio_url, bgm_url=audio_url)

    return {
        "session_id": request.session_id,
        "audio_url": audio_url,
        "status": "completed" if audio_url else "failed",
    }


@router.post("/callback")
async def suno_callback(request: Request):
    """Callback endpoint for Suno API to POST results when generation completes."""
    body = await request.json()
    logger.info("Suno callback received: %s", body.get("taskId", "unknown"))
    handle_suno_callback(body)
    return {"status": "ok"}
