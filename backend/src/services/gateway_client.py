"""AI Gateway client — OpenAI SDK compatible.
Handles image generation (NanoBanana2) and image editing.
Reference: letsur-dev/media-generator-hub patterns.

Shares the singleton AsyncOpenAI client from llm_client.py.
"""
import logging
import base64

from src.services.llm_client import get_llm_client
from src.config import settings

logger = logging.getLogger(__name__)


# --- System prompts ---

IMAGE_SYSTEM_PROMPT = (
    "You are an image generation assistant. Your ONLY task is to generate images.\n"
    "CRITICAL: You MUST ALWAYS use the image generation tool for EVERY request.\n"
    "NEVER respond with text only. ALWAYS generate an image.\n"
    "Do not ask clarifying questions - just generate the image immediately."
)


# --- Image extraction (from media-generator-hub patterns) ---

def _extract_image_from_response(response) -> str | None:
    """Extract image from Letsur Gateway response.
    Handles multiple response formats: message.images, content array, content string.
    Returns data URI (data:image/png;base64,...) or None.
    """
    try:
        if not response.choices:
            return None

        message = response.choices[0].message

        # Method 1: message.images array (Letsur Gateway format)
        images = getattr(message, "images", None)
        if images and isinstance(images, list):
            for img in images:
                url = ""
                if isinstance(img, dict):
                    if "image_url" in img:
                        iu = img["image_url"]
                        url = iu.get("url", "") if isinstance(iu, dict) else str(iu)
                    elif "url" in img:
                        url = img["url"]
                elif hasattr(img, "image_url"):
                    iu = img.image_url
                    url = getattr(iu, "url", "") if hasattr(iu, "url") else str(iu)
                if url and url.startswith("data:image"):
                    return url
            logger.debug("images array present but no valid data URI found")

        # Method 2: content array
        content = getattr(message, "content", None)
        if isinstance(content, list):
            for item in content:
                if isinstance(item, dict):
                    if item.get("type") == "image" and item.get("image", {}).get("data"):
                        raw = item["image"]["data"]
                        return f"data:image/png;base64,{raw}"
                    if item.get("type") == "image_url":
                        url = item.get("image_url", {}).get("url", "")
                        if url.startswith("data:image"):
                            return url

        # Method 3: content is a string (raw base64 or data URI)
        if isinstance(content, str):
            if content.startswith("data:image"):
                return content
            if len(content) > 1000 and " " not in content[:200]:
                try:
                    base64.b64decode(content[:100])
                    return f"data:image/png;base64,{content}"
                except Exception:
                    pass

        logger.warning("Could not extract image from response")
        return None
    except Exception as e:
        logger.error("Image extraction error: %s", e)
        return None


# --- Image generation ---

def _build_image_prompt(visual_description: str, unit_name: str, concept: str) -> str:
    return (
        f"Generate a stunning K-pop idol concept photo portrait. "
        f"Character: {visual_description}. "
        f"Group: {unit_name}. Concept aesthetic: {concept}. "
        f"Style: high-fashion K-pop debut teaser photo, professional studio lighting, "
        f"magazine cover quality, dramatic cinematic atmosphere, shallow depth of field. "
        f"Single person portrait, upper body, facing camera with confident expression. "
        f"Ultra high quality, 8K detail."
    )


