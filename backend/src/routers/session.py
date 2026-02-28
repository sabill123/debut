from fastapi import APIRouter, HTTPException

from src.services.session_store import create_session, get_session

router = APIRouter()


@router.post("/create")
async def create():
    session = create_session()
    return {
        "session_id": session.session_id,
        "created_at": session.created_at.isoformat(),
        "status": session.status,
    }


@router.get("/{session_id}")
async def get(session_id: str):
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    result = {
        "session_id": session.session_id,
        "status": session.status,
        "created_at": session.created_at.isoformat(),
        "blueprint": None,
        "members": [],
        "music_url": session.music_url,
        "teaser_url": session.teaser_url,
        # MV teaser pipeline
        "scenario": session.scenario,
        "teaser_scenes": session.teaser_scenes,
        "bgm_url": session.bgm_url,
        "timeline": session.timeline,
        "teaser_progress": session.teaser_progress,
    }

    if session.blueprint:
        bp = session.blueprint
        members_list = [m.model_dump() for m in bp.members]
        result["blueprint"] = {
            "unit_name": bp.unit_name,
            "concepts": bp.concepts,
            "art_style": bp.art_style,
            "group_type": bp.group_type,
            "members": members_list,
            "group_worldview": bp.group_worldview,
            "debut_concept_description": bp.debut_concept_description,
            "fandom_name": bp.fandom_name,
            "debut_statement": bp.debut_statement,
            "group_image_url": bp.group_image_url,
        }
        result["members"] = members_list

    return result
