import logging

from fastapi import APIRouter, HTTPException

from src.models.image import (
    ImageGenRequest, ImageEditRequest, ImageInpaintRequest, ImageGenResponse,
    GroupImageGenRequest, GroupImageGenResponse,
)
from src.services.gateway_client import generate_image, edit_image, inpaint_image, generate_group_image
from src.services.session_store import get_session, update_session

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate", response_model=ImageGenResponse)
async def generate(request: ImageGenRequest):
    session = get_session(request.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    image_url = await generate_image(
        visual_description=request.visual_description,
        unit_name=request.unit_name,
        concept=request.concept,
    )

    if image_url is None:
        raise HTTPException(status_code=500, detail="Image generation failed")

    # Update member image in session and persist
    if session.blueprint:
        for member in session.blueprint.members:
            if member.member_id == request.member_id:
                member.image_url = image_url
                break
        update_session(request.session_id, blueprint=session.blueprint)

    return ImageGenResponse(
        session_id=request.session_id,
        member_id=request.member_id,
        image_url=image_url,
    )


@router.post("/group-generate", response_model=GroupImageGenResponse)
async def group_generate(request: GroupImageGenRequest):
    """Generate group profile image from all member images."""
    session = get_session(request.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session.blueprint:
        raise HTTPException(status_code=400, detail="Blueprint not found")

    bp = session.blueprint
    member_images = [m.image_url for m in bp.members if m.image_url]
    if not member_images:
        raise HTTPException(status_code=400, detail="No member images available")

    logger.info(
        "Group generate: session=%s, members=%d, images=%d",
        request.session_id, len(bp.members), len(member_images),
    )

    try:
        group_image_url = await generate_group_image(
            member_images=member_images,
            unit_name=bp.unit_name,
            concepts=bp.concepts,
            art_style=bp.art_style,
            group_type=bp.group_type,
        )
    except Exception as e:
        logger.exception("Group image generation failed")
        raise HTTPException(status_code=500, detail=f"Group image generation failed: {type(e).__name__}: {e}")

    if group_image_url is None:
        raise HTTPException(status_code=500, detail="Group image generation returned no image")

    bp.group_image_url = group_image_url
    update_session(request.session_id, blueprint=session.blueprint)

    return GroupImageGenResponse(
        session_id=request.session_id,
        group_image_url=group_image_url,
    )


@router.post("/inpaint", response_model=ImageGenResponse)
async def inpaint(request: ImageInpaintRequest):
    """Inpaint a specific region of a member image using brush mask."""
    session = get_session(request.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    image_url = await inpaint_image(
        base_image_b64=request.base_image_b64,
        mask_image_b64=request.mask_image_b64,
        edit_instructions=request.edit_instructions,
    )

    if image_url is None:
        raise HTTPException(status_code=500, detail="Inpaint failed")

    if session.blueprint:
        for member in session.blueprint.members:
            if member.member_id == request.member_id:
                member.image_url = image_url
                break
        update_session(request.session_id, blueprint=session.blueprint)

    return ImageGenResponse(
        session_id=request.session_id,
        member_id=request.member_id,
        image_url=image_url,
    )


@router.post("/edit", response_model=ImageGenResponse)
async def edit(request: ImageEditRequest):
    session = get_session(request.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    image_url = await edit_image(
        reference_image_b64=request.reference_image_b64,
        edit_instructions=request.edit_instructions,
    )

    if image_url is None:
        raise HTTPException(status_code=500, detail="Image edit failed")

    # Update member image in session and persist
    if session.blueprint:
        for member in session.blueprint.members:
            if member.member_id == request.member_id:
                member.image_url = image_url
                break
        update_session(request.session_id, blueprint=session.blueprint)

    return ImageGenResponse(
        session_id=request.session_id,
        member_id=request.member_id,
        image_url=image_url,
    )
