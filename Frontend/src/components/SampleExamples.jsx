import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n";

const TONE = {
  safe: { box: "border-safe/40 hover:bg-safe/10", dot: "bg-safe", label: "demo.safe" },
  middle: { box: "border-suspicious/40 hover:bg-suspicious/10", dot: "bg-suspicious", label: "demo.middle" },
  risky: { box: "border-dangerous/40 hover:bg-dangerous/10", dot: "bg-dangerous", label: "demo.risky" },
};

// Sample mode: three clickable examples per feature - one safe, one in the
// middle (suspicious) and one risky. Picking one fills the input box above;
// the visitor then presses the normal check button.
export default function SampleExamples({ examples, loading, error, selectedId, onPick, disabled }) {
  const t = useT();
  const { guestLocked, openLimitModal } = useAuth();

  return (
    <div>
      <p className="text-xs text-textSecondary">{t("demo.pick")}</p>
      {loading && <p className="mt-2 text-xs text-textSecondary">{t("demo.loading")}</p>}
      {error && <p className="mt-2 text-xs text-dangerous">{error}</p>}
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {examples.map((ex) => {
          const tone = TONE[ex.tone] || TONE.middle;
          const active = selectedId === ex.id;
          const key = `demo.title.${ex.id}`;
          const caption = t(key) === key ? ex.title : t(key);
          return (
            <button
              key={ex.id}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => (guestLocked ? openLimitModal() : onPick(ex))}
              className={`rounded-lg border bg-surface px-3 py-2.5 text-left transition-colors disabled:opacity-60 ${tone.box} ${
                active ? "ring-2 ring-brand/60" : ""
              }`}
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-textPrimary">
                <span className={`h-2 w-2 rounded-full ${tone.dot}`} aria-hidden="true" />
                {t(tone.label)}
              </span>
              <span className="mt-1 block text-xs text-textSecondary">{caption}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
