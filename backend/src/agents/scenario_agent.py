"""Scenario Agent — designs the MV teaser storyboard with 4 scenes.

Responsibilities:
  1. Generate 4-scene scenario from blueprint (LLM call)
  2. Provide BGM generation helper (called by DirectorAgent in parallel with images)
"""

import logging

from src.agents.base_agent import BaseAgent
from src.services.suno_client import generate_bgm

logger = logging.getLogger(__name__)


SCENARIO_SYSTEM_PROMPT = """You are a top K-pop MV director and storyboard artist.
Given an idol group's blueprint (members, worldview, concept), you design a 32-second debut MV teaser
consisting of exactly 4 scenes (8 seconds each).

Each scene should:
- Tell a visual story that builds tension and reveals the group's identity
- Feature cinematic camera work and lighting appropriate for K-pop MVs
- Focus on specific members or the whole group
- Build an emotional arc across the 4 scenes (intro mystery → build → climax → reveal)

You MUST respond with valid JSON matching this schema:
{
  "title": "MV 티저 제목 (Korean)",
  "mood": "overall mood keyword (dark, bright, mysterious, ethereal, fierce...)",
  "color_grading": "color tone description for the entire teaser",
  "scenes": [
    {
      "scene_number": 1,
      "duration": 8,
      "description": "Detailed scene description in Korean (2-3 sentences)",
      "visual_concept": "Ultra-detailed visual prompt for image generation in English. Include: setting, lighting, colors, atmosphere, character pose, costume details, camera angle. This will be used as a Veo 3.1 video prompt.",
      "camera_movement": "slow push-in / orbit / static / tracking / crane up / etc.",
      "lighting": "Specific lighting setup (neon rim light, volumetric fog, golden hour, etc.)",
      "member_focus": "m1",
      "emotion": "mysterious / powerful / ethereal / fierce / melancholic",
      "transition_to_next": "fade / dissolve / cut / zoom / wipe"
    }
  ],
  "music_direction": {
    "genre": "K-pop sub-genre (dark pop, future bass, R&B, etc.)",
    "tempo": "slow / medium / fast",
    "mood_keywords": ["mysterious", "powerful", "dramatic"],
    "lyrics_hint": "2-3 lines of Korean lyrics hint or mood description for BGM generation",
    "instrumental_style": "synth-heavy, orchestral, minimal, trap-influenced, etc."
  }
}

CRITICAL RULES:
- Exactly 4 scenes, each exactly 8 seconds
- visual_concept should be concise (2-3 sentences max), focused on setting and mood — do NOT include character appearance descriptions
- Include cinematic quality descriptions (lighting, camera, atmosphere)
- Scenes should have dramatic progression: mystery → tension → climax → reveal
- EVERY member MUST appear: distribute member_focus across scenes using round-robin (if 3 members: m1, m2, m3, m1; if 2 members: m1, m2, m1, m2; if 4+: m1, m2, m3, m4)
- Music direction should match the visual mood
- transition_to_next defines how this scene transitions to the next one
"""


class ScenarioAgent(BaseAgent):
    name = "scenario_agent"

    def system_prompt(self) -> str:
        return SCENARIO_SYSTEM_PROMPT

    async def generate_scenario(self, blueprint: dict) -> dict:
        """Generate 4-scene MV teaser scenario from blueprint."""
        members_info = []
        for m in blueprint.get("members", []):
            members_info.append(
                f"- {m.get('stage_name', '')} ({m.get('position', '')}): "
                f"{m.get('personality', '')} / 비주얼: {m.get('visual_description', '')} / "
                f"무드컬러: {', '.join(m.get('color_palette', []))} / "
                f"동작스타일: {m.get('motion_style', '')}"
            )

        member_ids = [m.get("member_id", f"m{i+1}") for i, m in enumerate(blueprint.get("members", []))]
        member_count = len(member_ids)

        # Build round-robin assignment hint
        if member_count >= 4:
            focus_hint = f"4개 씬에 각각 {', '.join(member_ids[:4])} 배정"
        elif member_count == 3:
            focus_hint = f"씬1={member_ids[0]}, 씬2={member_ids[1]}, 씬3={member_ids[2]}, 씬4={member_ids[0]}"
        elif member_count == 2:
            focus_hint = f"씬1={member_ids[0]}, 씬2={member_ids[1]}, 씬3={member_ids[0]}, 씬4={member_ids[1]}"
        else:
            focus_hint = f"모든 씬에 {member_ids[0]} 배정"

        user_prompt = (
            f"유닛 이름: {blueprint.get('unit_name', '')}\n"
            f"콘셉트: {', '.join(blueprint.get('concepts', []))}\n"
            f"세계관: {blueprint.get('group_worldview', '')}\n"
            f"데뷔 콘셉트: {blueprint.get('debut_concept_description', '')}\n"
            f"데뷔 멘트: {blueprint.get('debut_statement', '')}\n\n"
            f"멤버 ({member_count}명):\n" + "\n".join(members_info) + "\n\n"
            f"member_focus 배정: {focus_hint}\n\n"
            f"이 아이돌 그룹의 32초 데뷔 MV 티저 시나리오를 만들어주세요. "
            f"4개 씬 (각 8초), 시네마틱 품질, K-pop MV 수준의 비주얼. "
            f"모든 멤버가 반드시 등장해야 합니다."
        )

        result = await self.call_llm(user_prompt)
        logger.info("[scenario_agent] Scenario generated: %s (%d scenes)",
                     result.get("title", "?"), len(result.get("scenes", [])))
        return result

    async def start_bgm_generation(
        self,
        scenario: dict,
        unit_name: str = "",
    ) -> str | None:
        """Start BGM generation using scenario's music_direction.
        Separated from scenario so DirectorAgent can run BGM + images in parallel.
        """
        music_dir = scenario.get("music_direction", {})

        logger.info("[scenario_agent] Starting BGM generation for '%s'", unit_name)
        bgm_url = await generate_bgm(
            title=f"{unit_name} - Debut Teaser",
            genre=music_dir.get("genre", "K-pop"),
            mood_keywords=music_dir.get("mood_keywords", []),
            lyrics_hint=music_dir.get("lyrics_hint", ""),
            instrumental_style=music_dir.get("instrumental_style", ""),
        )

        if bgm_url:
            logger.info("[scenario_agent] BGM ready: %s", bgm_url[:80])
        else:
            logger.warning("[scenario_agent] BGM generation failed")

        return bgm_url
