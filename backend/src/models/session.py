from datetime import datetime
from pydantic import BaseModel, Field


class Member(BaseModel):
    member_id: str
    stage_name: str
    real_name: str = ""
    position: str = ""
    personality: str = ""
    speech_style: str = ""
    fan_nickname: str = ""
    visual_description: str = ""
    age: int = 0
    mbti: str = ""
    image_url: str | None = None
    color_palette: list[str] = []
    motion_style: str = ""


class Blueprint(BaseModel):
    unit_name: str
    concepts: list[str] = []
    art_style: str = "realistic"  # "realistic" | "virtual"
    group_type: str = "girl"  # "girl" | "boy"
    members: list[Member] = []
    group_worldview: str = ""
    debut_concept_description: str = ""
    fandom_name: str = ""
    debut_statement: str = ""
    group_image_url: str | None = None


class BlueprintRequest(BaseModel):
    session_id: str
    unit_name: str
    concepts: list[str] = Field(..., min_length=1, max_length=4)
    member_count: int = Field(2, ge=1, le=3)
    art_style: str = "realistic"  # "realistic" | "virtual"
    group_type: str = "girl"  # "girl" | "boy"
    language: str = "ko"


class Session(BaseModel):
    session_id: str
    status: str = "created"
    blueprint: Blueprint | None = None
    music_url: str | None = None
    teaser_url: str | None = None
    teaser_operation_id: str | None = None
    # MV teaser pipeline results
    scenario: dict | None = None
    teaser_scenes: list[dict] = []
    bgm_url: str | None = None
    timeline: dict | None = None
    teaser_progress: str = ""
    created_at: datetime = Field(default_factory=datetime.now)
