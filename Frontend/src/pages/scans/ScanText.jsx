import { useState } from "react";
import { api } from "../../api/client";
import BackLink from "../../components/BackLink";
import { useT } from "../../i18n";
import ExampleChips from "../../components/ExampleChips";
import ScanLoadingSteps from "../../components/ScanLoadingSteps";
import RiskResult from "../../components/RiskResult";
import { useAuth } from "../../context/AuthContext";
import SampleExamples from "../../components/SampleExamples";
import { useDemoExamples } from "../../utils/demo";

const EXAMPLES = [
  {
    labelKey: "ex.bank",
    text: "URGENT: Your SBI account is blocked. Update your KYC now or your account will be closed. Click http://sbi-kyc-update.top/verify and share your OTP.",
  },
  {
    labelKey: "ex.prize",
    text: "Congratulations! You have won Rs 25,00,000 in the lucky draw. Claim your prize now by sending your bank details and OTP.",
  },
  {
    labelKey: "ex.normalMsg",
    text: "Hey, are we still meeting at 6 pm? I'll be at the canteen near the library.",
  },
];

export default function ScanText() {
  const t = useT();
  const { isGuest, guestScan, guestLocked, openLimitModal } = useAuth();
  const demo = useDemoExamples("text", isGuest);
  const [picked, setPicked] = useState(null); // sample-mode example currently in the box
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleClear() {
    setText("");
    setPicked(null);
    setResult(null);
    setError("");
  }

  function handleExample(ex) {
    setText(ex.text);
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
      const data = isGuest ? await guestScan("text", picked.id) : await api.predictText(text);
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
      <h1 className="font-display text-2xl font-semibold text-textPrimary">{t("text.title")}</h1>
      <p className="mt-1 text-sm text-textSecondary">
        {t("text.subtitle")}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          required={!isGuest}
          readOnly={isGuest}
          rows={6}
          placeholder={isGuest ? t("demo.placeholder") : t("text.placeholder")}
          className="w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand"
        />
        {isGuest ? (
          <SampleExamples {...demo} selectedId={picked?.id} onPick={handleExample} disabled={loading} />
        ) : (
          <ExampleChips examples={EXAMPLES} onPick={handleExample} disabled={loading} />
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || (isGuest && !picked)}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? t("common.checking") : t("text.button")}
          </button>
          {(text || result || error) && (
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
            steps={[t("steps.readMessage"), t("steps.patterns"), t("steps.score")]}
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