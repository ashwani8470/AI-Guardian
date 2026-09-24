import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import ShieldMark from "../components/ShieldMark";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <ShieldMark className="text-brand" />
          <span className="font-display text-lg font-semibold text-textPrimary">AI Guardian</span>
        </div>

        <h1 className="font-display text-2xl font-semibold text-textPrimary">
          Set a new password
        </h1>

        {!token && (
          <p className="mt-2 text-sm text-dangerous">
            This link is missing its reset token. Request a new one from the{" "}
            <Link to="/forgot-password" className="text-brand">
              forgot password
            </Link>{" "}
            page.
          </p>
        )}

        {done ? (
          <div className="mt-6 rounded-md border border-hairline bg-surface p-4 text-sm text-textSecondary">
            Password reset. Taking you to log in…
          </div>
        ) : (
          token && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm text-textSecondary" htmlFor="password">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-sm text-textSecondary" htmlFor="confirmPassword">
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand"
                />
              </div>

              {error && <p className="text-sm text-dangerous">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-brand py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Resetting…" : "Reset password"}
              </button>
            </form>
          )
        )}

        <p className="mt-6 text-sm text-textSecondary">
          <Link to="/login" className="text-brand">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
