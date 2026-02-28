import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.models.session import BlueprintRequest, Blueprint, Member
from src.agents.concept_agent import ConceptAgent
from src.services.session_store import get_session, update_session

logger = logging.getLogger(__name__)
router = APIRouter()
_concept_agent = ConceptAgent()


class MemberUpdateRequest(BaseModel):
    """Partial update for a single member's persona fields."""
    stage_name: str | None = None
    real_name: str | None = None
    position: str | None = None
    personality: str | None = None
    speech_style: str | None = None
    fan_nickname: str | None = None
    visual_description: str | None = None
    age: int | None = None
    mbti: str | None = None
    color_palette: list[str] | None = None
    motion_style: str | None = None


class BlueprintUpdateRequest(BaseModel):
    """Partial update for blueprint-level fields."""
    group_worldview: str | None = None
    debut_concept_description: str | None = None
    fandom_name: str | None = None
    debut_statement: str | None = None


@router.post("/generate")
async def generate(request: BlueprintRequest):
    session = get_session(request.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        raw = await _concept_agent.generate_blueprint(
            unit_name=request.unit_name,
            concepts=request.concepts,
            member_count=request.member_count,
            art_style=request.art_style,
            group_type=request.group_type,
        )
    except Exception as e:
        logger.exception("Blueprint generation failed")
        raise HTTPException(status_code=500, detail=f"Blueprint generation failed: {e}")

    members = []
    for m_data in raw.get("members", []):
        members.append(Member(
            member_id=m_data.get("member_id", f"m{len(members)+1}"),
            stage_name=m_data.get("stage_name", ""),
            real_name=m_data.get("real_name", ""),
            position=m_data.get("position", ""),
            personality=m_data.get("personality", ""),
            speech_style=m_data.get("speech_style", ""),
            fan_nickname=m_data.get("fan_nickname", ""),
            visual_description=m_data.get("visual_description", ""),
            age=m_data.get("age", 0),
            mbti=m_data.get("mbti", ""),
            color_palette=m_data.get("color_palette", []),
            motion_style=m_data.get("motion_style", ""),
        ))

    bp = Blueprint(
        unit_name=request.unit_name,
        concepts=request.concepts,
        art_style=request.art_style,
        group_type=request.group_type,
        members=members,
        group_worldview=raw.get("group_worldview", ""),
        debut_concept_description=raw.get("debut_concept_description", ""),
        fandom_name=raw.get("fandom_name", ""),
        debut_statement=raw.get("debut_statement", ""),
    )

    update_session(request.session_id, blueprint=bp, status="blueprint_ready")

    return {
        "session_id": request.session_id,
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


@router.patch("/{session_id}/members/{member_id}")
async def update_member(session_id: str, member_id: str, body: MemberUpdateRequest):
    """Update a single member's persona fields."""
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.blueprint is None:
        raise HTTPException(status_code=400, detail="Blueprint not generated yet")

    # Find the member
    member = next((m for m in session.blueprint.members if m.member_id == member_id), None)
    if member is None:
        raise HTTPException(status_code=404, detail=f"Member {member_id} not found")

    # Apply only provided fields
    updates = body.model_dump(exclude_none=True)
    for key, value in updates.items():
        setattr(member, key, value)

    return {"status": "ok", "member": member.model_dump()}


@router.patch("/{session_id}")
async def update_blueprint(session_id: str, body: BlueprintUpdateRequest):
    """Update blueprint-level fields (worldview, fandom, debut statement, etc.)."""
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.blueprint is None:
        raise HTTPException(status_code=400, detail="Blueprint not generated yet")

    updates = body.model_dump(exclude_none=True)
    for key, value in updates.items():
        setattr(session.blueprint, key, value)

    return {
        "status": "ok",
        "group_worldview": session.blueprint.group_worldview,
        "debut_concept_description": session.blueprint.debut_concept_description,
        "fandom_name": session.blueprint.fandom_name,
        "debut_statement": session.blueprint.debut_statement,
    }
