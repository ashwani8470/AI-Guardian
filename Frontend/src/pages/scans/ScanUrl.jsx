import { useState } from "react";
import { api } from "../../api/client";
import BackLink from "../../components/BackLink";
import { useT } from "../../i18n";
import ExampleChips from "../../components/ExampleChips";
import ScanLoadingSteps from "../../components/ScanLoadingSteps";
import ScanVerdict from "../../components/ScanVerdict";

const EXAMPLES = [
  { labelKey: "ex.phishLink", url: "http://paytm-kyc-verify.top/update" },
  { labelKey: "ex.normalLink", url: "https://github.com/" },
];

export default function ScanUrl() {
  const t = useT();
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleClear() {
    setUrl("");
    setResult(null);
    setError("");
  }

  function handleExample(ex) {
    setUrl(ex.url);
    setResult(null);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await api.predictUrl(url);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <BackLink />
      <h1 className="font-display text-2xl font-semibold text-textPrimary">{t("url.title")}</h1>
      <p className="mt-1 text-sm text-textSecondary">
        {t("url.subtitle")}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <ExampleChips examples={EXAMPLES} onPick={handleExample} disabled={loading} />
        <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          placeholder="https://example.com/…"
          className="flex-1 rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? t("common.checking") : t("url.button")}
        </button>
        {(url || result || error) && (
            <button type="button" onClick={handleClear} disabled={loading} className="rounded-md border border-hairline px-4 py-2 text-sm text-textSecondary transition-colors hover:text-textPrimary disabled:opacity-60">
              {t("common.clear")}
            </button>
          )}
        </div>
      </form>

      {error && <p className="mt-4 text-sm text-dangerous">{error}</p>}

      {loading && (
        <div className="mt-6">
          <ScanLoadingSteps
            steps={[t("steps.readUrl"), t("steps.knownPatterns"), t("steps.score")]}
          />
        </div>
      )}

      {result && !loading && (
        <div className="mt-6">
          <ScanVerdict result={result} />
        </div>
      )}
    </div>
  );
}