import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import ShieldMark from "../components/ShieldMark";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
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
          Reset your password
        </h1>
        <p className="mt-1 text-sm text-textSecondary">
          Enter your account email and we'll send you a link to set a new password.
        </p>

        {sent ? (
          <div className="mt-6 rounded-md border border-hairline bg-surface p-4 text-sm text-textSecondary">
            If an account exists for <span className="text-textPrimary">{email}</span>,
            a reset link is on its way. Check your inbox in a few minutes.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm text-textSecondary" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand"
              />
            </div>

            {error && <p className="text-sm text-dangerous">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-brand py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
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
