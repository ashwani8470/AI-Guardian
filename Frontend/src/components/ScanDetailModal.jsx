import { useEffect } from "react";
import ScanVerdict from "./ScanVerdict";
import { useT } from "../i18n";
import { usePrefs } from "../context/PrefsContext";
import { formatServerDate } from "../utils/dates";

// Popup showing one scan's full verdict (used by History and Bulk check).
export default function ScanDetailModal({ result, onClose }) {
  const t = useT();
  const { lang } = usePrefs();

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!result) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("history.details")}
    >
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-hairline bg-ink p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-textPrimary">
              {t(`type.${result.modality}`)}
            </h2>
            {(result.created_at || result.timestamp) && (
              <p className="text-xs text-textSecondary">
                {formatServerDate(result.created_at || result.timestamp, lang)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            title={t("common.close")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-textSecondary hover:bg-surfaceRaised/60 hover:text-textPrimary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <ScanVerdict result={result} showScanned />
      </div>
    </div>
  );
}
