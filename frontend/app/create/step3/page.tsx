"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { updateBlueprint as apiUpdateBlueprint } from "@/lib/api";
import WizardProgress from "@/components/wizard/WizardProgress";
import MemberPersonaEditor from "@/components/create/MemberPersonaEditor";

export default function Step3() {
  const router = useRouter();
  const session = useSession();
  const blueprint = session.blueprint;
  const members = blueprint?.members || [];

  useEffect(() => {
    if (!session.sessionId || !session.blueprint) {
      router.replace("/create/step1");
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <WizardProgress currentStep={3} />

      <div className="mt-8 animate-fade-in glass-panel p-8 rounded-3xl border border-cyan-500/20 relative z-10 shadow-2xl">
        <h2 className="text-4xl font-black font-display tracking-tight text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 drop-shadow-sm">
          인격 & 세계관
        </h2>
        <p className="text-zinc-400 text-center mb-10 font-medium tracking-wide">
          멤버들의 캐릭터를 확인하고 수정하세요
        </p>

        {/* Group Worldview — Editable */}
        {blueprint && session.sessionId && (
          <EditableWorldview
            sessionId={session.sessionId}
            groupWorldview={blueprint.group_worldview}
            debutConceptDescription={blueprint.debut_concept_description}
            fandomName={blueprint.fandom_name}
            onUpdate={session.updateBlueprintFields}
          />
        )}

        {/* Members — Editable */}
        <div className="space-y-3">
          {members.map((member) => (
            <MemberPersonaEditor
              key={member.member_id}
              member={member}
              imageUrl={session.memberImages[member.member_id]}
              sessionId={session.sessionId || ""}
              onUpdate={session.updateMember}
            />
          ))}
        </div>

        {/* Debut Statement — Editable */}
        {blueprint && session.sessionId && (
          <EditableDebutStatement
            sessionId={session.sessionId}
            debutStatement={blueprint.debut_statement}
            onUpdate={session.updateBlueprintFields}
          />
        )}

        {/* Navigation */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => router.push("/create/step2")}
            className="flex-1 py-4 bg-zinc-800 text-zinc-300 rounded-xl font-bold hover:bg-zinc-700 transition-all"
          >
            이전
          </button>
          <button
            onClick={() => router.push("/create/step4")}
            className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Editable sub-components ─── */

function EditableWorldview({
  sessionId,
  groupWorldview,
  debutConceptDescription,
  fandomName,
  onUpdate,
}: {
  sessionId: string;
  groupWorldview: string;
  debutConceptDescription: string;
  fandomName: string;
  onUpdate: (updates: Record<string, string>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const save = useCallback(
    (field: string, value: string) => {
      onUpdate({ [field]: value });
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        apiUpdateBlueprint(sessionId, { [field]: value }).catch(console.error);
      }, 500);
    },
    [sessionId, onUpdate],
  );

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm text-cyan-400 uppercase tracking-wider">
          세계관
        </h3>
        <button
          onClick={() => setEditing(!editing)}
          className="text-xs text-zinc-500 hover:text-cyan-400 transition-colors"
        >
          {editing ? "완료" : "수정"}
        </button>
      </div>

      {editing ? (
        <div className="space-y-3">
          <textarea
            value={groupWorldview}
            onChange={(e) => save("group_worldview", e.target.value)}
            rows={4}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500 resize-none"
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-zinc-500 mb-1">팬덤명</label>
              <input
                value={fandomName}
                onChange={(e) => save("fandom_name", e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-zinc-500 mb-1">데뷔 콘셉트</label>
              <input
                value={debutConceptDescription}
                onChange={(e) => save("debut_concept_description", e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="text-zinc-300 leading-relaxed">{groupWorldview}</p>
          <div className="mt-4 flex gap-2">
            <span className="text-xs px-3 py-1 bg-cyan-500/10 text-cyan-300 rounded-full border border-cyan-500/20">
              {fandomName}
            </span>
            <span className="text-xs px-3 py-1 bg-zinc-800 text-zinc-400 rounded-full">
              {debutConceptDescription}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function EditableDebutStatement({
  sessionId,
  debutStatement,
  onUpdate,
}: {
  sessionId: string;
  debutStatement: string;
  onUpdate: (updates: Record<string, string>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const save = useCallback(
    (value: string) => {
      onUpdate({ debut_statement: value });
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        apiUpdateBlueprint(sessionId, { debut_statement: value }).catch(console.error);
      }, 500);
    },
    [sessionId, onUpdate],
  );

  return (
    <div className="mt-6 text-center p-6 bg-gradient-to-r from-cyan-900/20 to-pink-900/20 rounded-2xl border border-cyan-500/10">
      <div className="flex items-center justify-center gap-2 mb-2">
        <p className="text-xs text-cyan-400 uppercase tracking-wider">
          데뷔 멘트
        </p>
        <button
          onClick={() => setEditing(!editing)}
          className="text-xs text-zinc-500 hover:text-cyan-400 transition-colors"
        >
          {editing ? "완료" : "수정"}
        </button>
      </div>

      {editing ? (
        <textarea
          value={debutStatement}
          onChange={(e) => save(e.target.value)}
          rows={2}
          className="w-full bg-zinc-800/50 border border-cyan-500/30 rounded-lg px-4 py-3 text-lg text-white text-center focus:outline-none focus:border-cyan-500 resize-none italic"
        />
      ) : (
        <p className="text-xl font-bold text-white italic">
          &ldquo;{debutStatement}&rdquo;
        </p>
      )}
    </div>
  );
}
