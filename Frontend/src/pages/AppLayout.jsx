import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ShieldMark from "../components/ShieldMark";
import GuestBanner from "../components/GuestBanner";
import GuestLimitModal from "../components/GuestLimitModal";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n";

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const t = useT();
  const { isGuest, guestLocked, openLimitModal } = useAuth();
  const { pathname } = useLocation();

  // Once the free sample scans are used up, the visitor may still read the last
  // result - but the moment they go anywhere else, the login/sign-up wall appears.
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (isGuest && guestLocked && lastPath.current !== pathname) openLimitModal();
    lastPath.current = pathname;
  }, [pathname, isGuest, guestLocked, openLimitModal]);
  // Re-entering sample mode with no tries left shows the wall straight away.
  useEffect(() => {
    if (isGuest && guestLocked) openLimitModal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest]);

  return (
    <div className="flex h-screen bg-ink">
      <GuestLimitModal />
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
          <GuestBanner />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
