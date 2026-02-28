export type GroupType = "girl" | "boy";

export interface ConceptItem {
  id: string;
  label: string;
  emoji: string;
  keywords: string;
}

export const GIRL_CONCEPTS: ConceptItem[] = [
  { id: "girl_crush", label: "걸크러쉬", emoji: "🔥", keywords: "강렬, 카리스마, 파워, 자신감" },
  { id: "pure", label: "청순", emoji: "🤍", keywords: "순수, 자연스러운, 깨끗한, 첫사랑" },
  { id: "cute", label: "큐트", emoji: "🎀", keywords: "사랑스러움, 발랄, 핑크, 장난스러운" },
  { id: "teen_crush", label: "틴크러쉬", emoji: "💅", keywords: "10대 자신감, 당당, 쿨, 트렌디" },
  { id: "elegant", label: "엘레강스", emoji: "🌹", keywords: "우아, 성숙, 세련, 관능" },
  { id: "dark", label: "다크", emoji: "🖤", keywords: "미스터리, 고딕, 강렬, 반항" },
  { id: "retro", label: "레트로", emoji: "📼", keywords: "Y2K, 90s, 복고, 아날로그" },
  { id: "futuristic", label: "퓨처리스틱", emoji: "🤖", keywords: "메타버스, AI, 사이버, 미래" },
];

export const BOY_CONCEPTS: ConceptItem[] = [
  { id: "powerful", label: "파워풀", emoji: "⚡", keywords: "강렬, 퍼포먼스, 에너지, 폭발적" },
  { id: "fresh", label: "청량", emoji: "🌊", keywords: "청춘, 밝음, 에너지, 일상" },
  { id: "dark_fantasy", label: "다크 판타지", emoji: "🧛", keywords: "뱀파이어, 늑대, 초자연, 미스터리" },
  { id: "flower_boy", label: "꽃미남", emoji: "🌸", keywords: "순수, 소년미, 로맨스, 풋풋함" },
  { id: "hiphop", label: "힙합/스트릿", emoji: "🎤", keywords: "자유, 반항, 래핑, 도시" },
  { id: "dreamy", label: "몽환/드리미", emoji: "🌙", keywords: "판타지, 동화, 감성, 초현실" },
  { id: "retro", label: "레트로", emoji: "📼", keywords: "복고, 펑크, 디스코, 클래식" },
  { id: "futuristic", label: "퓨처리스틱", emoji: "🤖", keywords: "AI, 우주, 테크, 메타버스" },
];

export function getConceptsForGroup(groupType: GroupType): ConceptItem[] {
  return groupType === "girl" ? GIRL_CONCEPTS : BOY_CONCEPTS;
}

export const STEPS = [
  { number: 1, label: "유닛 설정", path: "/create/step1" },
  { number: 2, label: "비주얼 생성", path: "/create/step2" },
  { number: 3, label: "인격 확인", path: "/create/step3" },
  { number: 4, label: "타이틀 사운드", path: "/create/step4" },
  { number: 5, label: "티저 영상", path: "/create/step5" },
] as const;
