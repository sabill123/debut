"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { generateMusic } from "@/lib/api";
import WizardProgress from "@/components/wizard/WizardProgress";

export default function Step4() {
  const router = useRouter();
  const session = useSession();
  const [isGenerating, setIsGenerating] = useState(false);
  const [musicResult, setMusicResult] = useState<any>(null);

  useEffect(() => {
    if (!session.sessionId || !session.blueprint) {
      router.replace("/create/step1");
    }
  }, []);

  const handleGenerate = async () => {
    if (!session.sessionId || !session.blueprint) return;
    setIsGenerating(true);
    try {
      const result = await generateMusic({
        session_id: session.sessionId,
        unit_name: session.blueprint.unit_name,
        concepts: session.concepts,
      });
      setMusicResult(result);
      if (result.audio_url) {
        session.setMusicUrl(result.audio_url);
      }
    } catch (error) {
      console.error("Music generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <WizardProgress currentStep={4} />

      <div className="mt-8 animate-fade-in glass-panel p-8 rounded-3xl border border-cyan-500/20 relative z-10 shadow-2xl">
        <h2 className="text-4xl font-black font-display tracking-tight text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 drop-shadow-sm">
          타이틀 사운드
        </h2>
        <p className="text-zinc-400 text-center mb-10 font-medium tracking-wide">
          데뷔 타이틀곡의 프리뷰를 Suno AI로 생성합니다
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
          {session.musicUrl ? (
            <div>
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎵</span>
              </div>
              <p className="text-cyan-300 font-medium mb-4">타이틀 사운드 준비 완료!</p>
              <audio controls className="mx-auto" src={session.musicUrl} />
            </div>
          ) : musicResult?.status === "failed" ? (
            <div>
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <p className="text-red-300 font-medium mb-2">BGM 생성 실패</p>
              <p className="text-zinc-500 text-sm mb-4">Step 5에서 Director Agent가 자동으로 재시도합니다</p>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <div>
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎤</span>
              </div>
              <p className="text-zinc-400 mb-4">타이틀 사운드를 생성해보세요</p>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {isGenerating ? "생성 중..." : "사운드 생성"}
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => router.push("/create/step3")}
            className="flex-1 py-4 bg-zinc-800 text-zinc-300 rounded-xl font-bold hover:bg-zinc-700 transition-all"
          >
            이전
          </button>
          <button
            onClick={() => router.push("/create/step5")}
            className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
}
