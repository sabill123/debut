"""Local folder-based asset storage.

Structure:
  assets/
    {group_name}/
      group_info.json          # 그룹 블루프린트
      scenario.json            # 시나리오 전체
      timeline.json            # Remotion 타임라인
      members/
        {member_id}_{stage_name}/
          profile.json         # 멤버 프로필
          concept.png          # 콘셉트 이미지
      scenes/
        scene_1/
          first_frame.png      # Veo 입력 이미지
          clip.mp4             # 생성된 영상 클립
          scene_info.json      # 씬 메타데이터
        scene_2/
        ...
      bgm/
        bgm.mp3               # Suno BGM
      final/
        teaser.mp4             # 최종 합성 영상
"""

import json
import base64
import logging
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

ASSETS_ROOT = Path(__file__).parent.parent.parent / "assets"

# Shared httpx client for file downloads
_dl_client: httpx.AsyncClient | None = None


def _get_dl_client() -> httpx.AsyncClient:
    global _dl_client
    if _dl_client is None or _dl_client.is_closed:
        _dl_client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=15.0, read=120.0, write=30.0, pool=10.0),
        )
    return _dl_client


def _sanitize(name: str) -> str:
    """Sanitize folder name."""
    return "".join(c if c.isalnum() or c in "-_ " else "" for c in name).strip().replace(" ", "_")


def get_group_dir(group_name: str) -> Path:
    """Get or create group directory."""
    safe_name = _sanitize(group_name)
    group_dir = ASSETS_ROOT / safe_name
    group_dir.mkdir(parents=True, exist_ok=True)
    return group_dir


def get_member_dir(group_name: str, member_id: str, stage_name: str) -> Path:
    """Get or create member directory."""
    group_dir = get_group_dir(group_name)
    member_dir = group_dir / "members" / f"{member_id}_{_sanitize(stage_name)}"
    member_dir.mkdir(parents=True, exist_ok=True)
    return member_dir


def get_scene_dir(group_name: str, scene_number: int) -> Path:
    """Get or create scene directory."""
    group_dir = get_group_dir(group_name)
    scene_dir = group_dir / "scenes" / f"scene_{scene_number}"
    scene_dir.mkdir(parents=True, exist_ok=True)
    return scene_dir


def save_json(path: Path, data: dict) -> Path:
    """Save JSON data to file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.debug("Saved JSON: %s", path)
    return path


def save_blueprint(group_name: str, blueprint: dict) -> Path:
    """Save group blueprint."""
    group_dir = get_group_dir(group_name)
    return save_json(group_dir / "group_info.json", blueprint)


def save_member_profile(group_name: str, member: dict) -> Path:
    """Save individual member profile."""
    member_dir = get_member_dir(
        group_name, member.get("member_id", "m0"), member.get("stage_name", "unknown")
    )
    return save_json(member_dir / "profile.json", member)


def save_scenario(group_name: str, scenario: dict) -> Path:
    """Save scenario data."""
    group_dir = get_group_dir(group_name)
    return save_json(group_dir / "scenario.json", scenario)


def save_timeline(group_name: str, timeline: dict) -> Path:
    """Save Remotion timeline."""
    group_dir = get_group_dir(group_name)
    return save_json(group_dir / "timeline.json", timeline)


def save_scene_info(group_name: str, scene_number: int, scene_data: dict) -> Path:
    """Save scene metadata."""
    scene_dir = get_scene_dir(group_name, scene_number)
    return save_json(scene_dir / "scene_info.json", scene_data)


def save_base64_image(path: Path, data_uri: str) -> Path:
    """Save base64 data URI as image file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    # Strip data URI prefix
    if "," in data_uri:
        b64_data = data_uri.split(",", 1)[1]
    else:
        b64_data = data_uri
    path.write_bytes(base64.b64decode(b64_data))
    logger.debug("Saved image: %s", path)
    return path


def save_member_concept_image(group_name: str, member: dict, data_uri: str) -> Path:
    """Save member concept image."""
    member_dir = get_member_dir(
        group_name, member.get("member_id", "m0"), member.get("stage_name", "unknown")
    )
    return save_base64_image(member_dir / "concept.png", data_uri)


def save_scene_first_frame(group_name: str, scene_number: int, data_uri: str) -> Path:
    """Save scene first frame image."""
    scene_dir = get_scene_dir(group_name, scene_number)
    return save_base64_image(scene_dir / "first_frame.png", data_uri)


def save_scene_last_frame(group_name: str, scene_number: int, data_uri: str) -> Path:
    """Save scene last frame image."""
    scene_dir = get_scene_dir(group_name, scene_number)
    return save_base64_image(scene_dir / "last_frame.png", data_uri)


async def download_and_save(url: str, path: Path) -> Path | None:
    """Download a file from URL and save locally."""
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        client = _get_dl_client()
        resp = await client.get(url)
        resp.raise_for_status()
        path.write_bytes(resp.content)
        logger.info("Downloaded: %s → %s", url, path)
        return path
    except Exception as e:
        logger.error("Download failed (%s): %s", url, e)
        return None


async def save_scene_video(group_name: str, scene_number: int, video_url: str) -> Path | None:
    """Download and save scene video clip."""
    scene_dir = get_scene_dir(group_name, scene_number)
    return await download_and_save(video_url, scene_dir / "clip.mp4")


async def save_bgm(group_name: str, bgm_url: str) -> Path | None:
    """Download and save BGM."""
    group_dir = get_group_dir(group_name)
    bgm_dir = group_dir / "bgm"
    bgm_dir.mkdir(parents=True, exist_ok=True)
    return await download_and_save(bgm_url, bgm_dir / "bgm.mp3")
