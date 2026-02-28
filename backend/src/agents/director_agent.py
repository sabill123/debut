"""Director Agent — orchestrates the entire MV teaser production pipeline.

Pipeline (optimized for speed):
  1. Scenario Agent → 4-scene storyboard
  2. PARALLEL: [BGM generation] + [Image generation ×4]
  3. PARALLEL: [Video generation ×4] (uses images as first frames)
  4. Save all assets to local folders + assemble timeline
"""

import asyncio
import logging
import time

from src.agents.base_agent import BaseAgent
from src.agents.scenario_agent import ScenarioAgent
from src.services.gateway_client import generate_image
from src.services.veo_client import generate_single_clip
from src.services import asset_store
from src.services.ffmpeg_renderer import render_teaser, get_output_path

logger = logging.getLogger(__name__)


IMAGE_PROMPT_SYSTEM = """You are a K-pop MV visual director. Given a scene's visual concept,
create a single concise image generation prompt optimized for NanoBanana2 (Gemini image model).

The prompt should describe a still frame from the scene — a single K-pop idol in a cinematic setting.
Include: character appearance, outfit, pose, lighting, atmosphere, camera angle.
Output ONLY the prompt text, no JSON, no explanation."""

# Number of keyframes = scenes + 1 (each scene needs first + last frame, shared at boundaries)
# Scene 1: frame[0]→frame[1], Scene 2: frame[1]→frame[2], ...
KEYFRAME_COUNT = 5  # 4 scenes + 1


