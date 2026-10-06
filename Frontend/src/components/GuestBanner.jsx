import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n";

// Strip shown at the top of the app in sample mode: how many free scans are left.
export default function GuestBanner() {
  const { isGuest, guestUsed, guestLimit, guestLocked } = useAuth();
  const t = useT();
  if (!isGuest) return null;

  const left = Math.max(0, guestLimit - guestUsed);
  return (
    <div
      className={`mb-6 flex flex-col gap-3 rounded-lg border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
        guestLocked ? "border-dangerous/40 bg-dangerous/10" : "border-brand/30 bg-brand/10"
      }`}
    >
      <div>
        <p className="font-medium text-textPrimary">
          {guestLocked ? t("guest.bannerLast") : t("guest.banner", { left, limit: guestLimit })}
        </p>
        <p className="mt-0.5 text-xs text-textSecondary">
          {guestLocked ? t("guest.bannerLastHint") : t("guest.bannerHint")}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link to="/login" className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-ink hover:opacity-90">
          {t("nav.login")}
        </Link>
        <Link
          to="/signup"
          className="rounded-md border border-hairline px-3 py-1.5 text-xs font-medium text-textPrimary hover:border-brand/50 hover:text-brand"
        >
          {t("nav.signup")}
        </Link>
      </div>
    </div>
  );
}
