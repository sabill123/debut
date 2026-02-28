"""Remotion video renderer — calls Remotion CLI to compose final MV teaser."""

import asyncio
import json
import logging
import time
from pathlib import Path

logger = logging.getLogger(__name__)

FRONTEND_DIR = Path(__file__).parent.parent.parent.parent / "frontend"
ASSETS_ROOT = Path(__file__).parent.parent.parent / "assets"


def _timeline_to_props(timeline: dict) -> dict:
    """Convert director_agent timeline JSON to Remotion MvTeaser props."""
    clips = []
    for clip in timeline.get("clips", []):
        if clip.get("type") == "video":
            clips.append({
                "src": clip["data"]["src"],
                "transition": clip.get("effects", {}).get("transition", "fade"),
            })

    bgm_url = None
    for clip in timeline.get("clips", []):
        if clip.get("type") == "audio":
            bgm_url = clip["data"]["src"]
            break

    opening = timeline.get("opening", {})
    closing = timeline.get("closing", {})

    return {
        "clips": clips,
        "bgmUrl": bgm_url,
        "opening": {
            "title": opening.get("title", ""),
            "imageUrl": opening.get("image_url"),
        },
        "closing": {
            "title": closing.get("title", ""),
            "imageUrl": closing.get("image_url"),
        },
    }


async def render_teaser(
    timeline: dict,
    output_path: str,
    group_name: str = "",
) -> str | None:
    """Render final MV teaser MP4 using Remotion CLI.

    Args:
        timeline: Timeline dict from director_agent._build_timeline()
        output_path: Absolute path for the output MP4
        group_name: Group name for logging

    Returns:
        Public URL for the rendered video (via /api/assets/), or None on failure.
    """
    props = _timeline_to_props(timeline)
    props_json = json.dumps(props)

    clip_count = len(props.get("clips", []))
    has_bgm = props.get("bgmUrl") is not None
    logger.info(
        "[remotion] === RENDER START === group='%s', clips=%d, bgm=%s, output=%s",
        group_name, clip_count, has_bgm, output_path,
    )
    logger.info("[remotion] Props preview: %s", props_json[:300])
    logger.info("[remotion] Frontend dir: %s (exists=%s)", FRONTEND_DIR, FRONTEND_DIR.exists())

    t0 = time.time()

    try:
        cmd = [
            "npx", "remotion", "render",
            "MvTeaser",
            output_path,
            "--props", props_json,
        ]
        logger.info("[remotion] CMD: %s", " ".join(cmd[:5]) + " ...")

        process = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=str(FRONTEND_DIR),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=600,  # 10 min max
        )

        elapsed = time.time() - t0
        stdout_text = stdout.decode() if stdout else ""
        stderr_text = stderr.decode() if stderr else ""

        if process.returncode == 0:
            # Check output file size
            out_file = Path(output_path)
            file_size = out_file.stat().st_size if out_file.exists() else 0
            logger.info(
                "[remotion] === RENDER COMPLETE === (%.1fs) file=%s size=%.1fMB",
                elapsed, output_path, file_size / (1024 * 1024),
            )
            if stdout_text:
                # Log last few lines of stdout (progress info)
                for line in stdout_text.strip().split("\n")[-10:]:
                    logger.info("[remotion] stdout: %s", line.strip())
            return _local_path_to_url(output_path)
        else:
            logger.error(
                "[remotion] === RENDER FAILED === (%.1fs) exit_code=%d",
                elapsed, process.returncode,
            )
            if stderr_text:
                for line in stderr_text.strip().split("\n")[-20:]:
                    logger.error("[remotion] stderr: %s", line.strip())
            if stdout_text:
                for line in stdout_text.strip().split("\n")[-10:]:
                    logger.error("[remotion] stdout: %s", line.strip())
            return None

    except asyncio.TimeoutError:
        elapsed = time.time() - t0
        logger.error("[remotion] === RENDER TIMEOUT === (%.1fs, limit=600s)", elapsed)
        process.kill()
        return None
    except FileNotFoundError:
        logger.error("[remotion] 'npx' not found — Remotion CLI not installed or not in PATH")
        return None
    except Exception as e:
        elapsed = time.time() - t0
        logger.error("[remotion] === RENDER ERROR === (%.1fs) %s: %s", elapsed, type(e).__name__, e)
        return None


def _local_path_to_url(local_path: str) -> str:
    """Convert local asset path to /api/assets/ URL."""
    path = Path(local_path)
    try:
        relative = path.relative_to(ASSETS_ROOT)
        return f"/api/assets/{relative}"
    except ValueError:
        return f"/api/assets/{path.name}"


def get_output_path(group_name: str) -> str:
    """Get the output path for a group's final teaser."""
    safe_name = "".join(
        c if c.isalnum() or c in "-_ " else "" for c in group_name
    ).strip().replace(" ", "_")
    out_dir = ASSETS_ROOT / safe_name / "final"
    out_dir.mkdir(parents=True, exist_ok=True)
    return str(out_dir / "teaser.mp4")