class DirectorAgent(BaseAgent):
    name = "director_agent"

    def __init__(self):
        self.scenario_agent = ScenarioAgent()
        # Keep references to background tasks so they aren't GC'd
        self._background_tasks: set[asyncio.Task] = set()

    def _fire_and_forget(self, coro) -> None:
        """Schedule a background coroutine while preventing GC collection."""
        task = asyncio.create_task(coro)
        self._background_tasks.add(task)
        task.add_done_callback(self._background_tasks.discard)

    def system_prompt(self) -> str:
        return IMAGE_PROMPT_SYSTEM

    async def produce_teaser(
        self,
        blueprint: dict,
        session_id: str,
        progress_callback=None,
    ) -> dict:
        """Full MV teaser production pipeline.

        Returns:
            {
                "scenario": {...},
                "scenes": [{"scene_number": 1, "image_url": "...", "video_url": "...", ...}],
                "bgm_url": "...",
                "timeline": {...}
            }
        """
        unit_name = blueprint.get("unit_name", "Unknown")
        art_style = blueprint.get("art_style", "realistic")
        pipeline_start = time.time()

        async def report(step: str, detail: str = ""):
            elapsed = time.time() - pipeline_start
            logger.info("[director] [%.1fs] %s — %s", elapsed, step, detail)
            if progress_callback:
                await progress_callback(step, detail)

        # ── Save blueprint & member profiles to local folders ──
        asset_store.save_blueprint(unit_name, blueprint)
        for member in blueprint.get("members", []):
            asset_store.save_member_profile(unit_name, member)

        # ── Step 1: Scenario Agent → storyboard only ──
        await report("scenario", "시나리오 생성 중 (Scenario Agent)...")
        t1 = time.time()
        scenario = await self.scenario_agent.generate_scenario(blueprint)
        scenes = scenario.get("scenes", [])

        await report("scenario_done", f"'{scenario.get('title', '')}' — {len(scenes)}개 씬 ({time.time()-t1:.1f}s)")
        asset_store.save_scenario(unit_name, scenario)

        # ── Step 2: PARALLEL — BGM + Keyframes ×5 ──
        # Generate 5 keyframes for 4 scenes (frame chaining for seamless transitions)
        # Scene 1: frame[0]→frame[1], Scene 2: frame[1]→frame[2], Scene 3: frame[2]→frame[3], Scene 4: frame[3]→frame[4]
        await report("assets", "BGM + 키프레임 5장 병렬 생성 중...")

        # Build keyframe image tasks (5 frames for 4 scenes)
        # Each keyframe uses the focused member's profile image as reference
        # so the same character appears in the teaser scenes.
        image_tasks = []
        for i in range(KEYFRAME_COUNT):
            if i < len(scenes):
                scene = scenes[i]
                member_id = scene.get("member_focus", "m1")
                member = _find_member(blueprint, member_id)
            else:
                scene = scenes[-1]
                member_id = scene.get("member_focus", "m1")
                member = _find_member(blueprint, member_id)

            # Pass member's profile image as reference for character consistency
            ref_image = member.get("image_url")
            has_ref = bool(ref_image)

            image_prompt = _build_scene_image_prompt(
                scene, member, scenario,
                is_end_frame=(i >= len(scenes)),
                art_style=art_style,
                has_reference_image=has_ref,
            )

            image_tasks.append(
                generate_image(
                    visual_description=image_prompt,
                    unit_name=unit_name,
                    concept=scenario.get("mood", ""),
                    reference_image_b64=ref_image,
                )
            )

        # Run BGM + all keyframe images concurrently
        t2 = time.time()
        bgm_task = self.scenario_agent.start_bgm_generation(scenario, unit_name=unit_name)
        all_results = await asyncio.gather(
            bgm_task, *image_tasks, return_exceptions=True
        )
        step2_elapsed = time.time() - t2

        # First result is BGM, rest are keyframe images
        bgm_result = all_results[0]
        bgm_url = bgm_result if isinstance(bgm_result, str) else None
        image_results = all_results[1:]

        if bgm_url:
            await report("bgm_done", f"BGM 완료 ({step2_elapsed:.1f}s)")
            self._fire_and_forget(asset_store.save_bgm(unit_name, bgm_url))
        else:
            await report("bgm_error", f"BGM 생성 실패 (err={bgm_result}) — BGM 없이 진행")

        keyframes = []
        for i, result in enumerate(image_results):
            url = result if isinstance(result, str) else None
            keyframes.append(url)
            if url:
                # Keyframe i is first_frame for scene i, and last_frame for scene i-1
                if i < len(scenes):
                    asset_store.save_scene_first_frame(unit_name, i + 1, url)
                if i > 0:
                    asset_store.save_scene_last_frame(unit_name, i, url)
                await report("image_done", f"키프레임 {i+1}/{KEYFRAME_COUNT} 완료")
            else:
                logger.warning("Keyframe %d failed: %s", i + 1, result)
                await report("image_error", f"키프레임 {i+1} 실패")

        # ── Step 3: PARALLEL — Videos ×4 (first-last-frame chaining) ──
        # Scene N uses keyframe[N] as first_frame and keyframe[N+1] as last_frame
        await report("videos", "Veo 3.1 영상 생성 중 (4개 병렬, 프레임 체이닝)...")
        video_tasks = []
        total_scenes = len(scenes)
        for i, scene in enumerate(scenes):
            member_id = scene.get("member_focus", "m1")
            member = _find_member(blueprint, member_id)
            video_prompt = _build_video_prompt(
                scene, scenario, member, blueprint,
                scene_index=i, total_scenes=total_scenes,
                art_style=art_style,
                all_scenes=scenes,
            )
            first_frame = keyframes[i] if i < len(keyframes) else None
            last_frame = keyframes[i + 1] if (i + 1) < len(keyframes) else None
            video_tasks.append(
                generate_single_clip(
                    prompt=video_prompt,
                    session_id=session_id,
                    scene_number=i + 1,
                    first_frame_url=first_frame,
                    last_frame_url=last_frame,
                )
            )

        t3 = time.time()
        video_results = await asyncio.gather(*video_tasks, return_exceptions=True)
        step3_elapsed = time.time() - t3

        scene_videos = []
        succeeded = 0
        for i, result in enumerate(video_results):
            url = result if isinstance(result, str) else None
            scene_videos.append(url)
            if url:
                succeeded += 1
                self._fire_and_forget(asset_store.save_scene_video(unit_name, i + 1, url))
                await report("video_done", f"씬 {i+1} 영상 완료")
            else:
                logger.warning("Scene %d video failed: %s", i + 1, result)
                await report("video_error", f"씬 {i+1} 영상 실패: {result}")

        await report("videos_summary", f"영상 {succeeded}/{len(scenes)}개 완료 ({step3_elapsed:.1f}s)")

        # ── Step 4: Assemble & save ──
        await report("timeline", "타임라인 조립 중...")
        enriched_scenes = []
        for i, scene in enumerate(scenes):
            enriched = {
                **scene,
                "image_url": keyframes[i] if i < len(keyframes) else None,
                "last_frame_url": keyframes[i + 1] if (i + 1) < len(keyframes) else None,
                "video_url": scene_videos[i] if i < len(scene_videos) else None,
            }
            enriched_scenes.append(enriched)
            asset_store.save_scene_info(unit_name, i + 1, enriched)

        group_image_url = blueprint.get("group_image_url")

        timeline = _build_timeline(
            session_id=session_id,
            unit_name=unit_name,
            debut_statement=blueprint.get("debut_statement", ""),
            scenes=enriched_scenes,
            bgm_url=bgm_url,
            group_image_url=group_image_url,
        )

        asset_store.save_timeline(unit_name, timeline)

        # ── Step 5: FFmpeg render — concatenate clips + mix BGM ──
        video_clip_count = sum(1 for v in scene_videos if v)
        await report("render", f"최종 영상 합성 중 (ffmpeg, {video_clip_count}개 클립)...")
        t5 = time.time()
        output_path = get_output_path(unit_name)
        teaser_url = await render_teaser(
            timeline=timeline,
            output_path=output_path,
            group_name=unit_name,
        )
        step5_elapsed = time.time() - t5

        if teaser_url:
            await report("render_done", f"최종 MV 합성 완료! ({step5_elapsed:.1f}s) → {teaser_url}")
        else:
            await report("render_error", f"ffmpeg 렌더링 실패 ({step5_elapsed:.1f}s) — 개별 클립은 사용 가능")

        total_elapsed = time.time() - pipeline_start
        await report("done", f"MV 티저 파이프라인 완료 (총 {total_elapsed:.1f}s)")
        logger.info(
            "[director] === PIPELINE SUMMARY for '%s' ===\n"
            "  Step 1 (Scenario):       %.1fs\n"
            "  Step 2 (BGM+Keyframes):  %.1fs | BGM=%s, Keyframes=%d/%d\n"
            "  Step 3 (Veo Videos):     %.1fs | Videos=%d/%d\n"
            "  Step 4 (Timeline):       instant\n"
            "  Step 5 (FFmpeg):         %.1fs | URL=%s\n"
            "  TOTAL:                   %.1fs",
            unit_name,
            t2 - pipeline_start,  # step 1
            step2_elapsed, "OK" if bgm_url else "FAIL", sum(1 for k in keyframes if k), KEYFRAME_COUNT,
            step3_elapsed, succeeded, len(scenes),
            step5_elapsed, teaser_url or "NONE",
            total_elapsed,
        )

        return {
            "scenario": scenario,
            "scenes": enriched_scenes,
            "bgm_url": bgm_url,
            "timeline": timeline,
            "teaser_url": teaser_url,
        }


