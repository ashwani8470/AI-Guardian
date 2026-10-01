import { useT } from "../i18n";
import { usePrefs } from "../context/PrefsContext";

// One-click sample inputs so people can try the scanner without hunting for
// a real scam message. Picking an example only fills the input; the user still
// presses the check button. Hidden in simple mode (fewer options).
// Each example has a `labelKey` (translated) plus its own payload.
export default function ExampleChips({ examples, onPick, disabled }) {
  const t = useT();
  const { simple } = usePrefs();
  if (simple) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-textSecondary">{t("examples.try")}</span>
      {examples.map((ex) => (
        <button
          key={ex.labelKey}
          type="button"
          disabled={disabled}
          onClick={() => onPick(ex)}
          className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs text-textSecondary transition-colors hover:border-brand/50 hover:text-brand disabled:opacity-60"
        >
          {t(ex.labelKey)}
        </button>
      ))}
    </div>
  );
}
