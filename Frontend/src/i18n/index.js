import { useCallback } from "react";
import { usePrefs } from "../context/PrefsContext";
import { STRINGS } from "./strings";

export function translate(lang, key, vars) {
  let text = (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}

// const t = useT();  t("nav.history")  /  t("bulk.progress", { done: 3, total: 10 })
// Missing Hindi keys fall back to English, so a gap never shows a blank.
export function useT() {
  const { lang } = usePrefs();
  return useCallback((key, vars) => translate(lang, key, vars), [lang]);
}
