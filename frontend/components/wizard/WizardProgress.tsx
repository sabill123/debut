"use client";

import { STEPS } from "@/lib/constants";

export default function WizardProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-6">
      {STEPS.map((step) => (
        <div key={step.number} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              step.number === currentStep
                ? "bg-cyan-500 text-white scale-110"
                : step.number < currentStep
                  ? "bg-cyan-500/30 text-cyan-300"
                  : "bg-zinc-800 text-zinc-500"
            }`}
          >
            {step.number < currentStep ? "✓" : step.number}
          </div>
          <span
            className={`text-xs hidden md:block ${
              step.number === currentStep
                ? "text-cyan-400 font-medium"
                : "text-zinc-600"
            }`}
          >
            {step.label}
          </span>
          {step.number < STEPS.length && (
            <div
              className={`w-8 h-0.5 ${
                step.number < currentStep ? "bg-cyan-500/30" : "bg-zinc-800"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
