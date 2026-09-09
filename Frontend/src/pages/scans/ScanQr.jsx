import { useState } from "react";
import { api, fileToBase64 } from "../../api/client";
import RiskResult from "../../components/RiskResult";
import ImageDropInput from "../../components/ImageDropInput";

export default function ScanQr() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const data = await api.predictQr(base64);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-textPrimary">Check a QR code</h1>
      <p className="mt-1 text-sm text-textSecondary">
        Upload a photo or screenshot of the QR code before you scan it.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <ImageDropInput file={file} onChange={setFile} />
        <button
          type="submit"
          disabled={loading || !file}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Checking…" : "Check QR code"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-dangerous">{error}</p>}
      {result && (
        <div className="mt-6">
          <RiskResult result={result} />
        </div>
      )}
    </div>
  );
}
