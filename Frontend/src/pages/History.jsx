import { useEffect, useState } from "react";
import { api } from "../api/client";
import ScanDetailModal from "../components/ScanDetailModal";
import { useT } from "../i18n";
import { usePrefs } from "../context/PrefsContext";
import { formatServerDate } from "../utils/dates";
import { normalizeTier } from "../utils/verdict";

const TIER_DOT = {
  safe: "bg-safe",
  suspicious: "bg-suspicious",
  dangerous: "bg-dangerous",
};

export default function History() {
  const t = useT();
  const { lang } = usePrefs();
  const [scans, setScans] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api
      .getHistory()
      .then((data) => setScans(data.scans || data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-textPrimary">{t("history.title")}</h1>
      <p className="mt-1 text-sm text-textSecondary">{t("history.subtitle")}</p>

      {loading && <p className="mt-6 text-sm text-textSecondary">{t("common.loading")}</p>}
      {error && <p className="mt-6 text-sm text-dangerous">{error}</p>}

      {!loading && !error && scans.length === 0 && (
        <p className="mt-6 text-sm text-textSecondary">{t("history.empty")}</p>
      )}

      {!loading && scans.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-md border border-hairline">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="bg-surface text-textSecondary">
              <tr>
                <th className="px-4 py-3 font-medium">{t("history.type")}</th>
                <th className="px-4 py-3 font-medium">{t("history.result")}</th>
                <th className="px-4 py-3 font-medium">{t("history.score")}</th>
                <th className="px-4 py-3 font-medium">{t("history.when")}</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan, i) => {
                const tier = normalizeTier(scan.risk_tier, scan.risk_score);
                const modality = scan.modality || scan.scan_type || scan.type;
                return (
                  <tr
                    key={scan.scan_id || scan.id || i}
                    tabIndex={0}
                    role="button"
                    onClick={() => setSelected(scan)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(scan);
                      }
                    }}
                    className="cursor-pointer border-t border-hairline bg-ink transition-colors hover:bg-surface focus:bg-surface focus:outline-none"
                  >
                    <td className="px-4 py-3 text-textPrimary">{t(`type.${modality}`)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 text-textPrimary">
                        <span className={`h-1.5 w-1.5 rounded-full ${TIER_DOT[tier] || TIER_DOT.suspicious}`} />
                        {t(`tier.${tier}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-textSecondary">{scan.risk_score ?? "—"}</td>
                    <td className="px-4 py-3 text-textSecondary">
                      {formatServerDate(scan.created_at || scan.timestamp, lang)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && <ScanDetailModal result={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
