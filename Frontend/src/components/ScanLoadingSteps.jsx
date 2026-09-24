import { useEffect, useState } from "react";

/**
 * Sequential "what's happening" loader, shown while a scan request is in flight.
 * Steps advance on a timer (they don't track real backend progress — this is
 * a perceived-progress UI). Swap the `steps` prop per scan type.
 *
 * Usage:
 *   <ScanLoadingSteps
 *     steps={["Reading the URL…", "Checking known patterns…", "Scoring risk…"]}
 *   />
 *
 * For QR/screenshot scans, prepend an OCR/decode step:
 *   ["Decoding image…", "Extracting text…", "Scoring risk…"]
 */
export default function ScanLoadingSteps({ steps, stepDurationMs = 900 }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex >= steps.length - 1) return;
    const timer = setTimeout(() => setActiveIndex((i) => i + 1), stepDurationMs);
    return () => clearTimeout(timer);
  }, [activeIndex, steps.length, stepDurationMs]);

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-3 py-6">
      {steps.map((label, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div key={i} className="flex items-center gap-3">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs transition-colors duration-300 ${
                done
                  ? "border-green-500 bg-green-500 text-white"
                  : active
                  ? "border-indigo-500 text-indigo-600"
                  : "border-gray-300 text-gray-300"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={`text-sm transition-colors duration-300 ${
                done ? "text-gray-400 line-through" : active ? "text-gray-800 font-medium" : "text-gray-400"
              }`}
            >
              {label}
            </span>
            {active && (
              <span className="ml-1 flex gap-0.5">
                <span className="h-1 w-1 animate-bounce rounded-full bg-indigo-500 [animation-delay:-0.3s]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-indigo-500 [animation-delay:-0.15s]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-indigo-500" />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
