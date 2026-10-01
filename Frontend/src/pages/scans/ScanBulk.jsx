import { useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import BackLink from "../../components/BackLink";
import ScanDetailModal from "../../components/ScanDetailModal";
import { useT } from "../../i18n";
import { normalizeTier } from "../../utils/verdict";

const MAX_LINKS = 20;

const TIER_DOT = {
  safe: "bg-safe",
  suspicious: "bg-suspicious",
  dangerous: "bg-dangerous",
};

// One link per line -> trimmed, de-duplicated list.
function parseLinks(text) {
  const seen = new Set();
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const link = line.trim();
    if (link && !seen.has(link)) {
      seen.add(link);
      out.push(link);
    }
  }
  return out;
}

export default function ScanBulk() {
  const t = useT();
  const [text, setText] = useState("");
  const [rows, setRows] = useState([]); // {url, status: "pending"|"done"|"error", result, error}
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState(null);
  const stopped = useRef(false);

  // Stop the loop if the user leaves the page mid-run.
  useEffect(() => {
    stopped.current = false;
    return () => {
      stopped.current = true;
    };
  }, []);

  const links = parseLinks(text);
  const tooMany = links.length > MAX_LINKS;

  function handleClear() {
    setText("");
    setRows([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const batch = links.slice(0, MAX_LINKS);
    if (batch.length === 0) return;

    setRunning(true);
    setRows(batch.map((url) => ({ url, status: "pending" })));

    // One at a time: simple, keeps the server calm, and each row fills in as it finishes.
    for (let i = 0; i < batch.length; i++) {
      if (stopped.current) return;
      let update;
      try {
        const result = await api.predictUrl(batch[i]);
        update = { status: "done", result };
      } catch (err) {
        update = { status: "error", error: err.message };
      }
      if (stopped.current) return;
      setRows((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...update } : row)));
    }
    setRunning(false);
  }

  const done = rows.filter((r) => r.status !== "pending").length;
  const counts = { dangerous: 0, suspicious: 0, safe: 0 };
  for (const r of rows) {
    if (r.status === "done") counts[normalizeTier(r.result.risk_tier, r.result.risk_score)] += 1;
  }

  return (
    <div>
      <BackLink />
      <h1 className="font-display text-2xl font-semibold text-textPrimary">{t("bulk.title")}</h1>
      <p className="mt-1 text-sm text-textSecondary">{t("bulk.subtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          rows={7}
          spellCheck={false}
          placeholder={t("bulk.placeholder")}
          className="w-full rounded-md border border-hairline bg-surface px-3 py-2 font-mono text-sm text-textPrimary outline-none focus:border-brand"
        />
        {tooMany && <p className="text-xs text-suspicious">{t("bulk.tooMany")}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={running || links.length === 0}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {running ? t("bulk.progress", { done, total: rows.length }) : t("bulk.button")}
          </button>
          {(text || rows.length > 0) && (
            <button
              type="button"
              onClick={handleClear}
              disabled={running}
              className="rounded-md border border-hairline px-4 py-2 text-sm text-textSecondary transition-colors hover:text-textPrimary disabled:opacity-60"
            >
              {t("common.clear")}
            </button>
          )}
        </div>
      </form>

      {rows.length > 0 && (
        <div className="mt-6">
          {!running && (
            <p className="mb-2 text-sm text-textPrimary">
              {t("bulk.summary", {
                total: rows.length,
                danger: counts.dangerous,
                warn: counts.suspicious,
                safe: counts.safe,
              })}
            </p>
          )}
          <p className="mb-2 text-xs text-textSecondary">{t("bulk.tip")}</p>
          <div className="overflow-x-auto rounded-md border border-hairline">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="bg-surface text-textSecondary">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("bulk.link")}</th>
                  <th className="px-4 py-3 font-medium">{t("history.result")}</th>
                  <th className="px-4 py-3 font-medium">{t("history.score")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const tier =
                    row.status === "done" ? normalizeTier(row.result.risk_tier, row.result.risk_score) : null;
                  const clickable = row.status === "done";
                  return (
                    <tr
                      key={`${i}-${row.url}`}
                      tabIndex={clickable ? 0 : undefined}
                      role={clickable ? "button" : undefined}
                      onClick={clickable ? () => setSelected(row.result) : undefined}
                      onKeyDown={
                        clickable
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelected(row.result);
                              }
                            }
                          : undefined
                      }
                      className={`border-t border-hairline bg-ink ${
                        clickable ? "cursor-pointer transition-colors hover:bg-surface focus:bg-surface focus:outline-none" : ""
                      }`}
                    >
                      <td className="max-w-xs break-all px-4 py-3 font-mono text-xs text-textPrimary">
                        {row.url}
                      </td>
                      <td className="px-4 py-3">
                        {row.status === "pending" && <span className="text-textSecondary">…</span>}
                        {row.status === "error" && (
                          <span className="text-dangerous" title={row.error}>
                            {t("bulk.failed")}
                          </span>
                        )}
                        {tier && (
                          <span className="inline-flex items-center gap-2 text-textPrimary">
                            <span className={`h-1.5 w-1.5 rounded-full ${TIER_DOT[tier]}`} />
                            {t(`tier.${tier}`)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-textSecondary">
                        {row.status === "done" ? row.result.risk_score : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && <ScanDetailModal result={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
