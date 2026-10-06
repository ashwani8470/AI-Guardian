import { useEffect, useState } from "react";
import { api } from "../api/client";

// Preset examples for sample (guest) mode come from the backend
// (GET /demo/examples) - fetched once per page load and shared by all pages.
let cache = null;
let inflight = null;

function fetchExamples() {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = api
      .demoExamples()
      .then((data) => {
        cache = data;
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useDemoExamples(modality, enabled) {
  const [state, setState] = useState(() => ({
    examples: cache?.examples?.[modality] || [],
    loading: false,
    error: "",
  }));

  useEffect(() => {
    if (!enabled || cache) return undefined;
    let cancelled = false;
    fetchExamples()
      .then((data) => {
        if (!cancelled) setState({ examples: data.examples[modality] || [], loading: false, error: "" });
      })
      .catch((e) => {
        if (!cancelled) setState({ examples: [], loading: false, error: e.message });
      });
    return () => {
      cancelled = true;
    };
  }, [modality, enabled]);

  const examples = state.examples.length ? state.examples : cache?.examples?.[modality] || [];
  return { examples, loading: enabled && !examples.length && !state.error, error: state.error };
}

// Turns a base64 PNG from the backend into a File so the normal image
// preview box can show it.
export function base64ToFile(b64, name, type = "image/png") {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name, { type });
}
