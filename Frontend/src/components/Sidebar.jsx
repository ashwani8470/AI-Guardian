import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import ShieldMark from "./ShieldMark";
import { useAuth } from "../context/AuthContext";
import { usePrefs } from "../context/PrefsContext";
import { useT } from "../i18n";

function linkClasses(collapsed) {
  return ({ isActive }) =>
    [
      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
      collapsed ? "md:justify-center md:px-2" : "",
      isActive
        ? "bg-surfaceRaised text-textPrimary"
        : "text-textSecondary hover:bg-surfaceRaised/60 hover:text-textPrimary",
    ].join(" ");
}

// Small inline icons (no new dependency) — one per nav item plus the toggle.
function OverviewIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function ToggleIcon({ collapsed }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={collapsed ? "rotate-180" : ""}
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const { logout } = useAuth();
  const t = useT();
  const { simple, setSimple, lang, setLang } = usePrefs();
  const navigate = useNavigate();

  function handleLogout() {
    onClose();
    logout();
    navigate("/", { replace: true }); // back to the main landing page
  }
  const [collapsed, setCollapsed] = useState(false); // desktop-only; the phone drawer is always full width

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r border-hairline bg-surface transition-all duration-200",
        "md:static md:z-auto md:h-full md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        collapsed ? "md:w-16" : "md:w-60",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-5">
        <div className="flex items-center gap-2 overflow-hidden">
          <ShieldMark className="text-brand shrink-0" glow />
          <span
            className={`font-display text-base font-semibold text-textPrimary whitespace-nowrap ${
              collapsed ? "md:hidden" : ""
            }`}
          >
            AI Guardian
          </span>
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? t("nav.expand") : t("nav.collapse")}
          className="hidden h-6 w-6 shrink-0 items-center justify-center rounded text-textSecondary transition-colors hover:bg-surfaceRaised/60 hover:text-textPrimary md:flex"
        >
          <ToggleIcon collapsed={collapsed} />
        </button>
        <button
          onClick={onClose}
          title={t("nav.closeMenu")}
          aria-label={t("nav.closeMenu")}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-textSecondary transition-colors hover:bg-surfaceRaised/60 hover:text-textPrimary md:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        <NavLink to="/app" end onClick={onClose} className={linkClasses(collapsed)} title={t("nav.overview")}>
          <OverviewIcon />
          <span className={collapsed ? "md:hidden" : ""}>{t("nav.overview")}</span>
        </NavLink>
        <NavLink to="/app/account" onClick={onClose} className={linkClasses(collapsed)} title={t("nav.account")}>
          <AccountIcon />
          <span className={collapsed ? "md:hidden" : ""}>{t("nav.account")}</span>
        </NavLink>
        <NavLink to="/app/history" onClick={onClose} className={linkClasses(collapsed)} title={t("nav.history")}>
          <HistoryIcon />
          <span className={collapsed ? "md:hidden" : ""}>{t("nav.history")}</span>
        </NavLink>
      </nav>

      <div className="space-y-1 border-t border-hairline p-3">
        <button
          type="button"
          onClick={() => setSimple(!simple)}
          aria-pressed={simple}
          title={t("nav.simple")}
          className={[
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
            simple ? "bg-brand/15 text-brand" : "text-textSecondary hover:bg-surfaceRaised/60 hover:text-textPrimary",
            collapsed ? "md:justify-center md:px-2" : "",
          ].join(" ")}
        >
          <span className="flex h-[18px] w-[18px] items-center justify-center text-sm font-semibold leading-none">Aa</span>
          <span className={collapsed ? "md:hidden" : ""}>{simple ? t("nav.simpleOn") : t("nav.simple")}</span>
        </button>
        <button
          type="button"
          onClick={() => setLang(lang === "hi" ? "en" : "hi")}
          title={t("nav.language")}
          className={[
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-textSecondary transition-colors hover:bg-surfaceRaised/60 hover:text-textPrimary",
            collapsed ? "md:justify-center md:px-2" : "",
          ].join(" ")}
        >
          <span className="flex h-[18px] w-[18px] items-center justify-center text-sm font-semibold leading-none">अ</span>
          <span className={collapsed ? "md:hidden" : ""}>{t("nav.language")}</span>
        </button>
        <button
          onClick={handleLogout}
          title={t("nav.logout")}
          className={[
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-textSecondary transition-colors hover:bg-surfaceRaised/60 hover:text-textPrimary",
            collapsed ? "md:justify-center md:px-2" : "text-left",
          ].join(" ")}
        >
          <LogoutIcon />
          <span className={collapsed ? "md:hidden" : ""}>{t("nav.logout")}</span>
        </button>
      </div>
    </aside>
  );
}
