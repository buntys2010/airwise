"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Lang } from "@/lib/chat";
import { t as translate, type Key } from "@/lib/i18n";

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key, vars?: Record<string, string | number>) => string;
}

const LangContext = createContext<Ctx>({
  lang: "en",
  setLang: () => undefined,
  t: (k, v) => translate("en", k, v),
});
const STORE = "airwise.lang";

/** Holds the interface language, remembers it on the device, and keeps <html lang> in step so screen readers pick the right voice. */
export function LangProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE);
      if (saved === "hi" || saved === "en") setLangState(saved);
    } catch {
      /* storage may be blocked */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORE, l);
    } catch {
      /* ignore */
    }
  }, []);
  const value = useMemo<Ctx>(
    () => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars) }),
    [lang, setLang],
  );
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

/** The current language and its `t` translator. Must be used under LangProvider. */
export const useLang = () => useContext(LangContext);
