import type { Blueprint, Member, TeaserProgress, SessionData } from "./types";

const API_BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "Request failed");
  }
  return res.json();
}

export async function createSession(): Promise<{ session_id: string }> {
  return request("/session/create", { method: "POST" });
}

export async function generateBlueprint(data: {
  session_id: string;
  unit_name: string;
  concepts: string[];
  member_count: number;
  art_style?: string;
  group_type?: string;
}): Promise<Blueprint> {
  return request<Blueprint>("/blueprint/generate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function generateImage(data: {
  session_id: string;
  member_id: string;
  visual_description: string;
  unit_name: string;
  concept: string;
}) {
  return request<{ image_url: string }>("/image/generate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function editImage(data: {
  session_id: string;
  member_id: string;
  reference_image_b64: string;
  edit_instructions: string;
}) {
  return request<{ image_url: string }>("/image/edit", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function inpaintImage(data: {
  session_id: string;
  member_id: string;
  base_image_b64: string;
  mask_image_b64: string;
  edit_instructions: string;
}) {
  return request<{ image_url: string }>("/image/inpaint", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function generateGroupImage(data: {
  session_id: string;
}): Promise<{ group_image_url: string }> {
  return request<{ group_image_url: string }>("/image/group-generate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function generateMusic(data: {
  session_id: string;
  unit_name: string;
  concepts: string[];
  mood?: string;
  genre?: string;
  lyrics_hint?: string;
  instrumental_style?: string;
}): Promise<{ status: string; audio_url: string | null }> {
  return request<{ status: string; audio_url: string | null }>("/music/generate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function generateTeaser(data: {
  session_id: string;
}) {
  return request<{ operation_id: string }>("/teaser/generate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getTeaserStatus(operationId: string) {
  return request<{ status: string; video_url?: string; error?: string }>(`/teaser/status/${operationId}`);
}

export async function getTeaserProgress(sessionId: string): Promise<TeaserProgress> {
  return request<TeaserProgress>(`/teaser/progress/${sessionId}`);
}

export async function getSession(sessionId: string): Promise<SessionData> {
  return request<SessionData>(`/session/${sessionId}`);
}

export async function updateMember(
  sessionId: string,
  memberId: string,
  updates: Partial<Member>,
): Promise<{ status: string; member: Member }> {
  return request(`/blueprint/${sessionId}/members/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function updateBlueprint(
  sessionId: string,
  updates: {
    group_worldview?: string;
    debut_concept_description?: string;
    fandom_name?: string;
    debut_statement?: string;
  },
): Promise<{ status: string }> {
  return request(`/blueprint/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}
