"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { generateTeaser, getTeaserProgress } from "@/lib/api";
import WizardProgress from "@/components/wizard/WizardProgress";
import type { TeaserProgress } from "@/lib/types";

const PIPELINE_STEPS = [
  { key: "scenario", label: "시나리오 + BGM 생성", icon: "📝" },
  { key: "assets", label: "이미지 생성", icon: "🎨" },
  { key: "videos", label: "Veo 3.1 영상 생성", icon: "🎬" },
  { key: "timeline", label: "타임라인 조립", icon: "🎞️" },
  { key: "done", label: "완료", icon: "✅" },
];

export default function Step5() {
  const router = useRouter();
  const session = useSession();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<TeaserProgress | null>(null);
  const [currentStep, setCurrentStep] = useState<string>("idle");
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Guard: redirect if no session
  useEffect(() => {
    if (!session.sessionId || !session.blueprint) {
      router.replace("/create/step1");
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleGenerate = async () => {
    if (!session.sessionId) return;
    setIsGenerating(true);
    setCurrentStep("scenario");
    setError(null);

    try {
      const { operation_id } = await generateTeaser({
        session_id: session.sessionId,
      });
      session.setTeaserOperationId(operation_id);
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start generation");
      setIsGenerating(false);
      setCurrentStep("idle");
    }
  };

  const startPolling = useCallback(() => {
    if (!session.sessionId) return;

    // Clear any existing timers
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    intervalRef.current = setInterval(async () => {
      try {
        const data = await getTeaserProgress(session.sessionId!);
        setProgress(data);

        const p = data.progress || "";
        if (p.includes("done")) {
          setCurrentStep("done");
          setIsGenerating(false);
          if (data.bgm_url) session.setMusicUrl(data.bgm_url);
          if (data.scenes?.length) {
            const firstVideo = data.scenes.find((s) => s.video_url);
            if (firstVideo?.video_url) session.setTeaserUrl(firstVideo.video_url);
          }
          if (intervalRef.current) clearInterval(intervalRef.current);
        } else if (p.includes("video")) {
          setCurrentStep("videos");
        } else if (p.includes("image") || p.includes("bgm") || p.includes("assets")) {
          setCurrentStep("assets");
        } else if (p.includes("scenario")) {
          setCurrentStep("scenario");
        } else if (p.includes("timeline")) {
          setCurrentStep("timeline");
        }

        if (data.status === "error") {
          setError("MV 티저 생성 중 오류 발생");
          setIsGenerating(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch {
        // Keep polling on network errors
      }
    }, 3000);

    // Timeout after 10 minutes
    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsGenerating((prev) => {
        if (prev) {
          setError("시간 초과 — 생성에 너무 오래 걸립니다");
          return false;
        }
        return prev;
      });
    }, 600000);
  }, [session.sessionId]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <WizardProgress currentStep={5} />

      <div className="mt-8 animate-fade-in glass-panel p-8 rounded-3xl border border-cyan-500/20 relative z-10 shadow-2xl">
        <h2 className="text-4xl font-black font-display tracking-tight text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 drop-shadow-sm">
          MV 티저 생성
        </h2>
        <p className="text-zinc-400 text-center mb-10 font-medium tracking-wide">
          AI 디렉터가 MV 티저를 제작합니다
        </p>

        {/* Pipeline Progress */}
        {isGenerating && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse" />
              <p className="text-sm text-cyan-300 font-medium">
                {progress?.progress || "파이프라인 시작 중..."}
              </p>
            </div>

            <div className="space-y-3">
              {PIPELINE_STEPS.map((step) => {
                const stepIndex = PIPELINE_STEPS.findIndex((s) => s.key === step.key);
                const currentIndex = PIPELINE_STEPS.findIndex((s) => s.key === currentStep);
                const isDone = stepIndex < currentIndex || currentStep === "done";
                const isActive = step.key === currentStep;

                return (
                  <div
                    key={step.key}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${isActive
                        ? "bg-cyan-500/10 border border-cyan-500/30"
                        : isDone
                          ? "bg-zinc-800/50 opacity-60"
                          : "opacity-30"
                      }`}
                  >
                    <span className="text-lg">{step.icon}</span>
                    <span
                      className={`text-sm ${isActive ? "text-cyan-300 font-medium" : "text-zinc-400"}`}
                    >
                      {step.label}
                    </span>
                    {isDone && <span className="ml-auto text-green-400 text-xs">완료</span>}
                    {isActive && !isDone && (
                      <div className="ml-auto w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Scene Preview Grid */}
        {progress?.scenes && progress.scenes.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {progress.scenes.map((scene, i) => (
              <div
                key={i}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
              >
                <div className="aspect-video bg-zinc-950 flex items-center justify-center relative">
                  {scene.video_url ? (
                    <video
                      src={scene.video_url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : scene.image_url ? (
                    <img
                      src={scene.image_url}
                      alt={`Scene ${i + 1}`}
                      className="w-full h-full object-cover opacity-60"
                    />
                  ) : (
                    <div className="w-6 h-6 border-2 border-zinc-700 border-t-cyan-500 rounded-full animate-spin" />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs text-zinc-500">
                    씬 {scene.scene_number || i + 1} · 8초
                  </p>
                  <p className="text-xs text-zinc-600 truncate">
                    {scene.description || "생성 중..."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Scenario Info */}
        {progress?.scenario && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 mb-6">
            <p className="text-xs text-cyan-400 uppercase tracking-wider mb-1">시나리오</p>
            <p className="text-sm text-white font-medium">{progress.scenario.title}</p>
            <p className="text-xs text-zinc-500 mt-1">
              무드: {progress.scenario.mood} · 색감: {progress.scenario.color_grading}
            </p>
          </div>
        )}

        {/* Generate / Error / Idle */}
        {!isGenerating && currentStep !== "done" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            {error ? (
              <div>
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={handleGenerate}
                  className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold"
                >
                  다시 시도
                </button>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🎬</span>
                </div>
                <p className="text-zinc-400 mb-2">
                  AI 디렉터 + 시나리오 에이전트가 협업하여
                </p>
                <p className="text-zinc-400 mb-6">32초 MV 티저를 자동 생성합니다</p>
                <button
                  onClick={handleGenerate}
                  className="px-10 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-lg transition-all"
                >
                  MV 티저 생성 시작
                </button>
              </div>
            )}
          </div>
        )}

        {/* Done state */}
        {currentStep === "done" && (
          <div className="bg-gradient-to-r from-cyan-900/20 to-pink-900/20 border border-cyan-500/20 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <p className="text-xl font-bold text-white mb-2">MV 티저 완성!</p>
            <p className="text-zinc-400 text-sm">DEBUT NOW 버튼을 눌러 데뷔하세요</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => router.push("/create/step4")}
            className="flex-1 py-4 bg-zinc-800 text-zinc-300 rounded-xl font-bold hover:bg-zinc-700 transition-all"
          >
            이전
          </button>
          <button
            onClick={() => router.push(`/debut/${session.sessionId}`)}
            disabled={currentStep !== "done"}
            className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${currentStep === "done"
                ? "bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white animate-pulse-glow"
                : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              }`}
          >
            DEBUT NOW
          </button>
        </div>
      </div>
    </div>
  );
}
