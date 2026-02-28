"use client";

export default function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-500 animate-spin" />
      </div>
      <p className="text-cyan-300 text-lg font-medium animate-pulse">{message}</p>
      <div className="mt-4 w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-cyan-500 rounded-full shimmer" style={{ width: "60%" }} />
      </div>
    </div>
  );
}
