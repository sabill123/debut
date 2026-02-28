"use client";

import { useState, useCallback, useRef } from "react";
import type { Member } from "@/lib/types";
import { updateMember as apiUpdateMember } from "@/lib/api";

interface Props {
  member: Member;
  imageUrl?: string;
  sessionId: string;
  onUpdate: (memberId: string, updates: Partial<Member>) => void;
}

const MBTI_OPTIONS = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

export default function MemberPersonaEditor({ member, imageUrl, sessionId, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleChange = useCallback(
    (field: keyof Member, value: string | number) => {
      // Optimistic local update
      onUpdate(member.member_id, { [field]: value });

      // Debounced API sync
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          await apiUpdateMember(sessionId, member.member_id, { [field]: value });
        } catch (e) {
          console.error("Failed to save member update:", e);
        } finally {
          setSaving(false);
        }
      }, 500);
    },
    [member.member_id, sessionId, onUpdate],
  );

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden transition-all">
      {/* Collapsed Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-4 text-left hover:bg-zinc-800/50 transition-colors"
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt={member.stage_name}
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold truncate">{member.stage_name}</h3>
            {member.mbti && (
              <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded">
                {member.mbti}
              </span>
            )}
            <span className="text-xs text-zinc-500">
              {member.real_name} {member.age ? `· ${member.age}세` : ""}
            </span>
          </div>
          <p className="text-sm text-zinc-500 truncate">{member.position}</p>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-xs text-cyan-400 animate-pulse">저장 중...</span>
          )}
          <svg
            className={`w-5 h-5 text-zinc-500 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Edit Form */}
      {expanded && (
        <div className="px-4 pb-5 space-y-4 border-t border-zinc-800 pt-4">
          {/* Basic Info */}
          <fieldset>
            <legend className="text-xs text-cyan-400 uppercase tracking-wider mb-2">기본 정보</legend>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="활동명"
                value={member.stage_name}
                onChange={(v) => handleChange("stage_name", v)}
              />
              <Field
                label="본명"
                value={member.real_name}
                onChange={(v) => handleChange("real_name", v)}
              />
              <Field
                label="나이"
                value={member.age?.toString() || ""}
                type="number"
                onChange={(v) => handleChange("age", parseInt(v) || 0)}
              />
              <div>
                <label className="block text-xs text-zinc-500 mb-1">MBTI</label>
                <select
                  value={member.mbti}
                  onChange={(e) => handleChange("mbti", e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">선택</option>
                  {MBTI_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* Identity */}
          <fieldset>
            <legend className="text-xs text-cyan-400 uppercase tracking-wider mb-2">아이덴티티</legend>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="포지션"
                value={member.position}
                onChange={(v) => handleChange("position", v)}
              />
              <Field
                label="팬 호칭"
                value={member.fan_nickname}
                onChange={(v) => handleChange("fan_nickname", v)}
              />
            </div>
            <div className="mt-3">
              <TextArea
                label="성격"
                value={member.personality}
                onChange={(v) => handleChange("personality", v)}
              />
            </div>
            <div className="mt-3">
              <Field
                label="말투"
                value={member.speech_style}
                onChange={(v) => handleChange("speech_style", v)}
              />
            </div>
            <div className="mt-3">
              <Field
                label="모션 스타일"
                value={member.motion_style}
                onChange={(v) => handleChange("motion_style", v)}
              />
            </div>
          </fieldset>

          {/* Visual */}
          <fieldset>
            <legend className="text-xs text-cyan-400 uppercase tracking-wider mb-2">비주얼</legend>
            <TextArea
              label="비주얼 묘사 (이미지 생성 프롬프트)"
              value={member.visual_description}
              onChange={(v) => handleChange("visual_description", v)}
              rows={3}
            />
          </fieldset>
        </div>
      )}
    </div>
  );
}

/* ─── Small reusable field components ─── */

function Field({
  label,
  value,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none"
      />
    </div>
  );
}
