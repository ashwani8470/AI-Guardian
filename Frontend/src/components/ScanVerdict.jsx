import { useState } from "react";
import RiskGauge from "./RiskGauge";
import { useT } from "../i18n";
import { usePrefs } from "../context/PrefsContext";
import { actionKey, LOOKS_LIKE_URL, normalizeTier } from "../utils/verdict";
import { printReport } from "../utils/report";

const TIER_STYLES = {
  safe: {
    color: "text-safe",
    ring: "ring-safe/40",
    bg: "bg-safe/10",
    dot: "bg-safe",
    icon: "✅",
    anim: "animate-[pop_0.4s_ease-out]",
  },
  suspicious: {
    color: "text-suspicious",
    ring: "ring-suspicious/40",
    bg: "bg-suspicious/10",
    dot: "bg-suspicious",
    icon: "⚠️",
    anim: "animate-[pop_0.4s_ease-out]",
  },
  dangerous: {
    color: "text-dangerous",
    ring: "ring-dangerous/40",
    bg: "bg-dangerous/10",
    dot: "bg-dangerous",
    icon: "🚨",
    anim: "animate-[shake_0.45s_ease-in-out]",
  },
};

const ACTION_STYLES = {
  suspicious: "border-suspicious/50 bg-suspicious/15 text-suspicious",
  dangerous: "border-dangerous/50 bg-dangerous/20 text-dangerous",
};

// Shows what was scanned. Plain text on purpose: never a clickable link, so
// nobody opens a risky address by accident.
//  - QR: the decoded address (always shown)
//  - screenshot: the text we read from the image (collapsed)
//  - text / email / url: what the person checked (only when `showScanned`,
//    e.g. from History, because on a fresh scan they just typed it)
function ScannedBlock({ modality, text, showScanned }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  if (!text) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked; ignore */
    }
  }

  if (modality === "qr") {
    const label = LOOKS_LIKE_URL.test(text.trim()) ? t("verdict.qrLeads") : t("verdict.qrContains");
    return (
      <div className="mt-4 rounded-md border border-hairline bg-ink/60 px-4 py-3 text-left">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-textSecondary">{label}</p>
          <button
            type="button"
            onClick={copy}
            className="text-xs text-textSecondary transition-colors hover:text-textPrimary"
          >
            {copied ? t("common.copied") : t("common.copy")}
          </button>
        </div>
        <p className="mt-1 break-all font-mono text-sm text-textPrimary">{text}</p>
      </div>
    );
  }

  if (modality === "screenshot") {
    return (
      <details className="mt-4 rounded-md border border-hairline bg-ink/60 px-4 py-3 text-left">
        <summary className="cursor-pointer text-sm text-textSecondary hover:text-textPrimary">
          {t("verdict.textRead")}
        </summary>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-textPrimary">{text}</p>
      </details>
    );
  }

  if (showScanned) {
    return (
      <div className="mt-4 rounded-md border border-hairline bg-ink/60 px-4 py-3 text-left">
        <p className="text-xs font-medium uppercase tracking-wide text-textSecondary">
          {t("verdict.checked")}
        </p>
        <p className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-sm text-textPrimary">
          {text}
        </p>
      </div>
    );
  }

  return null;
}

/**
 * Full verdict card: animated gauge + verdict banner + advice strip +
 * collapsible "why was this flagged?" list + optional PDF report.
 *
 * Usage: <ScanVerdict result={scanResponse} />
 * where scanResponse matches ScanResponse in schemas.py
 * (risk_score, risk_tier, reason_codes, confidence).
 */
export default function ScanVerdict({ result, showScanned = false }) {
  const t = useT();
  const { simple, lang } = usePrefs();
  const [expanded, setExpanded] = useState(false);
  if (!result) return null;

  const tierKey = normalizeTier(result.risk_tier, result.risk_score);
  const tier = TIER_STYLES[tierKey] || TIER_STYLES.suspicious;
  const score = typeof result.risk_score === "number" ? result.risk_score : 0;
  const reasons = result.reason_codes || [];
  const advice = actionKey(tierKey, result.modality);

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
            {t(`verdict.${tierKey}`)}
          </h3>
        </div>
        <p className="mt-1 text-sm text-textSecondary">{t(`verdict.${tierKey}Body`)}</p>
      </div>

      <ScannedBlock modality={result.modality} text={result.extracted_text} showScanned={showScanned} />

      {advice && (
        <div
          role="alert"
          className={`mt-4 rounded-md border px-4 py-3 text-sm font-medium ${ACTION_STYLES[tierKey]}`}
        >
          {t(advice)}
        </div>
      )}

      {reasons.length > 0 && (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex w-full items-center justify-between rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-textPrimary hover:bg-white/10"
          >
            {t("verdict.why")}
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
                      {!simple && typeof rc.weight === "number" && (
                        <span className="text-textSecondary">
                          {" "}· {t("verdict.impact")} {Math.round(rc.weight * 100)}%
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

      {!simple && typeof result.confidence === "number" && (
        <p className="mt-4 text-center text-xs text-textSecondary">
          {t("verdict.confidence")}: {Math.round(result.confidence * 100)}%
        </p>
      )}

      {!simple && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => printReport(result, t, lang)}
            className="inline-flex items-center gap-2 rounded-md border border-hairline px-3 py-1.5 text-xs text-textSecondary transition-colors hover:text-textPrimary"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
            </svg>
            {t("verdict.pdf")}
          </button>
        </div>
      )}
    </div>
  );
}
