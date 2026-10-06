import { useState } from "react";
import { api } from "../../api/client";
import BackLink from "../../components/BackLink";
import { useT } from "../../i18n";
import ExampleChips from "../../components/ExampleChips";
import ScanLoadingSteps from "../../components/ScanLoadingSteps";
import ScanVerdict from "../../components/ScanVerdict";
import { useAuth } from "../../context/AuthContext";
import SampleExamples from "../../components/SampleExamples";
import { useDemoExamples } from "../../utils/demo";

const EXAMPLES = [
  { labelKey: "ex.phishLink", url: "http://paytm-kyc-verify.top/update" },
  { labelKey: "ex.normalLink", url: "https://github.com/" },
];

export default function ScanUrl() {
  const t = useT();
  const { isGuest, guestScan, guestLocked, openLimitModal } = useAuth();
  const demo = useDemoExamples("url", isGuest);
  const [picked, setPicked] = useState(null); // sample-mode example currently in the box
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleClear() {
    setUrl("");
    setPicked(null);
    setResult(null);
    setError("");
  }

  function handleExample(ex) {
    setUrl(ex.url);
    setPicked(ex);
    setResult(null);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isGuest && !picked) return;
    if (guestLocked) {
      openLimitModal();
      return;
    }
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = isGuest ? await guestScan("url", picked.id) : await api.predictUrl(url);
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
        {isGuest ? (
          <SampleExamples {...demo} selectedId={picked?.id} onPick={handleExample} disabled={loading} />
        ) : (
          <ExampleChips examples={EXAMPLES} onPick={handleExample} disabled={loading} />
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required={!isGuest}
          readOnly={isGuest}
          placeholder={isGuest ? t("demo.placeholder") : "https://example.com/…"}
          className="flex-1 rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={loading || (isGuest && !picked)}
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