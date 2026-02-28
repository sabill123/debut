# Debut : Design System & Colors

## 1. Color Palette (색감)
현대적인 K-Pop 아이돌의 무대와 AI의 미래지향성을 결합한 다크 모드 기반의 팔레트입니다.

### Base Colors (어둡고 무거운 백스테이지)
* **Background (Stage Black)**: `#09090B` (매우 깊은 징크 계열 블랙)
* **Surface (Console Dark)**: `#18181B` (카드 및 패널 배경)
* **Border (Dimmed Light)**: `#27272A` (미세한 경계선)

### Accent Colors (네온 조명과 아이돌의 오라)
* **Primary (Neon Purple)**: `#8B5CF6` ~ `#A855F7` (AI와 마법을 상징하는 사이버 퍼플)
* **Secondary (Hot Pink)**: `#EC4899` ~ `#F43F5E` (아이돌의 열정, 팝 액센트)
* **Tertiary (Electric Cyan)**: `#06B6D4` (디지털, 기술적인 진척도를 나타내는 스니펫)

### Gradient (데뷔의 순간)
* **Debut Gradient**: `linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #F59E0B 100%)`
* 이 그레이디언트는 마지막 [DEBUT NOW] 버튼과 완성된 결과물을 감싸는 보더(Border)에만 제한적으로 사용하여 극적인 효과를 줍니다.

## 2. Typography (타이포그래피)
* **Primary (UI & 본문)**: `Pretendard` 또는 `Inter`. 정보의 가독성을 최우선으로 하는 프로페셔널 스튜디오 패널 느낌.
* **Display (로고, 헤딩, 포인트)**: `Outfit` 또는 `Orbitron`. (기술적이고 기하학적인 느낌을 주어 AI 프로덕션임을 강조)

## 3. UI Shape & Components (형태와 컴포넌트)
* **Glassmorphism (글래스모피즘)**: 반투명한 패널 배경 블러(`backdrop-blur-md`)를 사용하여 빛이 투과하는 듯한 세련됨을 제공합니다.
* **Rounded Corners**: 
  * 외곽 컨테이너는 큰 라운디드(`rounded-2xl`, 16px)로 부드럽고 친근한 인상을 줍니다.
  * 내부 요소(버튼, 입력창)는 적당한 라운디드(`rounded-xl`, 12px)로 모던함을 유지합니다.
* **Glowing Borders (글로우 효과)**: AI가 액션을 수행 중이거나 완성된 에셋을 보여줄 때 테두리에 부드러운 네온 섀도우를 부여하여 강조합니다 (`box-shadow: 0 0 15px rgba(139, 92, 246, 0.5)`).

## 4. Interaction & Motion (인터랙션)
* **Fade-in & Slide-up**: 새로운 단계로 진입할 때 매끄럽게 등장하는 애니메이션.
* **Pulse Glow**: 마지막 완성 버튼이나 로딩 중인 핵심 에셋에서 리듬감 있게 숨 쉬는 듯한(Pulse) 애니메이션을 부여해 생동감(아이돌의 심장박동)을 표현합니다.
