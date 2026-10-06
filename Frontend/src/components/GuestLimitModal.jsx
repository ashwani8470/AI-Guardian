import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n";

// Full-screen block shown once the free sample scans are used up. It has no
// close button on purpose: nothing else works in sample mode until the visitor
// logs in or creates an account.
export default function GuestLimitModal() {
  const { isGuest, guestLocked, limitModalOpen, guestLimit, endGuest } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  if (!isGuest || !guestLocked || !limitModalOpen) return null;

  function backToHome() {
    endGuest();
    navigate("/", { replace: true });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-limit-title"
    >
      <div className="w-full max-w-md rounded-xl border border-hairline bg-surface p-8 text-center shadow-2xl">
        <h2 id="guest-limit-title" className="font-display text-xl font-semibold text-textPrimary">
          {t("guest.modal.title")}
        </h2>
        <p className="mt-3 text-sm text-textSecondary">{t("guest.modal.body", { limit: guestLimit })}</p>
        <div className="mt-6 flex flex-col gap-3">
          <Link to="/signup" className="rounded-md bg-brand py-2.5 text-sm font-medium text-ink hover:opacity-90">
            {t("nav.signup")}
          </Link>
          <Link
            to="/login"
            className="rounded-md border border-hairline py-2.5 text-sm font-medium text-textPrimary hover:border-brand/50 hover:text-brand"
          >
            {t("nav.login")}
          </Link>
        </div>
        <button type="button" onClick={backToHome} className="mt-5 text-xs text-textSecondary hover:text-textPrimary">
          {t("guest.modal.home")}
        </button>
      </div>
    </div>
  );
}
