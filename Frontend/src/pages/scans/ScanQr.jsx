import { useState } from "react";
import { api, fileToBase64 } from "../../api/client";
import BackLink from "../../components/BackLink";
import { useT } from "../../i18n";
import ScanLoadingSteps from "../../components/ScanLoadingSteps";
import RiskResult from "../../components/RiskResult";
import ImageDropInput from "../../components/ImageDropInput";

export default function ScanQr() {
  const t = useT();
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleClear() {
    setFile(null);
    setResult(null);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const data = await api.predictQr(base64);
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
      <h1 className="font-display text-2xl font-semibold text-textPrimary">{t("qr.title")}</h1>
      <p className="mt-1 text-sm text-textSecondary">
        {t("qr.subtitle")}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <ImageDropInput
          file={file}
          onChange={(f) => {
            setFile(f);
            setResult(null); // a new/removed image makes the old result stale
            setError("");
          }}
        />
        <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || !file}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? t("common.checking") : t("qr.button")}
        </button>
        {(file || result || error) && (
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
            steps={[
              t("steps.upload"),
              t("steps.decodeQr"),
              t("steps.linkInside"),
              t("steps.score"),
            ]}
          />
        </div>
      )}

      {result && !loading && (
        <div className="mt-6">
          <RiskResult result={result} />
        </div>
      )}
    </div>
  );
}