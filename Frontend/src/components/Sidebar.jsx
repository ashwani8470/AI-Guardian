import { NavLink } from "react-router-dom";
import ShieldMark from "./ShieldMark";
import { useAuth } from "../context/AuthContext";

const SCAN_LINKS = [
  { to: "/app/scan/text", label: "Text & SMS" },
  { to: "/app/scan/email", label: "Email" },
  { to: "/app/scan/url", label: "Links & URLs" },
  { to: "/app/scan/qr", label: "QR codes" },
  { to: "/app/scan/screenshot", label: "Payment screenshot" },
];

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
        <ShieldMark className="text-brand" />
        <span className="font-display text-base font-semibold text-textPrimary">AI Guardian</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        <NavLink to="/app" end className={linkClasses}>
          Overview
        </NavLink>

        <p className="mt-4 px-3 text-xs font-medium uppercase tracking-wide text-textSecondary/70">
          Scan
        </p>
        {SCAN_LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} className={linkClasses}>
            {link.label}
          </NavLink>
        ))}

        <p className="mt-4 px-3 text-xs font-medium uppercase tracking-wide text-textSecondary/70">
          Activity
        </p>
        <NavLink to="/app/history" className={linkClasses}>
          Scan history
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
