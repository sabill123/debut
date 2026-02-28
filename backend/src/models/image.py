from pydantic import BaseModel


class ImageGenRequest(BaseModel):
    session_id: str
    member_id: str
    visual_description: str
    unit_name: str
    concept: str


class ImageEditRequest(BaseModel):
    session_id: str
    member_id: str
    reference_image_b64: str
    edit_instructions: str


class ImageInpaintRequest(BaseModel):
    session_id: str
    member_id: str
    base_image_b64: str
    mask_image_b64: str
    edit_instructions: str


class GroupImageGenRequest(BaseModel):
    session_id: str


class GroupImageGenResponse(BaseModel):
    session_id: str
    group_image_url: str


class ImageGenResponse(BaseModel):
    session_id: str
    member_id: str
    image_url: str  # data:image/png;base64,... or public URL
