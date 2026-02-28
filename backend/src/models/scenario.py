"""Pydantic models for scenario, scenes, and timeline."""

from pydantic import BaseModel


class Scene(BaseModel):
    scene_number: int
    duration: int = 8
    description: str = ""
    visual_concept: str = ""
    camera_movement: str = ""
    lighting: str = ""
    member_focus: str = ""
    emotion: str = ""
    transition_to_next: str = "fade"
    # Filled after asset generation
    image_url: str | None = None       # first frame (keyframe N)
    last_frame_url: str | None = None  # last frame (keyframe N+1)
    video_url: str | None = None


class MusicDirection(BaseModel):
    genre: str = "K-pop"
    tempo: str = "medium"
    mood_keywords: list[str] = []
    lyrics_hint: str = ""
    instrumental_style: str = ""


class Scenario(BaseModel):
    title: str = ""
    mood: str = ""
    color_grading: str = ""
    scenes: list[Scene] = []
    music_direction: MusicDirection = MusicDirection()


class TimelineClip(BaseModel):
    id: str
    trackId: str
    type: str  # "video" | "audio" | "image" | "subtitle"
    startTime: float
    duration: float
    data: dict = {}
    effects: dict = {}


class TimelineProject(BaseModel):
    id: str
    name: str
    duration: float = 32
    aspectRatio: str = "16:9"
    fps: int = 30


class OpeningClosing(BaseModel):
    enabled: bool = True
    duration: float = 2
    title: str = ""


class Timeline(BaseModel):
    project: TimelineProject
    clips: list[TimelineClip] = []
    opening: OpeningClosing | None = None
    closing: OpeningClosing | None = None


class TeaserResult(BaseModel):
    """Full result from Director Agent."""
    scenario: dict = {}
    scenes: list[dict] = []
    bgm_url: str | None = None
    timeline: dict = {}
