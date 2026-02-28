"""FFmpeg video renderer — concatenates scene clips and mixes BGM into final MV teaser."""

import asyncio
import logging
import time
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

ASSETS_ROOT = Path(__file__).parent.parent.parent / "assets"


async def _download(url: str, dest: Path) -> bool:
    """Download a remote URL to a local file."""
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.get(url)
            r.raise_for_status()
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(r.content)
            logger.info("[ffmpeg] downloaded %s → %s (%.1fMB)", url[:80], dest, len(r.content) / 1e6)
            return True
    except Exception as e:
        logger.error("[ffmpeg] download failed %s: %s", url[:80], e)
        return False


async def render_teaser(
    timeline: dict,
    output_path: str,
    group_name: str = "",
) -> str | None:
    """Concatenate scene video clips + mix BGM using ffmpeg.

    1. Download all video clips to temp dir
    2. Create ffmpeg concat demuxer file
    3. Concatenate clips
    4. If BGM exists, mix audio
    5. Return local URL
    """
    t0 = time.time()

    # Extract video URLs and BGM URL from timeline
    video_urls = []
    bgm_url = None
    for clip in timeline.get("clips", []):
        if clip.get("type") == "video":
            video_urls.append(clip["data"]["src"])
        elif clip.get("type") == "audio":
            bgm_url = clip["data"]["src"]

    if not video_urls:
        logger.error("[ffmpeg] No video clips to concatenate")
        return None

    logger.info(
        "[ffmpeg] === RENDER START === group='%s', clips=%d, bgm=%s, output=%s",
        group_name, len(video_urls), bool(bgm_url), output_path,
    )

    # Prepare work directory
    safe_name = "".join(c if c.isalnum() or c in "-_ " else "" for c in group_name).strip().replace(" ", "_")
    work_dir = ASSETS_ROOT / safe_name / "final"
    work_dir.mkdir(parents=True, exist_ok=True)

    # Step 1: Download all clips
    clip_paths = []
    download_tasks = []
    for i, url in enumerate(video_urls):
        dest = work_dir / f"clip_{i}.mp4"
        clip_paths.append(dest)
        download_tasks.append(_download(url, dest))

    bgm_path = work_dir / "bgm.mp3"
    if bgm_url:
        download_tasks.append(_download(bgm_url, bgm_path))

    results = await asyncio.gather(*download_tasks)

    # Check which clips downloaded successfully
    valid_clips = []
    for i, (path, ok) in enumerate(zip(clip_paths, results[:len(clip_paths)])):
        if ok and path.exists():
            valid_clips.append(path)
        else:
            logger.warning("[ffmpeg] clip %d download failed, skipping", i + 1)

    if not valid_clips:
        logger.error("[ffmpeg] No clips downloaded successfully")
        return None

    has_bgm = bgm_url and results[-1] and bgm_path.exists() if bgm_url else False

    logger.info("[ffmpeg] Downloaded %d/%d clips, bgm=%s", len(valid_clips), len(video_urls), has_bgm)

    # Step 2: Create concat list file
    concat_file = work_dir / "concat.txt"
    concat_content = "\n".join(f"file '{p.name}'" for p in valid_clips)
    concat_file.write_text(concat_content)

    # Step 3: Concatenate clips
    concat_output = work_dir / "concat.mp4"
    try:
        if len(valid_clips) == 1:
            # Single clip — just copy
            import shutil
            shutil.copy2(valid_clips[0], concat_output)
            logger.info("[ffmpeg] Single clip, copied directly")
        else:
            cmd = [
                "ffmpeg", "-y",
                "-f", "concat", "-safe", "0",
                "-i", str(concat_file),
                "-c", "copy",
                str(concat_output),
            ]
            logger.info("[ffmpeg] Concat CMD: %s", " ".join(cmd))
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
            if proc.returncode != 0:
                logger.error("[ffmpeg] Concat failed: %s", stderr.decode()[-500:])
                # Try re-encoding instead of stream copy
                cmd_reencode = [
                    "ffmpeg", "-y",
                    "-f", "concat", "-safe", "0",
                    "-i", str(concat_file),
                    "-c:v", "libx264", "-preset", "fast",
                    "-c:a", "aac",
                    str(concat_output),
                ]
                logger.info("[ffmpeg] Retrying with re-encode...")
                proc2 = await asyncio.create_subprocess_exec(
                    *cmd_reencode,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout2, stderr2 = await asyncio.wait_for(proc2.communicate(), timeout=300)
                if proc2.returncode != 0:
                    logger.error("[ffmpeg] Re-encode concat also failed: %s", stderr2.decode()[-500:])
                    return None

        # Step 4: Mix BGM if available
        final_output = Path(output_path)
        final_output.parent.mkdir(parents=True, exist_ok=True)

        if has_bgm:
            cmd_mix = [
                "ffmpeg", "-y",
                "-i", str(concat_output),
                "-i", str(bgm_path),
                "-c:v", "copy",
                "-c:a", "aac",
                "-map", "0:v:0",
                "-map", "1:a:0",
                "-shortest",
                str(final_output),
            ]
            logger.info("[ffmpeg] Mix BGM CMD: %s", " ".join(cmd_mix))
            proc = await asyncio.create_subprocess_exec(
                *cmd_mix,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
            if proc.returncode != 0:
                logger.warning("[ffmpeg] BGM mix failed, using video without BGM: %s", stderr.decode()[-300:])
                import shutil
                shutil.copy2(concat_output, final_output)
        else:
            import shutil
            shutil.copy2(concat_output, final_output)

        elapsed = time.time() - t0
        file_size = final_output.stat().st_size if final_output.exists() else 0
        logger.info(
            "[ffmpeg] === RENDER COMPLETE === (%.1fs) file=%s size=%.1fMB clips=%d bgm=%s",
            elapsed, final_output, file_size / (1024 * 1024), len(valid_clips), has_bgm,
        )

        return _local_path_to_url(str(final_output))

    except asyncio.TimeoutError:
        logger.error("[ffmpeg] === RENDER TIMEOUT ===")
        return None
    except Exception as e:
        elapsed = time.time() - t0
        logger.error("[ffmpeg] === RENDER ERROR === (%.1fs) %s: %s", elapsed, type(e).__name__, e)
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
