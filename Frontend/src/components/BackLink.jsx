import { Link } from "react-router-dom";
import { useT } from "../i18n";

// Small "← Overview" link shown at the top of every scan page so the user
// can always get back to the main dashboard.
export default function BackLink({ to = "/app", label }) {
  const t = useT();
  return (
    <Link
      to={to}
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-textSecondary transition-colors hover:text-textPrimary"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 6l-6 6 6 6" />
      </svg>
      <span>{label || t("nav.overview")}</span>
    </Link>
  );
}
