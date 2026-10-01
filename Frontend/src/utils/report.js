import { parseServerDate } from "./dates";
import { actionKey, normalizeTier } from "./verdict";

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const TIER_COLOURS = { safe: "#15803d", suspicious: "#b45309", dangerous: "#b91c1c" };

/**
 * Builds the report page as an HTML string. Everything inserted is HTML-escaped
 * because the scanned text is untrusted (it is usually a scam message).
 */
export function buildReportHtml(result, t, lang = "en") {
  const tierKey = normalizeTier(result.risk_tier, result.risk_score);
  const colour = TIER_COLOURS[tierKey] || TIER_COLOURS.suspicious;
  const when = parseServerDate(result.created_at || result.timestamp) || new Date();
  const whenText = when.toLocaleString(lang === "hi" ? "hi-IN" : undefined);
  const action = actionKey(tierKey, result.modality);
  const reasons = result.reason_codes || [];

  const html = `<!doctype html>
<html lang="${esc(lang)}"><head><meta charset="utf-8">
<title>AI-Guardian-report</title>
<style>
  @page { margin: 18mm; }
  body { font-family: "Segoe UI","Nirmala UI",Arial,sans-serif; color:#111827; font-size:14px; line-height:1.5; }
  h1 { font-size:20px; margin:0 0 4px; }
  .muted { color:#6b7280; font-size:12px; }
  .verdict { margin:18px 0; padding:14px 16px; border:2px solid ${colour}; border-radius:8px; }
  .verdict .score { font-size:32px; font-weight:700; color:${colour}; }
  .verdict .label { font-size:18px; font-weight:600; color:${colour}; }
  table { border-collapse:collapse; width:100%; margin-top:6px; }
  td { padding:5px 0; vertical-align:top; }
  td:first-child { width:34%; color:#6b7280; }
  h2 { font-size:14px; margin:20px 0 6px; text-transform:uppercase; letter-spacing:.04em; color:#374151; }
  .box { border:1px solid #d1d5db; border-radius:6px; padding:10px 12px; white-space:pre-wrap; word-break:break-word; }
  ul { margin:6px 0; padding-left:20px; }
  .foot { margin-top:26px; font-size:12px; color:#6b7280; border-top:1px solid #e5e7eb; padding-top:10px; }
</style></head><body>
  <h1>${esc(t("report.title"))}</h1>
  <div class="muted">${esc(t("report.date"))}: ${esc(whenText)}</div>

  <div class="verdict">
    <div class="score">${esc(result.risk_score)} / 100</div>
    <div class="label">${esc(t(`verdict.${tierKey}`))}</div>
  </div>

  <table>
    <tr><td>${esc(t("report.type"))}</td><td>${esc(t(`type.${result.modality}`))}</td></tr>
    <tr><td>${esc(t("report.score"))}</td><td>${esc(result.risk_score)} / 100</td></tr>
    <tr><td>${esc(t("report.verdict"))}</td><td>${esc(t(`tier.${tierKey}`))}</td></tr>
  </table>

  ${result.extracted_text ? `<h2>${esc(t("report.scanned"))}</h2><div class="box">${esc(result.extracted_text)}</div>` : ""}

  ${reasons.length ? `<h2>${esc(t("report.reasons"))}</h2><ul>${reasons
    .map((r) => `<li>${esc(r.detail || r.label)}</li>`)
    .join("")}</ul>` : ""}

  ${action ? `<h2>${esc(t("report.next"))}</h2><p>${esc(t(action))}</p><p>${esc(t("report.helpline"))}</p>` : ""}

  <div class="foot">${esc(t("report.disclaimer"))}</div>
</body></html>`;
  return html;
}

/**
 * Opens the browser's print dialog with a clean one-page report for this scan.
 * The user picks "Save as PDF" as the printer. No library needed.
 */
export function printReport(result, t, lang = "en") {
  const html = buildReportHtml(result, t, lang);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => iframe.remove();
  iframe.contentWindow.addEventListener("afterprint", cleanup);
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(cleanup, 60000); // safety net if afterprint never fires
  }, 250);
}