# ── Helper functions ──

def _find_member(blueprint: dict, member_id: str) -> dict:
    for m in blueprint.get("members", []):
        if m.get("member_id") == member_id:
            return m
    members = blueprint.get("members", [])
    return members[0] if members else {}


def _build_scene_image_prompt(
    scene: dict, member: dict, scenario: dict,
    is_end_frame: bool = False, art_style: str = "realistic",
    has_reference_image: bool = False,
) -> str:
    """Build a keyframe image prompt.

    When has_reference_image=True (profile image attached), skip character appearance
    description — the model already sees the character. Focus on pose, scene, mood.
    When has_reference_image=False (no profile image), include visual_description.
    """
    concept = scene.get("visual_concept", "")
    lighting = scene.get("lighting", "cinematic lighting")
    camera = scene.get("camera_movement", "")
    emotion = scene.get("emotion", "")
    motion_style = member.get("motion_style", "elegant")
    color_grading = scenario.get("color_grading", "")
    mood = scenario.get("mood", "")

    # Motion style → pose mapping
    pose_hints = {
        "elegant": "graceful standing pose, one hand near face, poised and confident",
        "powerful": "strong stance, shoulders back, intense gaze, commanding presence",
        "playful": "dynamic cheerful pose, slight tilt, bright expression, youthful energy",
        "mysterious": "half-shadowed face, side profile, contemplative gaze, enigmatic aura",
        "fierce": "sharp angular pose, forward lean, piercing eyes, aggressive confidence",
    }
    pose = pose_hints.get(motion_style, "confident idol pose, camera-ready")

    if is_end_frame:
        pose = (
            "Final reveal pose — facing camera directly, powerful expression, "
            "arms slightly spread, completing choreography ending, hero shot."
        )

    if art_style == "virtual":
        style_suffix = (
            "Anime illustration style, vibrant colors, clean linework, "
            "VTuber aesthetic, high-quality digital art."
        )
    else:
        style_suffix = (
            "Photorealistic, Hasselblad X2D, 85mm f/1.4, shallow DOF, "
            "K-pop debut teaser photo, editorial quality."
        )

    if has_reference_image:
        # Reference image attached — focus on scene/pose, not appearance
        return (
            f"Place this SAME character in a new scene. "
            f"Pose: {pose}. "
            f"Setting: {concept}. "
            f"Lighting: {lighting}. Camera: {camera}. "
            f"Mood: {emotion}, {mood}. Color grading: {color_grading}. "
            f"Single character, full or upper body. {style_suffix}"
        )
    else:
        # No reference image — include full visual description
        visual = member.get("visual_description", "A stylish K-pop idol")
        return (
            f"K-pop idol: {visual}. "
            f"Pose: {pose}. "
            f"Setting: {concept}. "
            f"Lighting: {lighting}. Camera: {camera}. "
            f"Mood: {emotion}, {mood}. Color grading: {color_grading}. "
            f"Single character, full or upper body. {style_suffix}"
        )


