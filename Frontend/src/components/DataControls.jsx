import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n";

const BTN =
  "rounded-md border px-4 py-2 text-sm transition-colors disabled:opacity-60";

// "Your data" card on the Account page: download history as CSV, delete the
// scan history, or delete the whole account (password required).
export default function DataControls() {
  const t = useT();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null); // null | "history" | "account"
  const [password, setPassword] = useState("");

  function closeConfirm() {
    setConfirm(null);
    setPassword("");
    setError("");
  }

  async function handleDownload() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const blob = await api.downloadHistoryCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ai-guardian-history.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (confirm === "history") {
        await api.deleteHistory();
        closeConfirm();
        setMessage(t("account.historyDeleted"));
      } else {
        await api.deleteAccount(password);
        logout();
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 max-w-md rounded-md border border-hairline bg-surface p-5">
      <h2 className="font-display text-base font-semibold text-textPrimary">{t("account.data")}</h2>
      <p className="mt-1 text-sm text-textSecondary">{t("account.dataBody")}</p>

      <div className="mt-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleDownload}
          disabled={busy}
          className={`${BTN} border-hairline text-textPrimary hover:border-brand/50`}
        >
          {busy && !confirm ? t("account.downloading") : t("account.download")}
        </button>
        <button
          type="button"
          onClick={() => setConfirm("history")}
          disabled={busy}
          className={`${BTN} border-hairline text-textSecondary hover:text-textPrimary`}
        >
          {t("account.deleteHistory")}
        </button>
        <button
          type="button"
          onClick={() => setConfirm("account")}
          disabled={busy}
          className={`${BTN} border-dangerous/50 text-dangerous hover:bg-dangerous/10`}
        >
          {t("account.deleteAccount")}
        </button>
      </div>

      {message && <p className="mt-3 text-sm text-safe">{message}</p>}
      {error && !confirm && <p className="mt-3 text-sm text-dangerous">{error}</p>}

      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={closeConfirm}
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleConfirm}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg border border-hairline bg-ink p-5"
          >
            <p className="text-sm text-textPrimary">
              {confirm === "history" ? t("account.confirmHistory") : t("account.confirmAccount")}
            </p>

            {confirm === "account" && (
              <input
                type="password"
                required
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("account.password")}
                className="mt-4 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand"
              />
            )}

            {error && <p className="mt-3 text-sm text-dangerous">{error}</p>}

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-dangerous px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {busy ? t("account.deleting") : t("account.confirmDelete")}
              </button>
              <button
                type="button"
                onClick={closeConfirm}
                disabled={busy}
                className="rounded-md border border-hairline px-4 py-2 text-sm text-textSecondary hover:text-textPrimary disabled:opacity-60"
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
