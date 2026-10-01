// Shared helpers for turning a scan result into display decisions.

export function normalizeTier(tier, score) {
  if (tier) return String(tier).toLowerCase().replace("risktier.", "");
  if (typeof score === "number") {
    if (score <= 30) return "safe";
    if (score <= 70) return "suspicious";
    return "dangerous";
  }
  return "suspicious";
}

// i18n key for the "what should I do" line, or null when the result is safe.
export function actionKey(tierKey, modality) {
  const isLink = modality === "url" || modality === "qr";
  if (tierKey === "dangerous") return isLink ? "verdict.actionDangerLink" : "verdict.actionDangerOther";
  if (tierKey === "suspicious") return isLink ? "verdict.actionCautionLink" : "verdict.actionCautionOther";
  return null;
}

export const LOOKS_LIKE_URL = /^(https?:\/\/|www\.)/i;
