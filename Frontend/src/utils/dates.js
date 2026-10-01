// The API sends UTC timestamps without a timezone suffix ("2026-09-30T17:30:00").
// Browsers read that as LOCAL time, which shifts it (e.g. by 5h30m in India).
// Treat a suffix-less timestamp as UTC so it displays correctly.
export function parseServerDate(value) {
  if (!value) return null;
  const s = String(value);
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);
  const d = new Date(hasZone ? s : `${s}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatServerDate(value, lang = "en") {
  const d = parseServerDate(value);
  return d ? d.toLocaleString(lang === "hi" ? "hi-IN" : undefined) : "—";
}
