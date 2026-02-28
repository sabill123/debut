"""Suno API client via sunoapi.org — generates BGM for MV teasers.

API docs: https://docs.sunoapi.org/suno-api/generate-music

Key design: Suno generates 2-3 min songs but we only use 0:00-0:32.
Prompts are crafted so the first 32 seconds contain a complete musical arc:
  0-8s  : Powerful intro hook (attention grabber)
  8-16s : Build / tension rise
  16-24s: Climax / drop
  24-32s: Resolution / outro tag

API response structure:
  POST /api/v1/generate → {"code": 200, "data": {"taskId": "..."}}
  Callback POST → {"code": 200, "data": {"callbackType": "complete", "task_id": "...", "data": [{"audio_url": "...", ...}]}}
  GET /api/v1/generate/record-info?taskId=... → {"code": 200, "data": {"status": "SUCCESS", "response": {"data": [...]}}}

Callback stages: text → first → complete (only "complete" has final audio URLs)
"""

import asyncio
import logging
import os

import httpx

from src.config import settings

logger = logging.getLogger(__name__)

SUNO_BASE = settings.SUNO_API_BASE

# Shared httpx client for Suno API calls (connection pooling)
_suno_client: httpx.AsyncClient | None = None

# Pending callback results: task_id → {"event": asyncio.Event, "audio_url": str | None}
_pending_callbacks: dict[str, dict] = {}


def _get_client() -> httpx.AsyncClient:
    global _suno_client
    if _suno_client is None or _suno_client.is_closed:
        _suno_client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=15.0, read=30.0, write=30.0, pool=10.0),
        )
    return _suno_client


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.SUNO_API_KEY}",
        "Content-Type": "application/json",
    }


def _get_callback_url() -> str:
    """Build the callback URL for Suno to POST results back to us."""
    if settings.SUNO_CALLBACK_URL:
        return settings.SUNO_CALLBACK_URL
    host = os.getenv("PUBLIC_HOST", "http://localhost:8000")
    return f"{host}/api/music/callback"


def _extract_audio_url(songs: list[dict]) -> str | None:
    """Extract best audio URL from Suno song results.
    Tries audio_url first, then stream_audio_url as fallback.
    """
    for song in songs:
        url = (
            song.get("audio_url")
            or song.get("audioUrl")
            or song.get("stream_audio_url")
            or song.get("streamAudioUrl")
        )
        if url:
            return url
    return None


def handle_suno_callback(body: dict) -> None:
    """Called by the music router when Suno POSTs a callback.

    Callback structure (from docs):
    {
      "code": 200,
      "msg": "success",
      "data": {
        "callbackType": "complete",  // "text" | "first" | "complete" | "error"
        "task_id": "...",
        "data": [{"audio_url": "...", ...}, ...]
      }
    }
    """
    # Navigate into the wrapper: body may be the full response or just the data portion
    outer_data = body.get("data", body)

    callback_type = outer_data.get("callbackType", "")
    task_id = outer_data.get("task_id") or outer_data.get("taskId") or body.get("taskId") or ""

    logger.info("Suno callback: type=%s, task_id=%s", callback_type, task_id)

    # Only resolve on "complete" (or "first" as early fallback)
    if callback_type not in ("complete", "first"):
        logger.debug("Suno callback stage '%s' — waiting for complete", callback_type)
        return

    # Extract audio URL from nested data array
    songs = outer_data.get("data", [])
    audio_url = None
    if isinstance(songs, list) and songs:
        audio_url = _extract_audio_url(songs)

    pending = _pending_callbacks.get(task_id)
    if pending:
        # Only update if we got a URL, or if this is "complete" (final stage)
        if audio_url or callback_type == "complete":
            pending["audio_url"] = audio_url
            pending["event"].set()
            logger.info("Suno callback resolved for task %s: %s", task_id, audio_url)
    else:
        logger.warning("Suno callback for unknown/expired task: %s (url=%s)", task_id, audio_url)


def _build_teaser_prompt(
    genre: str,
    mood_keywords: list[str],
    lyrics_hint: str,
    instrumental_style: str,
) -> str:
    """Build a Suno prompt optimized for 32-second teaser usage.

    Since Suno generates full-length songs (2-3 min) and we only use 0:00-0:32,
    the prompt instructs Suno to front-load the musical arc.
    """
    mood_str = ", ".join(mood_keywords)

    if lyrics_hint:
        return (
            f"[Intro - 0:00]\n"
            f"(Powerful instrumental hook, immediate impact, {instrumental_style})\n\n"
            f"[Verse 1 - 0:08]\n"
            f"{lyrics_hint}\n\n"
            f"[Pre-Chorus - 0:16]\n"
            f"(Building tension, rising energy)\n\n"
            f"[Chorus Drop - 0:20]\n"
            f"(Full climax, maximum energy, memorable melody)\n\n"
            f"IMPORTANT: Start with immediate impact. "
            f"No slow fade-in. Hook from the first beat. "
            f"This is a K-pop debut teaser — the first 30 seconds must be explosive."
        )
    else:
        return (
            f"[Intro Hook - 0:00]\n"
            f"(Immediate powerful opening, {instrumental_style}, attention-grabbing)\n\n"
            f"[Build - 0:08]\n"
            f"(Rising tension, layering instruments, {mood_str})\n\n"
            f"[Climax Drop - 0:16]\n"
            f"(Full energy release, cinematic impact, dramatic)\n\n"
            f"[Resolution - 0:24]\n"
            f"(Sustain energy, memorable outro hook)\n\n"
            f"Instrumental {genre} track for K-pop debut MV teaser. "
            f"CRITICAL: No slow intro. Start with immediate impact from beat one. "
            f"Front-load the best musical moments in the first 30 seconds."
        )


