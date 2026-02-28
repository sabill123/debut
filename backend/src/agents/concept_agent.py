"""Concept Agent — designs virtual idol member identities and group worldview.

Supports two art styles:
  - "realistic": Photorealistic human K-pop idol appearance
  - "virtual": Anime/illustration VTuber-style character design

Supports two group types:
  - "girl": Girl group concepts (걸크러쉬, 청순, 큐트, 틴크러쉬, 엘레강스, 다크, 레트로, 퓨처리스틱)
  - "boy": Boy group concepts (파워풀, 청량, 다크판타지, 꽃미남, 힙합/스트릿, 몽환/드리미, 레트로, 퓨처리스틱)
"""

import logging

from src.agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)


_JSON_SCHEMA = """{
  "members": [
    {
      "member_id": "m1",
      "stage_name": "ENGLISH_NAME",
      "real_name": "한국어 이름",
      "position": "Main Vocal / Center",
      "personality": "2-3 sentence personality description in Korean",
      "speech_style": "How they talk to fans, in Korean",
      "fan_nickname": "What fans call this member",
      "visual_description": "<<ART_STYLE_VISUAL_HINT>>",
      "age": 19,
      "mbti": "INFJ",
      "color_palette": ["#8B5CF6", "#E879F9"],
      "motion_style": "elegant"
    }
  ],
  "group_worldview": "2-3 sentence fictional universe/concept story in Korean",
  "debut_concept_description": "1-2 sentence debut concept in Korean",
  "fandom_name": "ENGLISH_NAME for fan community",
  "debut_statement": "Iconic debut catchphrase in Korean, dramatic and memorable"
}"""

_COMMON_RULES = """
CRITICAL RULES:
- visual_description must be extremely detailed and specific for image generation
- Stage names and fandom_name in English, everything else in Korean
- Make each member visually distinct
- Personality should feel like a real idol profile
- color_palette: 2 hex colors representing the member's signature colors (used for MV teaser mood)
- motion_style: one of "elegant", "powerful", "playful", "mysterious", "fierce"
"""

SYSTEM_PROMPT_REALISTIC = (
    "You are a world-class K-pop idol group creative director.\n"
    "Design PHOTOREALISTIC human idol identities.\n\n"
    "You MUST respond with valid JSON matching this schema:\n"
    + _JSON_SCHEMA
    + "\n\n"
    + _COMMON_RULES
    + """
- ART STYLE: PHOTOREALISTIC — describe as real human persons
- Include natural human features: real skin textures, natural hair, real makeup
- Include specific colors (e.g. "platinum silver hair with lavender highlights")
- Include outfit details (e.g. "black leather crop jacket with holographic patches")
- Describe natural proportions and real photography lighting
"""
)

SYSTEM_PROMPT_VIRTUAL = (
    "You are a world-class virtual idol / VTuber creative director.\n"
    "Design ANIME / ILLUSTRATION style virtual idol identities.\n\n"
    "You MUST respond with valid JSON matching this schema:\n"
    + _JSON_SCHEMA
    + "\n\n"
    + _COMMON_RULES
    + """
- ART STYLE: ANIME / ILLUSTRATION — describe as 2D/anime-style characters
- Include anime-specific features (e.g. "gradient pastel pink twin-tails, large luminous aquamarine eyes")
- Include elaborate fantasy outfit details (e.g. "holographic sailor uniform with glowing circuit patterns")
- Use anime proportions: larger expressive eyes, more stylized features, vibrant colors
- Worldview can be more fantastical and otherworldly
"""
)


_GIRL_CONCEPT_HINTS: dict[str, str] = {
    "girl_crush": "걸크러쉬 — 강렬한 카리스마, 파워풀한 자신감. 비주얼: 샤프한 눈매, 올블랙/레더, 강렬한 스모키. 음악: 강렬한 비트, 파워풀한 보컬. 참고: BLACKPINK, (G)I-DLE, ITZY",
    "pure": "청순 — 순수하고 자연스러운 매력, 첫사랑. 비주얼: 내추럴 메이크업, 파스텔/화이트, 부드러운 웨이브 헤어. 음악: 어쿠스틱 기타, 맑은 보컬, 밝고 청아한 멜로디. 참고: IZ*ONE, GFRIEND, Fromis_9",
    "cute": "큐트 — 사랑스러움과 발랄함, 장난스러운 매력. 비주얼: 핑크/파스텔, 리본·프릴, 밝은 컬러 헤어. 음악: 밝고 경쾌한 팝, 통통 튀는 신스, 귀여운 효과음. 참고: TWICE, OH MY GIRL",
    "teen_crush": "틴크러쉬 — 10대의 당당함, 쿨하고 트렌디한 자신감. 비주얼: 스포티·캐주얼, 네온·비비드, 에너제틱 포즈. 음악: 힙합 기반 팝, 트렌디한 비트. 참고: STAYC, NewJeans, LE SSERAFIM",
    "elegant": "엘레강스 — 우아하고 성숙한 세련미, 관능미. 비주얼: 드레시한 의상, 골드·버건디, 시크한 메이크업. 음악: R&B, 재즈 영향, 깊은 보컬, 세련된 프로덕션. 참고: MAMAMOO, Red Velvet",
    "dark": "다크 — 미스터리, 고딕, 강렬한 반항적 에너지. 비주얼: 다크 컬러, 고딕 액세서리, 강렬한 아이라인. 음악: 다크 일렉트로닉, 무거운 베이스, 긴장감 있는 신스. 참고: Dreamcatcher, (G)I-DLE",
    "retro": "레트로 — Y2K, 90s, 복고적 아날로그 감성. 비주얼: 빈티지 패션, 레트로 컬러, 올드스쿨 액세서리. 음악: 디스코, 펑크, 시티팝, 복고풍 신디사이저. 참고: Red Velvet, EXID",
    "futuristic": "퓨처리스틱 — 메타버스, AI, 사이버펑크, 미래 세계관. 비주얼: 메탈릭·네온, 하이테크 의상, 홀로그래픽. 음악: 일렉트로닉, 사이버사운드, 글리치, 보코더. 참고: aespa, XG",
}

