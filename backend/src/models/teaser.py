from pydantic import BaseModel


class TeaserGenRequest(BaseModel):
    session_id: str
    prompt: str = ""
    member_image_url: str | None = None
    duration_seconds: int = 5
    aspect_ratio: str = "16:9"


class TeaserGenResponse(BaseModel):
    session_id: str
    operation_id: str
    status: str = "processing"


class TeaserStatusResponse(BaseModel):
    operation_id: str
    status: str  # processing | completed | error
    video_url: str | None = None
    error: str | None = None
