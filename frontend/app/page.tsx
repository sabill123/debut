"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#09090B]">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_#2e1065_0%,_transparent_60%)] opacity-40 mix-blend-screen" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-cyan-600/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-pink-600/10 rounded-full blur-[150px] pointer-events-none animate-float" />

      <div className="relative z-10 text-center px-4 animate-fade-in flex flex-col items-center">
        {/* Top Label */}
        <div className="glass-panel px-4 py-1.5 rounded-full mb-8 inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <p className="text-cyan-400 text-xs tracking-[0.2em] uppercase font-bold">
            E2E Virtual Idol Production Studio
          </p>
        </div>

        {/* Main Title */}
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 font-display drop-shadow-2xl text-white">
          DE
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-pink-500">
            BUT
          </span>
        </h1>
        
        {/* Slogan */}
        <p className="text-zinc-400 text-lg md:text-xl max-w-lg mx-auto mb-14 leading-relaxed">
          당신의 상상이 그들의 데뷔가 됩니다. <br/>
          누구나 프로듀서가 되는 마법 같은 3분을 경험하세요.
        </p>

        {/* Action Button */}
        <button
          onClick={() => router.push("/create/step1")}
          className="group relative px-12 py-5 bg-zinc-900 border border-cyan-500/50 hover:bg-zinc-800 text-white text-lg font-bold rounded-full transition-all duration-300 animate-pulse-glow overflow-hidden"
        >
          {/* Button Background Gradient Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-pink-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="relative z-10 tracking-widest font-display text-cyan-100 group-hover:text-white transition-colors">
            START YOUR DEBUT
          </span>
        </button>

        {/* Powered By */}
        <div className="mt-16 flex items-center justify-center gap-4 text-zinc-600 text-xs font-mono opacity-60">
          <span>Gemini 3.1 Pro</span>
          <span className="w-1 h-1 rounded-full bg-zinc-700" />
          <span>NanoBanana2</span>
          <span className="w-1 h-1 rounded-full bg-zinc-700" />
          <span>Veo 3.1</span>
          <span className="w-1 h-1 rounded-full bg-zinc-700" />
          <span>Suno</span>
        </div>
      </div>
    </main>
  );
}
