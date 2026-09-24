import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ShieldMark from "../components/ShieldMark";

export default function Login() {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) navigate("/app");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <ShieldMark className="text-brand" />
          <span className="font-display text-lg font-semibold text-textPrimary">AI Guardian</span>
        </div>

        <h1 className="font-display text-2xl font-semibold text-textPrimary">Welcome back</h1>
        <p className="mt-1 text-sm text-textSecondary">Log in to check what's safe and what's not.</p>

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
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm text-textSecondary" htmlFor="password">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-brand hover:opacity-90">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand"
            />
          </div>

          {error && <p className="text-sm text-dangerous">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-brand py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-textSecondary">
          New here?{" "}
          <Link to="/signup" className="text-brand">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
