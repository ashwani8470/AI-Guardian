import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import ShieldMark from "./ShieldMark";
import { useAuth } from "../context/AuthContext";

function linkClasses(collapsed) {
  return ({ isActive }) =>
    [
      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
      collapsed ? "justify-center px-2" : "",
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

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/", { replace: true }); // back to the main landing page
  }
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={[
        "flex h-full shrink-0 flex-col border-r border-hairline bg-surface transition-all duration-200",
        collapsed ? "w-16" : "w-60",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-5">
        <div className="flex items-center gap-2 overflow-hidden">
          <ShieldMark className="text-brand shrink-0" glow />
          {!collapsed && (
            <span className="font-display text-base font-semibold text-textPrimary whitespace-nowrap">
              AI Guardian
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-textSecondary transition-colors hover:bg-surfaceRaised/60 hover:text-textPrimary"
        >
          <ToggleIcon collapsed={collapsed} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        <NavLink to="/app" end className={linkClasses(collapsed)} title="Overview">
          <OverviewIcon />
          {!collapsed && <span>Overview</span>}
        </NavLink>
        <NavLink to="/app/account" className={linkClasses(collapsed)} title="My account">
          <AccountIcon />
          {!collapsed && <span>My account</span>}
        </NavLink>
        <NavLink to="/app/history" className={linkClasses(collapsed)} title="History">
          <HistoryIcon />
          {!collapsed && <span>History</span>}
        </NavLink>
      </nav>

      <div className="border-t border-hairline p-3">
        <button
          onClick={handleLogout}
          title="Log out"
          className={[
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-textSecondary transition-colors hover:bg-surfaceRaised/60 hover:text-textPrimary",
            collapsed ? "justify-center px-2" : "text-left",
          ].join(" ")}
        >
          <LogoutIcon />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
