"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSession } from "@/lib/api";
import type { SessionData, Member } from "@/lib/types";

export default function DebutPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId)
      .then((d: any) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || !data.blueprint) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500">
        세션을 찾을 수 없습니다
      </div>
    );
  }

  const bp = data.blueprint;
  const members = data.members || [];
  const scenes = data.teaser_scenes || [];
  const sceneVideos = scenes.filter((s) => s.video_url);

  return (
    <main className="min-h-screen bg-black relative overflow-hidden">
      {/* Particle Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/30 rounded-full animate-pulse"
            style={{
              left: `${((i * 37 + 13) % 100)}%`,
              top: `${((i * 53 + 7) % 100)}%`,
              animationDelay: `${(i * 0.1) % 3}s`,
              animationDuration: `${2 + (i % 4)}s`,
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/30 via-black/50 to-black z-[1]" />

        {/* Background: group image or first scene video */}
        {bp.group_image_url ? (
          <img
            src={bp.group_image_url}
            alt={bp.unit_name}
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        ) : sceneVideos[0]?.video_url ? (
          <video
            src={sceneVideos[0].video_url}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        ) : null}

        <div className="relative z-10 animate-fade-in">
          <p className="text-cyan-400/80 text-sm tracking-[0.5em] uppercase mb-4 font-bold">
            Official Debut
          </p>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter mb-4 font-display text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-orange-500 drop-shadow-[0_0_30px_rgba(6,182,212,0.4)]">
            {bp.unit_name}
          </h1>
          <p className="text-zinc-400 text-lg max-w-lg mx-auto mb-6">
            {bp.debut_concept_description}
          </p>
          <div className="inline-block px-4 py-1.5 border border-cyan-500/30 rounded-full text-cyan-300 text-sm">
            FANDOM: {bp.fandom_name}
          </div>
        </div>
      </section>

      {/* Group Profile Image */}
      {bp.group_image_url && (
        <section className="px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-sm text-cyan-400 uppercase tracking-wider text-center mb-6">
              Group Profile
            </h2>
            <div className="rounded-2xl overflow-hidden border border-zinc-800">
              <img
                src={bp.group_image_url}
                alt={`${bp.unit_name} Group`}
                className="w-full object-cover"
              />
            </div>
          </div>
        </section>
      )}

      {/* MV Teaser — Final Video */}
      {data.teaser_url && (
        <section className="px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-sm text-cyan-400 uppercase tracking-wider text-center mb-8">
              MV Teaser
            </h2>
            <div className="rounded-2xl overflow-hidden border border-zinc-800">
              <div className="aspect-video relative">
                <video
                  src={data.teaser_url}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Individual Scene Videos (fallback if no final teaser) */}
      {!data.teaser_url && sceneVideos.length > 0 && (
        <section className="px-4 py-12">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-sm text-cyan-400 uppercase tracking-wider text-center mb-8">
              MV Teaser — {sceneVideos.length} Scenes × 8s
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sceneVideos.map((scene, i) => (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden border border-zinc-800 group"
                >
                  <div className="aspect-video relative">
                    <video
                      src={scene.video_url!}
                      controls
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-cyan-300">
                      씬 {scene.scene_number || i + 1}
                    </div>
                  </div>
                  {scene.description && (
                    <div className="p-3 bg-zinc-900">
                      <p className="text-xs text-zinc-400">{scene.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Members Showcase */}
      <section className="px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-sm text-cyan-400 uppercase tracking-wider text-center mb-8">
            Members
          </h2>
          <div className={`grid gap-6 ${members.length === 1 ? "grid-cols-1 max-w-sm mx-auto" : members.length === 2 ? "grid-cols-2 max-w-2xl mx-auto" : "grid-cols-3"}`}>
            {members.map((member: Member) => (
              <div
                key={member.member_id}
                className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all duration-500"
              >
                {member.image_url && (
                  <div className="aspect-[9/16] max-h-[450px] overflow-hidden">
                    <img
                      src={member.image_url}
                      alt={member.stage_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold">{member.stage_name}</h3>
                    <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded">
                      {member.mbti}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500 mb-2">{member.position}</p>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {member.personality}
                  </p>
                  {member.color_palette?.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {member.color_palette.map((c, ci) => (
                        <div
                          key={ci}
                          className="w-4 h-4 rounded-full border border-zinc-700"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-cyan-400/60 mt-2">
                    Fan: {member.fan_nickname}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scenario Info */}
      {data.scenario && (
        <section className="px-4 py-8">
          <div className="max-w-3xl mx-auto bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <p className="text-xs text-cyan-400 uppercase tracking-wider mb-2">MV Concept</p>
            <p className="text-lg font-bold text-white mb-2">{data.scenario.title}</p>
            <p className="text-sm text-zinc-400">
              무드: {data.scenario.mood} · 색감: {data.scenario.color_grading}
            </p>
            {data.scenario.music_direction && (
              <p className="text-xs text-zinc-500 mt-2">
                장르: {data.scenario.music_direction.genre} · 템포: {data.scenario.music_direction.tempo}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Debut Statement */}
      <section className="px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-r from-cyan-900/20 via-pink-900/10 to-cyan-900/20 rounded-3xl border border-cyan-500/10 p-10">
            <p className="text-xs text-cyan-400/60 uppercase tracking-wider mb-4">
              Debut Statement
            </p>
            <p className="text-2xl md:text-4xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 leading-relaxed italic drop-shadow-md">
              &ldquo;{bp.debut_statement}&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* Music Player */}
      {(data.bgm_url || data.music_url) && (
        <section className="px-4 py-8">
          <div className="max-w-md mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <p className="text-sm text-cyan-400 mb-3">BGM</p>
            <audio controls className="w-full" src={data.bgm_url || data.music_url || undefined} />
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="text-center py-12 text-zinc-600 text-xs">
        <p>Created with Debut</p>
        <p className="mt-1">Powered by Gemini 3.1 Pro · NanoBanana2 · Veo 3.1 · Suno</p>
      </footer>
    </main>
  );
}
