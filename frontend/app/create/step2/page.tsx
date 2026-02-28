"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { generateImage, generateGroupImage } from "@/lib/api";
import WizardProgress from "@/components/wizard/WizardProgress";
import LoadingOverlay from "@/components/create/LoadingOverlay";

export default function Step2() {
  const router = useRouter();
  const session = useSession();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isGeneratingGroup, setIsGeneratingGroup] = useState(false);
  const groupGenTriggered = useRef(false);

  useEffect(() => {
    if (!session.sessionId || !session.blueprint) {
      router.replace("/create/step1");
    }
  }, []);

  const members = session.blueprint?.members || [];
  const allImagesReady = members.every((m) => session.memberImages[m.member_id]);

  // Auto-generate group image when all member images are ready
  useEffect(() => {
    if (
      allImagesReady &&
      !session.groupImageUrl &&
      !isGeneratingGroup &&
      !groupGenTriggered.current &&
      session.sessionId
    ) {
      groupGenTriggered.current = true;
      handleGenerateGroupImage();
    }
  }, [allImagesReady, session.groupImageUrl]);

  const generateMemberImage = async (memberId: string) => {
    if (!session.sessionId || !session.blueprint) return;
    const member = members.find((m) => m.member_id === memberId);
    if (!member) return;

    setGeneratingId(memberId);
    try {
      const result = await generateImage({
        session_id: session.sessionId,
        member_id: memberId,
        visual_description: member.visual_description,
        unit_name: session.blueprint.unit_name,
        concept: session.concepts[0] || "",
      });
      session.setMemberImage(memberId, result.image_url);
    } catch (error) {
      alert(`Image generation failed: ${error instanceof Error ? error.message : "Unknown"}`);
    } finally {
      setGeneratingId(null);
    }
  };

  const generateAllImages = async () => {
    setIsGeneratingAll(true);
    for (const member of members) {
      if (!session.memberImages[member.member_id]) {
        await generateMemberImage(member.member_id);
      }
    }
    setIsGeneratingAll(false);
  };

  const handleGenerateGroupImage = async () => {
    if (!session.sessionId) return;
    setIsGeneratingGroup(true);
    try {
      const result = await generateGroupImage({
        session_id: session.sessionId,
      });
      session.setGroupImageUrl(result.group_image_url);
    } catch (error) {
      console.error("Group image generation failed:", error);
    } finally {
      setIsGeneratingGroup(false);
    }
  };

  return (
    <>
      {isGeneratingAll && (
        <LoadingOverlay message="멤버 비주얼을 생성하고 있습니다..." />
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        <WizardProgress currentStep={2} />

        <div className="mt-8 animate-fade-in glass-panel p-8 rounded-3xl border border-cyan-500/20 relative z-10 shadow-2xl">
          <h2 className="text-4xl font-black font-display tracking-tight text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 drop-shadow-sm">
            멤버 비주얼
          </h2>
          <p className="text-zinc-400 text-center mb-10 font-medium tracking-wide">
            AI가 만든 당신의 아이돌을 확인하세요
          </p>

          {!allImagesReady && (
            <div className="text-center mb-8">
              <button
                onClick={generateAllImages}
                disabled={isGeneratingAll}
                className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all"
              >
                전체 멤버 생성
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {members.map((member) => {
              const imageUrl = session.memberImages[member.member_id];
              const isGenerating = generatingId === member.member_id;

              return (
                <div
                  key={member.member_id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
                >
                  {/* Image Area */}
                  <div className="aspect-[9/16] max-h-[500px] bg-zinc-950 flex items-center justify-center relative overflow-hidden">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={member.stage_name}
                        className="w-full h-full object-cover"
                      />
                    ) : isGenerating ? (
                      <div className="text-center">
                        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-zinc-500 text-sm">생성 중...</p>
                      </div>
                    ) : (
                      <div className="text-center p-4">
                        <p className="text-zinc-600 text-sm mb-3">이미지 미생성</p>
                        <button
                          onClick={() => generateMemberImage(member.member_id)}
                          className="px-4 py-2 bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 rounded-lg text-sm hover:bg-cyan-600/30 transition-all"
                        >
                          생성하기
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Member Info */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xl font-bold">{member.stage_name}</h3>
                      <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded-full">
                        {member.mbti}
                      </span>
                    </div>
                    <p className="text-zinc-500 text-sm">{member.position}</p>

                    {imageUrl && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => generateMemberImage(member.member_id)}
                          disabled={isGenerating}
                          className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-all"
                        >
                          다시 생성
                        </button>
                        <button
                          onClick={() =>
                            router.push(
                              `/create/step2/edit?member=${member.member_id}`
                            )
                          }
                          className="flex-1 py-2 bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 rounded-lg text-sm hover:bg-cyan-600/30 transition-all"
                        >
                          수정하기
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Group Image Section */}
          {allImagesReady && (
            <div className="mt-10 animate-fade-in">
              <h3 className="text-xl font-bold text-center mb-4">그룹 프로필</h3>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden max-w-lg mx-auto">
                <div className="aspect-[16/9] bg-zinc-950 flex items-center justify-center relative overflow-hidden">
                  {session.groupImageUrl ? (
                    <img
                      src={session.groupImageUrl}
                      alt="Group Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : isGeneratingGroup ? (
                    <div className="text-center">
                      <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-zinc-500 text-sm">단체 이미지 생성 중...</p>
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <p className="text-zinc-600 text-sm mb-3">단체 이미지 미생성</p>
                      <button
                        onClick={handleGenerateGroupImage}
                        className="px-4 py-2 bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 rounded-lg text-sm hover:bg-cyan-600/30 transition-all"
                      >
                        생성하기
                      </button>
                    </div>
                  )}
                </div>
                {session.groupImageUrl && (
                  <div className="p-4 text-center">
                    <button
                      onClick={handleGenerateGroupImage}
                      disabled={isGeneratingGroup}
                      className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-all"
                    >
                      {isGeneratingGroup ? "생성 중..." : "다시 생성"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => router.push("/create/step1")}
              className="flex-1 py-4 bg-zinc-800 text-zinc-300 rounded-xl font-bold hover:bg-zinc-700 transition-all"
            >
              이전
            </button>
            <button
              onClick={() => router.push("/create/step3")}
              disabled={!allImagesReady}
              className={`flex-1 py-4 rounded-xl font-bold transition-all ${allImagesReady
                  ? "bg-cyan-600 hover:bg-cyan-500 text-white"
                  : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                }`}
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
