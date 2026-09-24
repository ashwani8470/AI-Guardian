import { NavLink } from "react-router-dom";
import ShieldMark from "./ShieldMark";
import { useAuth } from "../context/AuthContext";

function linkClasses({ isActive }) {
  return [
    "block rounded-md px-3 py-2 text-sm transition-colors",
    isActive
      ? "bg-surfaceRaised text-textPrimary"
      : "text-textSecondary hover:bg-surfaceRaised/60 hover:text-textPrimary",
  ].join(" ");
}

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-hairline bg-surface">
      <div className="flex items-center gap-2 px-4 py-5">
        <ShieldMark className="text-brand" glow />
        <span className="font-display text-base font-semibold text-textPrimary">AI Guardian</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        <NavLink to="/app" end className={linkClasses}>
          Overview
        </NavLink>
        <NavLink to="/app/account" className={linkClasses}>
          My account
        </NavLink>
        <NavLink to="/app/history" className={linkClasses}>
          History
        </NavLink>
      </nav>

      <div className="border-t border-hairline p-3">
        <button
          onClick={logout}
          className="w-full rounded-md px-3 py-2 text-left text-sm text-textSecondary transition-colors hover:bg-surfaceRaised/60 hover:text-textPrimary"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
