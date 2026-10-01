import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Display preferences that are remembered in this browser only:
//  - simple mode: bigger text and fewer options (for less tech-savvy users)
//  - language: "en" | "hi"
const PrefsContext = createContext(null);

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked; the preference just won't persist */
  }
}

export function PrefsProvider({ children }) {
  const [simple, setSimpleState] = useState(() => load("ag_simple", "0") === "1");
  const [lang, setLangState] = useState(() => (load("ag_lang", "en") === "hi" ? "hi" : "en"));

  useEffect(() => {
    document.documentElement.classList.toggle("simple", simple);
    document.documentElement.lang = lang;
  }, [simple, lang]);

  const setSimple = useCallback((value) => {
    setSimpleState(value);
    save("ag_simple", value ? "1" : "0");
  }, []);

  const setLang = useCallback((value) => {
    const next = value === "hi" ? "hi" : "en";
    setLangState(next);
    save("ag_lang", next);
  }, []);

  const value = useMemo(() => ({ simple, setSimple, lang, setLang }), [simple, setSimple, lang, setLang]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside <PrefsProvider>");
  return ctx;
}
