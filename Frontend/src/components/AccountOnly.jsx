import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n";

// Wraps pages that make no sense without an account (history, account settings,
// bulk checks). Sample-mode visitors see a prompt to log in instead.
export default function AccountOnly({ children }) {
  const { isGuest } = useAuth();
  const t = useT();
  if (!isGuest) return children;

  return (
    <div className="rounded-lg border border-hairline bg-surface p-8 text-center">
      <h1 className="font-display text-xl font-semibold text-textPrimary">{t("guest.lockedTitle")}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-textSecondary">{t("guest.lockedBody")}</p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/login" className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-ink hover:opacity-90">
          {t("nav.login")}
        </Link>
        <Link
          to="/signup"
          className="rounded-md border border-hairline px-5 py-2 text-sm font-medium text-textPrimary hover:border-brand/50 hover:text-brand"
        >
          {t("nav.signup")}
        </Link>
      </div>
    </div>
  );
}
