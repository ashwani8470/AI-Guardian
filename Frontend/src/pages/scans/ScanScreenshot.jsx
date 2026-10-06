import { useState } from "react";
import { api, fileToBase64 } from "../../api/client";
import BackLink from "../../components/BackLink";
import { useT } from "../../i18n";
import ScanLoadingSteps from "../../components/ScanLoadingSteps";
import RiskResult from "../../components/RiskResult";
import ImageDropInput from "../../components/ImageDropInput";
import { useAuth } from "../../context/AuthContext";
import SampleExamples from "../../components/SampleExamples";
import { useDemoExamples, base64ToFile } from "../../utils/demo";

export default function ScanScreenshot() {
  const t = useT();
  const { isGuest, guestScan, guestLocked, openLimitModal } = useAuth();
  const demo = useDemoExamples("screenshot", isGuest);
  const [picked, setPicked] = useState(null); // sample-mode example currently shown
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleClear() {
    setFile(null);
    setPicked(null);
    setResult(null);
    setError("");
  }

  function handleExample(ex) {
    setPicked(ex);
    setFile(base64ToFile(ex.image_base64, `sample-screenshot-${ex.tone}.png`));
    setResult(null);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    if (guestLocked) {
      openLimitModal();
      return;
    }
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = isGuest
        ? await guestScan("screenshot", picked.id)
        : await api.predictScreenshot(await fileToBase64(file));
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
      <h1 className="font-display text-2xl font-semibold text-textPrimary">{t("shot.title")}</h1>
      <p className="mt-1 text-sm text-textSecondary">
        {t("shot.subtitle")}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <ImageDropInput
          file={file}
          readOnly={isGuest}
          emptyHint={t("demo.imageHint")}
          onChange={(f) => {
            if (isGuest) setPicked(null);
            setFile(f);
            setResult(null); // a new/removed image makes the old result stale
            setError("");
          }}
        />
        {isGuest && (
          <SampleExamples {...demo} selectedId={picked?.id} onPick={handleExample} disabled={loading} />
        )}
        <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || !file}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? t("common.checking") : t("shot.button")}
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
              t("steps.extract"),
              t("steps.classifier"),
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