# Narrative arc — what MOTION/ACTION happens at each position in the 32-second teaser
_SCENE_ARC = {
    0: {
        "role": "OPENING",
        "action": (
            "Slow reveal: character emerges from shadow or silhouette, "
            "subtle head turn toward camera, building mystery and anticipation."
        ),
    },
    1: {
        "role": "BUILD",
        "action": (
            "Rising energy: confident walk forward, hair flowing in wind, "
            "environment becoming dynamic, pre-performance tension."
        ),
    },
    2: {
        "role": "CLIMAX",
        "action": (
            "Peak energy: sharp dance move or powerful choreography hit, "
            "explosive dynamic motion, the most impactful moment of the teaser."
        ),
    },
    3: {
        "role": "REVEAL",
        "action": (
            "Grand finale: iconic ending pose, direct eye contact with camera, "
            "slow confident motion settling into the definitive hero shot."
        ),
    },
}


def _build_video_prompt(
    scene: dict, scenario: dict, member: dict, blueprint: dict,
    scene_index: int = 0, total_scenes: int = 4,
    art_style: str = "realistic",
    all_scenes: list[dict] | None = None,
) -> str:
    """Build concise Veo 3.1 video prompt.

    Keep it SHORT — Veo rejects overly long/complex prompts with no_media_generated.
    First/last frame images already show the character, so focus on motion only.
    """
    camera = scene.get("camera_movement", "slow push-in")
    emotion = scene.get("emotion", "")
    mood = scenario.get("mood", "")
    motion_style = member.get("motion_style", "elegant")

    arc = _SCENE_ARC.get(scene_index, _SCENE_ARC[3])

    motion_map = {
        "elegant": "graceful fluid movements",
        "powerful": "sharp powerful movements",
        "playful": "bouncy energetic movements",
        "mysterious": "slow deliberate movements",
        "fierce": "aggressive dynamic movements",
    }
    motion = motion_map.get(motion_style, "smooth confident movements")

    prompt = (
        f"K-pop music video teaser. {arc['action']} "
        f"{motion}. Camera: {camera}. "
        f"Mood: {mood}, {emotion}. "
        f"Cinematic quality, smooth continuous shot."
    )

    return prompt


def _build_timeline(
    session_id: str,
    unit_name: str,
    debut_statement: str,
    scenes: list[dict],
    bgm_url: str | None,
    group_image_url: str | None = None,
) -> dict:
    """Build Remotion-compatible timeline JSON."""
    clips = []

    # Video clips
    for i, scene in enumerate(scenes):
        video_url = scene.get("video_url")
        if not video_url:
            continue
        clips.append({
            "id": f"clip-video-{i+1}",
            "trackId": "video-main",
            "type": "video",
            "startTime": i * 8,
            "duration": 8,
            "data": {
                "src": video_url,
                "type": "video",
            },
            "effects": {
                "transition": scene.get("transition_to_next", "fade"),
            },
        })

    # BGM audio clip
    if bgm_url:
        clips.append({
            "id": "clip-bgm",
            "trackId": "audio-bgm",
            "type": "audio",
            "startTime": 0,
            "duration": 32,
            "data": {
                "src": bgm_url,
                "type": "mp3",
            },
        })

    return {
        "project": {
            "id": session_id,
            "name": f"{unit_name} MV Teaser",
            "duration": 32,
            "aspectRatio": "16:9",
            "fps": 30,
        },
        "clips": clips,
        "opening": {
            "enabled": True,
            "duration": 2,
            "title": unit_name,
            "image_url": group_image_url,
        },
        "closing": {
            "enabled": True,
            "duration": 2,
            "title": debut_statement,
            "image_url": group_image_url,
        },
    }
