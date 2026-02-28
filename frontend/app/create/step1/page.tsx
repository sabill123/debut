"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, type ArtStyle, type GroupType } from "@/contexts/SessionContext";
import { createSession, generateBlueprint } from "@/lib/api";
import { getConceptsForGroup } from "@/lib/constants";
import WizardProgress from "@/components/wizard/WizardProgress";
import LoadingOverlay from "@/components/create/LoadingOverlay";

export default function Step1() {
  const router = useRouter();
  const session = useSession();
  const [unitName, setUnitName] = useState(session.unitName || "");
  const [groupType, setGroupType] = useState<GroupType>(session.groupType || "girl");
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>(session.concepts || []);
  const [memberCount, setMemberCount] = useState(session.memberCount || 2);
  const [artStyle, setArtStyle] = useState<ArtStyle>(session.artStyle || "realistic");
  const [isLoading, setIsLoading] = useState(false);

  const concepts = getConceptsForGroup(groupType);

  const handleGroupTypeChange = (type: GroupType) => {
    setGroupType(type);
    setSelectedConcepts([]); // 그룹 타입 변경 시 콘셉트 초기화
  };

  const toggleConcept = (id: string) => {
    setSelectedConcepts((prev) =>
      prev.includes(id)
        ? prev.filter((c) => c !== id)
        : prev.length < 3
          ? [...prev, id]
          : prev
    );
  };

  const canProceed = unitName.trim().length > 0 && selectedConcepts.length > 0;

  const handleNext = async () => {
    if (!canProceed) return;
    setIsLoading(true);

    try {
      const { session_id } = await createSession();
      session.setSessionId(session_id);
      session.setUnitName(unitName);
      session.setGroupType(groupType);
      session.setConcepts(selectedConcepts);
      session.setMemberCount(memberCount);
      session.setArtStyle(artStyle);

      const blueprint = await generateBlueprint({
        session_id,
        unit_name: unitName,
        concepts: selectedConcepts,
        member_count: memberCount,
        art_style: artStyle,
        group_type: groupType,
      });

      session.setBlueprint(blueprint);
      router.push("/create/step2");
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isLoading && <LoadingOverlay message="아이돌 블루프린트 생성 중..." />}

      <div className="max-w-2xl mx-auto px-4 py-8">
        <WizardProgress currentStep={1} />

        <div className="mt-8 animate-fade-in glass-panel p-8 rounded-3xl border border-cyan-500/20 relative z-10 shadow-2xl">
          <h2 className="text-4xl font-black font-display tracking-tight text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 drop-shadow-sm">
            유닛 설정
          </h2>
          <p className="text-zinc-400 text-center mb-10 font-medium tracking-wide">
            당신의 아이돌 그룹을 정의하세요
          </p>

          {/* Unit Name */}
          <div className="mb-8">
            <label className="block text-sm text-zinc-400 mb-2">유닛 이름</label>
            <input
              type="text"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              placeholder="예: NEON HUNT"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-lg placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors"
              maxLength={30}
            />
          </div>

          {/* Group Type */}
          <div className="mb-8">
            <label className="block text-sm text-zinc-400 mb-3">그룹 타입</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: "girl" as GroupType, label: "걸그룹", icon: "👩‍🎤" },
                { id: "boy" as GroupType, label: "보이그룹", icon: "🧑‍🎤" },
              ]).map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleGroupTypeChange(g.id)}
                  className={`p-3 rounded-xl border text-center font-bold transition-all duration-200 ${groupType === g.id
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                    }`}
                >
                  <span className="text-xl mr-2">{g.icon}</span>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Concepts */}
          <div className="mb-8">
            <label className="block text-sm text-zinc-400 mb-3">
              콘셉트 선택 <span className="text-zinc-600">(최대 3개)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {concepts.map((concept) => {
                const isSelected = selectedConcepts.includes(concept.id);
                return (
                  <button
                    key={concept.id}
                    onClick={() => toggleConcept(concept.id)}
                    className={`px-4 py-3 rounded-xl border text-left transition-all duration-200 ${isSelected
                        ? "border-cyan-500 bg-cyan-500/10"
                        : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{concept.emoji}</span>
                      <span className={`font-medium text-sm ${isSelected ? "text-cyan-300" : "text-zinc-300"}`}>
                        {concept.label}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 mt-1 pl-7">{concept.keywords}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Art Style */}
          <div className="mb-8">
            <label className="block text-sm text-zinc-400 mb-3">아트 스타일</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: "realistic" as ArtStyle, label: "실물", desc: "실제 인물 느낌의 포토리얼리스틱", icon: "📸" },
                { id: "virtual" as ArtStyle, label: "버추얼", desc: "애니메이션/일러스트 스타일", icon: "🎨" },
              ]).map((style) => (
                <button
                  key={style.id}
                  onClick={() => setArtStyle(style.id)}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 ${artStyle === style.id
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{style.icon}</span>
                    <span className={`font-bold ${artStyle === style.id ? "text-cyan-300" : "text-zinc-300"}`}>
                      {style.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">{style.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Member Count */}
          <div className="mb-10">
            <label className="block text-sm text-zinc-400 mb-3">멤버 수</label>
            <div className="flex gap-3">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setMemberCount(n)}
                  className={`w-14 h-14 rounded-xl border text-lg font-bold transition-all ${memberCount === n
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600"
                    }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={!canProceed || isLoading}
            className={`w-full py-4 rounded-xl text-lg font-bold transition-all duration-300 ${canProceed
                ? "bg-cyan-600 hover:bg-cyan-500 text-white"
                : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              }`}
          >
            블루프린트 생성
          </button>
        </div>
      </div>
    </>
  );
}
