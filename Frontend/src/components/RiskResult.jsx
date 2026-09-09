const TIER_STYLES = {
  safe: {
    color: "text-safe",
    ring: "ring-safe/40",
    bg: "bg-safe/10",
    label: "Looks safe",
    body: "We didn't find anything concerning here.",
  },
  suspicious: {
    color: "text-suspicious",
    ring: "ring-suspicious/40",
    bg: "bg-suspicious/10",
    label: "Proceed with caution",
    body: "A few things about this don't look right.",
  },
  dangerous: {
    color: "text-dangerous",
    ring: "ring-dangerous/40",
    bg: "bg-dangerous/10",
    label: "This looks like a scam",
    body: "We'd avoid clicking, replying, or sharing details.",
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

export default function RiskResult({ result }) {
  if (!result) return null;
  const tierKey = normalizeTier(result.risk_tier, result.risk_score);
  const tier = TIER_STYLES[tierKey] || TIER_STYLES.suspicious;
  const reasonCodes = result.reason_codes || [];

  return (
    <div className={`rounded-md border border-hairline ${tier.bg} p-5 ring-1 ${tier.ring}`}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className={`font-display text-lg font-semibold ${tier.color}`}>{tier.label}</h3>
        {typeof result.risk_score === "number" && (
          <span className="font-body text-sm text-textSecondary">
            Risk score {result.risk_score}/100
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-textSecondary">{tier.body}</p>

      {reasonCodes.length > 0 && (
        <ul className="mt-4 space-y-2">
          {reasonCodes.map((rc, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-textPrimary">
              <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${tier.color.replace("text-", "bg-")}`} />
              <span>
                {rc.detail || rc.label}
                {typeof rc.weight === "number" && (
                  <span className="text-textSecondary"> · weight {rc.weight}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {typeof result.confidence === "number" && (
        <p className="mt-4 text-xs text-textSecondary">
          Confidence: {Math.round(result.confidence * 100)}%
        </p>
      )}
    </div>
  );
}
