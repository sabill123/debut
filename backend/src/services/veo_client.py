"""Veo 3.1 video generation via fal.ai.
Uses first-last-frame-to-video endpoint for image-to-video teaser generation.

Uses the official fal_client library for correct queue handling
(submit → poll → result) instead of raw httpx calls.
"""
import logging
import os
import time

import fal_client

from src.config import settings

logger = logging.getLogger(__name__)

FAL_MODEL = "fal-ai/veo3.1/fast/first-last-frame-to-video"

# Set FAL_KEY env var for fal_client authentication
os.environ.setdefault("FAL_KEY", settings.FAL_API_KEY)


async def generate_single_clip(
    prompt: str,
    session_id: str,
    scene_number: int,
    first_frame_url: str | None = None,
    last_frame_url: str | None = None,
) -> str | None:
    """Generate a single 8-second video clip using fal_client.subscribe_async().

    For seamless scene chaining, provide both first_frame_url and last_frame_url.
    Scene N's last_frame should be Scene N+1's first_frame.

    Returns video URL or None on failure.
    """
    payload: dict = {
        "prompt": prompt,
        "duration": "8s",
        "aspect_ratio": "16:9",
        "generate_audio": False,
        "resolution": "720p",
    }

    # first-last-frame-to-video requires both frame URLs
    if first_frame_url:
        payload["first_frame_url"] = first_frame_url
    if last_frame_url:
        payload["last_frame_url"] = last_frame_url
    elif first_frame_url:
        # If only first_frame provided, use same image for last_frame
        payload["last_frame_url"] = first_frame_url

    try:
        has_first = bool(payload.get("first_frame_url"))
        has_last = bool(payload.get("last_frame_url"))
        logger.info(
            "[veo] clip %d: submitting (first_frame=%s, last_frame=%s, prompt=%s...)",
            scene_number, has_first, has_last, prompt[:80],
        )
        t0 = time.time()

        def on_queue_update(update):
            status = getattr(update, "status", str(update))
            elapsed = time.time() - t0
            logger.info("[veo] clip %d: [%.0fs] queue=%s", scene_number, elapsed, status)

        result = await fal_client.subscribe_async(
            FAL_MODEL,
            arguments=payload,
            with_logs=True,
            on_queue_update=on_queue_update,
        )

        elapsed = time.time() - t0
        video = result.get("video", {})
        video_url = video.get("url") if isinstance(video, dict) else None

        if video_url:
            logger.info("[veo] clip %d DONE (%.1fs): %s", scene_number, elapsed, video_url)
            return video_url
        else:
            logger.error("[veo] clip %d FAIL (%.1fs): no video in result: %s", scene_number, elapsed, result)
            return None

    except Exception as e:
        elapsed = time.time() - t0
        logger.error("[veo] clip %d ERROR (%.1fs): %s", scene_number, elapsed, e)
        return None
