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
    labelKey: "ex.suspended",
    subject: "Urgent: Your account has been suspended",
    body: "Dear user, we detected unusual activity. Your account will be closed within 24 hours unless you verify your password here: http://secure-login-verify.top/account. Failure to act will result in permanent suspension.",
  },
  {
    labelKey: "ex.normalEmail",
    subject: "Assignment submission reminder",
    body: "Hi all, a reminder that the DBMS assignment is due on Friday. Please upload your PDF on the portal before 5 pm. Thanks.",
  },
];

export default function ScanEmail() {
  const t = useT();
  const { isGuest, guestScan, guestLocked, openLimitModal } = useAuth();
  const demo = useDemoExamples("email", isGuest);
  const [picked, setPicked] = useState(null); // sample-mode example currently in the box
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleClear() {
    setSubject("");
    setBody("");
    setPicked(null);
    setResult(null);
    setError("");
  }

  function handleExample(ex) {
    setSubject(ex.subject);
    setBody(ex.body);
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
      const data = isGuest ? await guestScan("email", picked.id) : await api.predictEmail({ subject, body });
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
      <h1 className="font-display text-2xl font-semibold text-textPrimary">{t("email.title")}</h1>
      <p className="mt-1 text-sm text-textSecondary">
        {t("email.subtitle")}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          type="text"
          value={subject}
          readOnly={isGuest}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t("email.subject")}
          className="w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required={!isGuest}
          readOnly={isGuest}
          rows={6}
          placeholder={isGuest ? t("demo.placeholder") : t("email.placeholder")}
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
            {loading ? t("common.checking") : t("email.button")}
          </button>
          {(subject || body || result || error) && (
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
            steps={[t("steps.readEmail"), t("steps.wording"), t("steps.score")]}
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