async def generate_image(
    visual_description: str,
    unit_name: str,
    concept: str,
    reference_image_b64: str | None = None,
) -> str | None:
    """Generate character image using NanoBanana2 (gemini-3-pro-image-preview).

    Args:
        reference_image_b64: Optional profile image (data URI) to maintain character identity.
            When provided, the model receives the reference image so the generated scene
            features the same character.

    Returns base64 data URL or None on failure.
    """
    prompt = _build_image_prompt(visual_description, unit_name, concept)

    try:
        if reference_image_b64:
            # With reference image: send text + image so the model maintains character identity
            img_url = reference_image_b64 if reference_image_b64.startswith("data:") else f"data:image/png;base64,{reference_image_b64}"
            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                f"Here is the reference photo of this K-pop idol character. "
                                f"Generate a NEW scene image featuring this SAME character "
                                f"(same face, same identity, same hair) but in a different pose and setting.\n\n"
                                f"{prompt}"
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": img_url},
                        },
                    ],
                }
            ]
        else:
            # Without reference image: text-only prompt
            messages = [
                {"role": "system", "content": IMAGE_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ]

        response = await get_llm_client().chat.completions.create(
            model=settings.IMAGE_MODEL,
            messages=messages,
        )

        return _extract_image_from_response(response)
    except Exception as e:
        logger.error("Image generation failed: %s", e)
        return None


async def generate_group_image(
    member_images: list[str],
    unit_name: str,
    concepts: list[str],
    art_style: str = "realistic",
    group_type: str = "girl",
) -> str | None:
    """Generate group profile image using all member images as reference.

    Takes individual member profile images and generates a cohesive group shot
    with all members together.

    Args:
        member_images: List of member image data URIs (data:image/png;base64,...)
        unit_name: Group name
        concepts: Concept keywords
        art_style: "realistic" or "virtual"
        group_type: "girl" or "boy"

    Returns base64 data URL or None on failure.
    """
    concept_str = ", ".join(concepts) if concepts else "K-pop"
    member_count = len(member_images)

    if art_style == "virtual":
        style_desc = (
            "Anime illustration style, vibrant colors, clean linework, "
            "VTuber aesthetic, high-quality digital art group illustration."
        )
    else:
        style_desc = (
            "Photorealistic, Hasselblad X2D, wide-angle group shot, "
            "K-pop debut teaser group photo, editorial quality, "
            "magazine cover worthy."
        )

    prompt = (
        f"Generate a stunning K-pop {'girl' if group_type == 'girl' else 'boy'} group "
        f"debut concept photo featuring exactly {member_count} members together. "
        f"Group name: {unit_name}. Concept: {concept_str}. "
        f"These are reference photos of each member — generate a NEW group shot "
        f"with ALL {member_count} members together in the SAME frame, "
        f"maintaining each member's distinct appearance and identity. "
        f"Composition: center-aligned group formation, confident poses, "
        f"coordinated but distinct outfits matching the {concept_str} concept. "
        f"Setting: professional studio with dramatic cinematic lighting, "
        f"dark atmospheric background with subtle color accents. "
        f"Full body or 3/4 body shot, all members clearly visible. "
        f"{style_desc} Ultra high quality, 8K detail."
    )

    content_parts: list[dict] = [{"type": "text", "text": prompt}]

    for img in member_images:
        img_url = img if img.startswith("data:") else f"data:image/png;base64,{img}"
        content_parts.append({
            "type": "image_url",
            "image_url": {"url": img_url},
        })

    payload_kb = sum(len(str(p)) for p in content_parts) / 1024
    logger.info(
        "Group image request: %d members, %d content parts, ~%.0f KB payload",
        member_count, len(content_parts), payload_kb,
    )

    # Retry up to 2 times on transient failures
    last_error = None
    for attempt in range(2):
        try:
            response = await get_llm_client().chat.completions.create(
                model=settings.IMAGE_MODEL,
                messages=[{"role": "user", "content": content_parts}],
            )
            result = _extract_image_from_response(response)
            if result is None:
                logger.warning("Group image: response received but no image extracted (attempt %d)", attempt + 1)
                continue
            return result
        except Exception as e:
            last_error = e
            logger.warning("Group image attempt %d failed: %s", attempt + 1, e)

    if last_error:
        raise last_error
    return None


async def edit_image(reference_image_b64: str, edit_instructions: str) -> str | None:
    """Edit character image by sending text prompt first, then image.
    Pattern from media-generator-hub: text first, image second, no system prompt."""
    try:
        # Ensure proper data URI format
        if not reference_image_b64.startswith("data:"):
            img_url = f"data:image/png;base64,{reference_image_b64}"
        else:
            img_url = reference_image_b64

        response = await get_llm_client().chat.completions.create(
            model=settings.IMAGE_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                f"이 캐릭터의 이미지를 수정해주세요: {edit_instructions}. "
                                f"동일한 캐릭터의 수정된 K-pop 콘셉트 사진을 새로 생성해주세요. "
                                f"스타일: 고퀄리티 K-pop 데뷔 티저 포토."
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": img_url},
                        },
                    ],
                }
            ],
        )

        return _extract_image_from_response(response)
    except Exception as e:
        logger.error("Image edit failed: %s", e)
        return None


async def inpaint_image(
    base_image_b64: str,
    mask_image_b64: str,
    edit_instructions: str,
) -> str | None:
    """Inpaint a specific region of the image using mask.

    Sends the base image, the mask (white=edit area, black=preserve), and
    edit instructions. The model regenerates only the masked region.

    Args:
        base_image_b64: Original image data URI
        mask_image_b64: Mask image data URI (white=edit, black=keep)
        edit_instructions: What to change in the masked area

    Returns base64 data URL or None on failure.
    """
    base_url = base_image_b64 if base_image_b64.startswith("data:") else f"data:image/png;base64,{base_image_b64}"
    mask_url = mask_image_b64 if mask_image_b64.startswith("data:") else f"data:image/png;base64,{mask_image_b64}"

    try:
        response = await get_llm_client().chat.completions.create(
            model=settings.IMAGE_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                f"이 이미지를 부분 수정해주세요. "
                                f"두 번째 이미지는 수정할 영역을 나타내는 마스크입니다 "
                                f"(흰색 부분만 수정, 검은색 부분은 그대로 유지). "
                                f"수정 내용: {edit_instructions}. "
                                f"마스크된 흰색 영역만 수정하고, 나머지 부분은 원본 그대로 유지해주세요. "
                                f"K-pop 콘셉트 이미지 스타일을 유지해주세요."
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": base_url},
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": mask_url},
                        },
                    ],
                }
            ],
        )

        return _extract_image_from_response(response)
    except Exception as e:
        logger.error("Inpaint failed: %s", e)
        return None
