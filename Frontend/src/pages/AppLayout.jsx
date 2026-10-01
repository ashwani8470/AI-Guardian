import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ShieldMark from "../components/ShieldMark";
import { useT } from "../i18n";

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const t = useT();

  return (
    <div className="flex h-screen bg-ink">
      {/* Phone only: dim the page behind the open menu; tap to close. */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        {/* Phone only: top bar with the menu button (the sidebar is a drawer there). */}
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-hairline bg-ink/95 px-4 py-3 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t("nav.openMenu")}
            className="flex h-8 w-8 items-center justify-center rounded text-textSecondary hover:bg-surfaceRaised/60 hover:text-textPrimary"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <ShieldMark size={20} className="text-brand" />
          <span className="font-display text-base font-semibold text-textPrimary">AI Guardian</span>
        </div>
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