async def generate_bgm(
    title: str,
    genre: str,
    mood_keywords: list[str],
    lyrics_hint: str = "",
    instrumental_style: str = "",
) -> str | None:
    """Generate BGM using Suno API.
    Returns audio URL or None on failure.

    Flow: POST /api/v1/generate → get taskId → wait for callback → fallback to polling.
    """
    mood_str = ", ".join(mood_keywords)
    style_desc = f"{genre}, {instrumental_style}, {mood_str}".strip(", ")

    prompt = _build_teaser_prompt(genre, mood_keywords, lyrics_hint, instrumental_style)
    callback_url = _get_callback_url()

    payload = {
        "prompt": prompt,
        "style": style_desc,
        "title": title,
        "customMode": True,
        "instrumental": not bool(lyrics_hint),
        "model": settings.SUNO_MODEL,
        "callBackUrl": callback_url,
    }

    client = _get_client()

    try:
        logger.info("Submitting to Suno API: %s (callback=%s)", title, callback_url)
        resp = await client.post(
            f"{SUNO_BASE}/api/v1/generate",
            json=payload,
            headers=_headers(),
        )
        resp.raise_for_status()
        result = resp.json()

        # API response: {"code": 200, "msg": "success", "data": {"taskId": "..."}}
        code = result.get("code", 0)
        if code != 200:
            logger.error("Suno API error: code=%s, msg=%s", code, result.get("msg"))
            return None

        data = result.get("data", {})
        task_id = data.get("taskId") if isinstance(data, dict) else None

        if not task_id:
            logger.warning("No taskId in Suno response: %s", result)
            return None

        logger.info("Suno task submitted: %s", task_id)

        # Register pending callback and wait
        event = asyncio.Event()
        _pending_callbacks[task_id] = {"event": event, "audio_url": None}

        try:
            # Wait up to 180s for callback (Suno can take 30-120s)
            await asyncio.wait_for(event.wait(), timeout=180)
            pending = _pending_callbacks.get(task_id, {})
            audio_url = pending.get("audio_url")
            if audio_url:
                logger.info("Suno BGM ready (callback): %s", audio_url)
                return audio_url
            logger.warning("Suno callback resolved but no audio_url, falling back to poll")
        except asyncio.TimeoutError:
            logger.warning("Suno callback timeout (180s), falling back to poll")
        finally:
            _pending_callbacks.pop(task_id, None)

        return await _poll_suno_task(task_id)

    except Exception as e:
        logger.error("Suno BGM generation failed: %s", e)
        return None


async def _poll_suno_task(task_id: str, max_attempts: int = 60) -> str | None:
    """Poll Suno API for task completion.

    Endpoint: GET /api/v1/generate/record-info?taskId=...
    Response: {"code": 200, "data": {"status": "SUCCESS", "response": {"data": [...]}}}
    Status values: PENDING, TEXT_SUCCESS, FIRST_SUCCESS, SUCCESS,
                   CREATE_TASK_FAILED, GENERATE_AUDIO_FAILED, SENSITIVE_WORD_ERROR
    """
    client = _get_client()
    for i in range(max_attempts):
        await asyncio.sleep(5)
        try:
            resp = await client.get(
                f"{SUNO_BASE}/api/v1/generate/record-info",
                params={"taskId": task_id},
                headers=_headers(),
            )
            resp.raise_for_status()
            result = resp.json()

            data = result.get("data", {})
            if not isinstance(data, dict):
                continue

            status = data.get("status", "")

            if status == "SUCCESS":
                # Audio data is in response.sunoData or response.data array
                response_obj = data.get("response", {})
                if isinstance(response_obj, dict):
                    songs = (
                        response_obj.get("sunoData")
                        or response_obj.get("data")
                        or []
                    )
                else:
                    songs = []
                if isinstance(songs, list) and songs:
                    audio_url = _extract_audio_url(songs)
                    if audio_url:
                        logger.info("Suno BGM ready (polled): %s", audio_url)
                        return audio_url
                logger.warning("Suno SUCCESS but no audio URL in response: %s", data)
                return None

            elif status == "FIRST_SUCCESS":
                # First track ready — try to get early URL
                response_obj = data.get("response", {})
                if isinstance(response_obj, dict):
                    songs = (
                        response_obj.get("sunoData")
                        or response_obj.get("data")
                        or []
                    )
                else:
                    songs = []
                if isinstance(songs, list) and songs:
                    audio_url = _extract_audio_url(songs)
                    if audio_url:
                        logger.info("Suno BGM ready (first_success): %s", audio_url)
                        return audio_url

            elif status in ("CREATE_TASK_FAILED", "GENERATE_AUDIO_FAILED", "SENSITIVE_WORD_ERROR", "CALLBACK_EXCEPTION"):
                error_msg = data.get("errorMessage", status)
                logger.error("Suno task failed: %s — %s", status, error_msg)
                return None

            logger.debug("Suno poll [%d/%d]: %s", i + 1, max_attempts, status)

        except Exception as e:
            logger.warning("Suno poll error (attempt %d): %s", i + 1, e)
            continue

    logger.error("Suno task timed out: %s", task_id)
    return None
