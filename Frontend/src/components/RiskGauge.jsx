import { useEffect, useState } from "react";

/**
 * Animated circular gauge for a 0-100 risk score (higher = riskier).
 * Thresholds match schemas.py: safe 0-30, suspicious 31-70, dangerous 71-100.
 *
 * Usage:
 *   <RiskGauge score={result.risk_score} />
 *   <RiskGauge score={result.risk_score} showLabel />
 */
export default function RiskGauge({
  score = 0,
  size = 160,
  strokeWidth = 14,
  showLabel = false,
}) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const clamped = Math.max(0, Math.min(100, score));
    const durationMs = 900;
    const startTime = performance.now();

    let frameId;
    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setAnimatedScore(Math.round(eased * clamped));
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [score]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  const color =
    animatedScore > 70 ? "#ef4444" : animatedScore > 30 ? "#f59e0b" : "#22c55e";
  const label =
    animatedScore > 70 ? "High risk" : animatedScore > 30 ? "Caution" : "Looks safe";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(128,128,128,0.25)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke 300ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold leading-none" style={{ color }}>
            {animatedScore}
          </span>
          <span className="mt-1 text-xs text-textSecondary">/ 100</span>
        </div>
      </div>
      {showLabel && (
        <span className="text-sm font-medium" style={{ color }}>
          {label}
        </span>
      )}
    </div>
  );
}