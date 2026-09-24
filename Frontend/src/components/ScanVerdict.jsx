import { useState } from "react";
import RiskGauge from "./RiskGauge";

const TIER_STYLES = {
  safe: {
    color: "text-safe",
    ring: "ring-safe/40",
    bg: "bg-safe/10",
    dot: "bg-safe",
    icon: "✅",
    label: "Looks safe",
    body: "We didn't find anything concerning here.",
    anim: "animate-[pop_0.4s_ease-out]",
  },
  suspicious: {
    color: "text-suspicious",
    ring: "ring-suspicious/40",
    bg: "bg-suspicious/10",
    dot: "bg-suspicious",
    icon: "⚠️",
    label: "Proceed with caution",
    body: "A few things about this don't look right.",
    anim: "animate-[pop_0.4s_ease-out]",
  },
  dangerous: {
    color: "text-dangerous",
    ring: "ring-dangerous/40",
    bg: "bg-dangerous/10",
    dot: "bg-dangerous",
    icon: "🚨",
    label: "This looks like a scam",
    body: "We'd avoid clicking, replying, or sharing details.",
    anim: "animate-[shake_0.45s_ease-in-out]",
  },
};

function normalizeTier(tier, score) {
  if (tier) return tier.toLowerCase();
  if (typeof score === "number") {
    if (score <= 30) return "safe";
    if (score <= 70) return "suspicious";
    return "dangerous";
  }
  return "suspicious";
}

/**
 * Full verdict card: animated gauge + verdict banner + collapsible
 * "why was this flagged?" list.
 *
 * Usage: <ScanVerdict result={scanResponse} />
 * where scanResponse matches ScanResponse in schemas.py
 * (risk_score, risk_tier, reason_codes, confidence).
 */
export default function ScanVerdict({ result }) {
  const [expanded, setExpanded] = useState(false);
  if (!result) return null;

  const tierKey = normalizeTier(result.risk_tier, result.risk_score);
  const tier = TIER_STYLES[tierKey] || TIER_STYLES.suspicious;
  const score = typeof result.risk_score === "number" ? result.risk_score : 0;
  const reasons = result.reason_codes || [];

  return (
    <div
      className={`rounded-md border border-hairline ${tier.bg} p-5 ring-1 ${tier.ring} ${tier.anim}`}
    >
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes pop {
          0% { transform: scale(0.96); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div className="flex flex-col items-center text-center">
        <RiskGauge score={score} />

        <div className="mt-4 flex items-center gap-2">
          <span className="text-2xl">{tier.icon}</span>
          <h3 className={`font-display text-lg font-semibold ${tier.color}`}>
            {tier.label}
          </h3>
        </div>
        <p className="mt-1 text-sm text-textSecondary">{tier.body}</p>
      </div>

      {reasons.length > 0 && (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex w-full items-center justify-between rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-textPrimary hover:bg-white/10"
          >
            Why was this flagged?
            <span
              className="transition-transform duration-200"
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              ▾
            </span>
          </button>

          <div
            className={`grid transition-all duration-300 ease-in-out ${
              expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <ul className="mt-2 space-y-2">
                {reasons.map((rc, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-md bg-white/5 px-3 py-2 text-sm text-textPrimary"
                  >
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tier.dot}`} />
                    <span>
                      {rc.detail || rc.label}
                      {typeof rc.weight === "number" && (
                        <span className="text-textSecondary">
                          {" "}· impact {Math.round(rc.weight * 100)}%
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {typeof result.confidence === "number" && (
        <p className="mt-4 text-center text-xs text-textSecondary">
          Model confidence: {Math.round(result.confidence * 100)}%
        </p>
      )}
    </div>
  );
}