export interface Member {
  member_id: string;
  stage_name: string;
  real_name: string;
  position: string;
  personality: string;
  speech_style: string;
  fan_nickname: string;
  visual_description: string;
  age: number;
  mbti: string;
  image_url: string | null;
  color_palette: string[];
  motion_style: string;
}

export interface Blueprint {
  unit_name: string;
  concepts: string[];
  art_style: string;
  group_type: string;
  members: Member[];
  group_worldview: string;
  debut_concept_description: string;
  fandom_name: string;
  debut_statement: string;
  group_image_url: string | null;
}

export interface Scene {
  scene_number: number;
  duration: number;
  description: string;
  visual_concept: string;
  camera_movement: string;
  lighting: string;
  member_focus: string;
  emotion: string;
  transition_to_next: string;
  image_url: string | null;
  last_frame_url: string | null;
  video_url: string | null;
}

export interface Scenario {
  title: string;
  mood: string;
  color_grading: string;
  scenes: Scene[];
  music_direction: {
    genre: string;
    tempo: string;
    mood_keywords: string[];
    lyrics_hint: string;
    instrumental_style: string;
  };
}

export interface TeaserProgress {
  session_id: string;
  status: string;
  progress: string;
  scenario: Scenario | null;
  scenes: Scene[];
  bgm_url: string | null;
  timeline: Timeline | null;
}

export interface TimelineClip {
  id: string;
  trackId: string;
  type: "video" | "audio" | "image" | "subtitle";
  startTime: number;
  duration: number;
  data: { src: string; type: string };
  effects?: { transition?: string };
}

export interface Timeline {
  project: {
    id: string;
    name: string;
    duration: number;
    aspectRatio: string;
    fps: number;
  };
  clips: TimelineClip[];
  opening?: { enabled: boolean; duration: number; title: string; image_url?: string | null };
  closing?: { enabled: boolean; duration: number; title: string; image_url?: string | null };
}

export interface SessionData {
  session_id: string;
  status: string;
  blueprint: Blueprint | null;
  members: Member[];
  music_url: string | null;
  teaser_url: string | null;
  // MV teaser pipeline
  scenario: Scenario | null;
  teaser_scenes: Scene[];
  bgm_url: string | null;
  timeline: Timeline | null;
  teaser_progress: string;
}
