import asyncio
import logging
import time

from fastapi import APIRouter, HTTPException

from src.models.teaser import TeaserGenRequest, TeaserGenResponse, TeaserStatusResponse
from src.agents.director_agent import DirectorAgent
from src.services.session_store import get_session, update_session

logger = logging.getLogger(__name__)
router = APIRouter()

_director = DirectorAgent()

# Track MV teaser production operations (lightweight: no result payload stored)
_mv_operations: dict[str, dict] = {}

# Keep references to background tasks so they aren't GC'd
_background_tasks: set[asyncio.Task] = set()


@router.post("/generate", response_model=TeaserGenResponse)
async def generate(request: TeaserGenRequest):
    session = get_session(request.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session.blueprint:
        raise HTTPException(status_code=400, detail="Blueprint not generated yet")

    operation_id = f"mv-{request.session_id}"

    _mv_operations[operation_id] = {
        "status": "processing",
        "progress": "시작 중...",
        "session_id": request.session_id,
    }

    # Build blueprint dict for director agent
    bp = session.blueprint
    blueprint_dict = {
        "unit_name": bp.unit_name,
        "concepts": bp.concepts,
        "art_style": bp.art_style,
        "group_type": bp.group_type,
        "members": [m.model_dump() for m in bp.members],
        "group_worldview": bp.group_worldview,
        "debut_concept_description": bp.debut_concept_description,
        "fandom_name": bp.fandom_name,
        "debut_statement": bp.debut_statement,
        "group_image_url": bp.group_image_url,
    }

    async def progress_callback(step: str, detail: str):
        if operation_id in _mv_operations:
            _mv_operations[operation_id]["progress"] = f"{step}: {detail}"
        update_session(request.session_id, teaser_progress=f"{step}: {detail}")

    # Run director pipeline in background (with GC-safe reference)
    task = asyncio.create_task(
        _run_director(operation_id, blueprint_dict, request.session_id, progress_callback)
    )
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)

    update_session(
        request.session_id,
        teaser_operation_id=operation_id,
        status="teaser_generating",
    )

    return TeaserGenResponse(
        session_id=request.session_id,
        operation_id=operation_id,
        status="processing",
    )


async def _run_director(
    operation_id: str,
    blueprint_dict: dict,
    session_id: str,
    progress_callback,
):
    """Background task: run full Director Agent pipeline."""
    t0 = time.time()
    logger.info("[teaser] === PIPELINE START === op=%s session=%s", operation_id, session_id)
    try:
        result = await _director.produce_teaser(
            blueprint=blueprint_dict,
            session_id=session_id,
            progress_callback=progress_callback,
        )

        # Use Remotion-rendered teaser_url if available, otherwise fallback to first clip
        teaser_url = result.get("teaser_url")
        if not teaser_url:
            video_urls = [s.get("video_url") for s in result.get("scenes", []) if s.get("video_url")]
            teaser_url = video_urls[0] if video_urls else None

        elapsed = time.time() - t0
        logger.info(
            "[teaser] === PIPELINE COMPLETE === (%.1fs) teaser_url=%s scenes=%d bgm=%s",
            elapsed, teaser_url, len(result.get("scenes", [])), bool(result.get("bgm_url")),
        )

        # Update session with all results (session is the source of truth)
        update_session(
            session_id,
            scenario=result.get("scenario"),
            teaser_scenes=result.get("scenes", []),
            bgm_url=result.get("bgm_url"),
            timeline=result.get("timeline"),
            teaser_url=teaser_url,
            status="completed",
        )

        _mv_operations[operation_id]["status"] = "completed"

    except Exception as e:
        elapsed = time.time() - t0
        logger.exception("[teaser] === PIPELINE FAILED === (%.1fs) %s", elapsed, e)
        _mv_operations[operation_id]["status"] = "error"
        _mv_operations[operation_id]["error"] = str(e)
        update_session(session_id, teaser_progress=f"error: {e}")


@router.get("/status/{operation_id}", response_model=TeaserStatusResponse)
async def status(operation_id: str):
    mv_op = _mv_operations.get(operation_id)
    if not mv_op:
        raise HTTPException(status_code=404, detail="Operation not found")

    video_url = None
    if mv_op["status"] == "completed":
        # Fetch from session (source of truth) rather than _mv_operations
        session = get_session(mv_op.get("session_id", ""))
        if session and session.teaser_url:
            video_url = session.teaser_url

    return TeaserStatusResponse(
        operation_id=operation_id,
        status=mv_op["status"],
        video_url=video_url,
        error=mv_op.get("error"),
    )


@router.get("/progress/{session_id}")
async def get_progress(session_id: str):
    """Get detailed progress of MV teaser generation."""
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    operation_id = f"mv-{session_id}"
    mv_op = _mv_operations.get(operation_id, {})

    # Read completed results from session (source of truth)
    scenes = session.teaser_scenes or []

    return {
        "session_id": session_id,
        "status": mv_op.get("status", session.status),
        "progress": mv_op.get("progress", session.teaser_progress),
        "scenario": session.scenario,
        "scenes": scenes,
        "bgm_url": session.bgm_url,
        "timeline": session.timeline,
        "teaser_url": session.teaser_url,
    }
