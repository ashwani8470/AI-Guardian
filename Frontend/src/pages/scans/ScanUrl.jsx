import { useState } from "react";
import { api } from "../../api/client";
import ScanLoadingSteps from "../../components/ScanLoadingSteps";
import ScanVerdict from "../../components/ScanVerdict";

export default function ScanUrl() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await api.predictUrl(url);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-textPrimary">Check a link</h1>
      <p className="mt-1 text-sm text-textSecondary">
        Paste a URL to check before you visit it.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          placeholder="https://example.com/…"
          className="flex-1 rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-textPrimary outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Checking…" : "Check link"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-dangerous">{error}</p>}

      {loading && (
        <div className="mt-6">
          <ScanLoadingSteps
            steps={["Reading the URL…", "Checking known patterns…", "Scoring risk…"]}
          />
        </div>
      )}

      {result && !loading && (
        <div className="mt-6">
          <ScanVerdict result={result} />
        </div>
      )}
    </div>
  );
}