_BOY_CONCEPT_HINTS: dict[str, str] = {
    "powerful": "파워풀 — 강렬한 퍼포먼스, 폭발적 에너지. 비주얼: 근육 라인 강조, 올블랙/밀리터리, 강렬한 눈빛. 음악: 하드 EDM, 파워풀 래핑, 강렬한 드롭. 참고: Stray Kids, ATEEZ, MONSTA X",
    "fresh": "청량 — 청춘의 밝음과 에너지, 일상적 따뜻함. 비주얼: 밝은 톤, 캐주얼/프레피, 자연스러운 스타일링. 음악: 밝은 팝, 어쿠스틱 기타, 청량한 하모니. 참고: SEVENTEEN, TXT, NCT DREAM",
    "dark_fantasy": "다크 판타지 — 뱀파이어, 늑대인간, 초자연적 미스터리. 비주얼: 고딕 의상, 레드·블랙, 판타지 소품, 붉은 눈. 음악: 오케스트라 + 일렉트로닉, 드라마틱 브릿지, 서사적. 참고: VIXX, EXO, ENHYPEN",
    "flower_boy": "꽃미남 — 소년미, 풋풋한 로맨스, 순수 감성. 비주얼: 소프트 메이크업, 파스텔, 꽃·자연 요소, 부드러운 조명. 음악: 발라드, 소프트 팝, 감성적 보컬. 참고: ASTRO, NU'EST",
    "hiphop": "힙합/스트릿 — 자유와 반항, 래핑, 도시 감성. 비주얼: 스트릿웨어, 오버사이즈, 체인·캡, 그래피티 배경. 음악: 힙합, 트랩, 저음 래핑, 스크래치. 참고: BTS(초기), iKON, Block B",
    "dreamy": "몽환/드리미 — 판타지, 동화, 감성적 초현실. 비주얼: 몽환적 조명, 파스텔·라벤더, 부유감 있는 포즈, 안개·별. 음악: 앰비언트 팝, 리버브 보컬, 드리미 신스. 참고: TXT, TOMORROW X TOGETHER",
    "retro": "레트로 — 복고, 펑크, 디스코, 클래식 무드. 비주얼: 빈티지 수트, 70-80s 패션, 레트로 컬러 팔레트. 음악: 펑크, 디스코, 시티팝, 복고풍 기타. 참고: SHINee, SUPER JUNIOR",
    "futuristic": "퓨처리스틱 — AI, 우주, 테크, 메타버스 세계관. 비주얼: 사이버 아머, 네온·실버, LED, 우주 배경. 음악: 퓨처 베이스, 사이버 사운드, 글리치, 보코더. 참고: EXO, NCT",
}


class ConceptAgent(BaseAgent):
    name = "concept_agent"

    def __init__(self):
        self._art_style = "realistic"

    def system_prompt(self) -> str:
        if self._art_style == "virtual":
            return SYSTEM_PROMPT_VIRTUAL
        return SYSTEM_PROMPT_REALISTIC

    async def generate_blueprint(
        self,
        unit_name: str,
        concepts: list[str],
        member_count: int,
        art_style: str = "realistic",
        group_type: str = "girl",
    ) -> dict:
        """Generate complete idol group blueprint."""
        self._art_style = art_style
        concepts_str = ", ".join(concepts)

        style_label = "실사 (포토리얼리스틱)" if art_style == "realistic" else "버추얼 (애니메이션/일러스트)"
        group_label = "걸그룹 (여성 아이돌)" if group_type == "girl" else "보이그룹 (남성 아이돌)"

        # Build concept direction hints
        hint_map = _GIRL_CONCEPT_HINTS if group_type == "girl" else _BOY_CONCEPT_HINTS
        concept_hints = []
        for c in concepts:
            if c in hint_map:
                concept_hints.append(f"  - {hint_map[c]}")
        concept_direction = "\n".join(concept_hints) if concept_hints else ""

        user_prompt = (
            f"그룹 타입: {group_label}\n"
            f"유닛 이름: {unit_name}\n"
            f"콘셉트 키워드: {concepts_str}\n"
            f"멤버 수: {member_count}명\n"
            f"아트 스타일: {style_label}\n"
        )

        if concept_direction:
            user_prompt += (
                f"\n선택된 콘셉트 방향성:\n{concept_direction}\n\n"
                f"위 콘셉트 방향성을 참고하여 비주얼, 성격, 세계관을 디자인해주세요.\n"
            )

        user_prompt += (
            f"\n이 유닛의 완전한 블루프린트를 만들어주세요. "
            f"{'여성' if group_type == 'girl' else '남성'} 아이돌에 맞는 비주얼과 성격을 디자인하세요. "
            f"각 멤버의 visual_description은 AI 이미지 생성에 바로 쓸 수 있을 정도로 상세하게. "
            f"color_palette와 motion_style도 반드시 포함해주세요."
        )

        result = await self.call_llm(user_prompt)
        logger.info(
            "[concept_agent] Blueprint generated for '%s' (%s, %s) with %d members",
            unit_name, art_style, group_type, member_count,
        )
        return result
