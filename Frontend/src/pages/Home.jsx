import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ShieldMark from "../components/ShieldMark";

const FEATURES = [
  { label: "Text & SMS" },
  { label: "Email" },
  { label: "Links & URLs" },
  { label: "QR codes" },
  { label: "Payment screenshots" },
];

export default function Home() {
  const { startGuest, isAuthed } = useAuth();
  const navigate = useNavigate();

  function trySampleMode() {
    startGuest();
    navigate("/app");
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink px-4">
      {/* Soft brand glow behind the hero content */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-hairline bg-surface shadow-lg shadow-black/20">
          <ShieldMark size={32} className="text-brand" glow />
        </div>

        <h1 className="mt-6 font-display text-3xl font-semibold text-textPrimary">
          AI Guardian
        </h1>
        <p className="mt-2 text-sm text-textSecondary">
          Your first check before you click, pay, or reply — spot scams in
          texts, emails, links, QR codes, and payment screenshots.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {FEATURES.map((f) => (
            <span
              key={f.label}
              className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs text-textSecondary"
            >
              {f.label}
            </span>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/login"
            className="flex-1 rounded-md bg-brand py-2.5 text-sm font-medium text-ink transition-opacity hover:opacity-90"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="flex-1 rounded-md border border-hairline bg-surface py-2.5 text-sm font-medium text-textPrimary transition-colors hover:border-brand/50 hover:text-brand"
          >
            Create an account
          </Link>
        </div>

        {/* Sample mode: opens the app without an account, limited to a few example scans. */}
        {!isAuthed && (
          <div className="mt-5">
            <button
              type="button"
              onClick={trySampleMode}
              className="w-full rounded-md border border-dashed border-brand/50 bg-brand/5 py-2.5 text-sm font-medium text-brand transition-colors hover:bg-brand/10"
            >
              Try sample mode — no login needed
            </button>
            <p className="mt-2 text-xs text-textSecondary">
              Run 3 free example scans (safe, in-between and risky) to see how it works.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
