"use client";

import { SessionProvider } from "@/contexts/SessionContext";

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-[#09090B] relative overflow-x-hidden">
        {/* Ambient Dark Neon Background for all Wizard Steps */}
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,_#083344_0%,_transparent_60%)] opacity-30 mix-blend-screen pointer-events-none" />
        <div className="fixed top-20 right-0 w-[500px] h-[500px] bg-cyan-900/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-pink-900/10 rounded-full blur-[120px] pointer-events-none animate-float" />

        <div className="relative z-10 w-full h-full pb-20">
          {children}
        </div>
      </div>
    </SessionProvider>
  );
}
