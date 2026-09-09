import { useEffect, useState } from "react";
import { api } from "../api/client";

const TIER_DOT = {
  safe: "bg-safe",
  suspicious: "bg-suspicious",
  dangerous: "bg-dangerous",
};

export default function History() {
  const [scans, setScans] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getHistory()
      .then((data) => setScans(data.scans || data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-textPrimary">Scan history</h1>
      <p className="mt-1 text-sm text-textSecondary">Everything you've checked, most recent first.</p>

      {loading && <p className="mt-6 text-sm text-textSecondary">Loading…</p>}
      {error && <p className="mt-6 text-sm text-dangerous">{error}</p>}

      {!loading && !error && scans.length === 0 && (
        <p className="mt-6 text-sm text-textSecondary">
          Nothing checked yet — run a scan from the sidebar to see it here.
        </p>
      )}

      {!loading && scans.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-md border border-hairline">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-textSecondary">
              <tr>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Result</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan, i) => {
                const tier = (scan.risk_tier || "suspicious").toLowerCase();
                return (
                  <tr key={scan.id || i} className="border-t border-hairline bg-ink">
                    <td className="px-4 py-3 text-textPrimary">{scan.scan_type || scan.type}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 text-textPrimary">
                        <span className={`h-1.5 w-1.5 rounded-full ${TIER_DOT[tier] || TIER_DOT.suspicious}`} />
                        {tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-textSecondary">{scan.risk_score ?? "—"}</td>
                    <td className="px-4 py-3 text-textSecondary">
                      {scan.timestamp ? new Date(scan.timestamp).toLocaleString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
