import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { zh, type MessageKey } from "./zh";
import { en } from "./en";

export type Lang = "zh" | "en";

const DICTS: Record<Lang, Record<MessageKey, string>> = { zh, en };
const STORAGE_KEY = "claude-swap.lang";

export function detectInitialLang(): Lang {
  if (typeof window === "undefined") return "zh";
  const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
  if (saved === "zh" || saved === "en") return saved;
  return "zh";
}

function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{{${k}}}`
  );
}

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nCtx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  const value = useMemo<I18nCtx>(() => {
    const dict = DICTS[lang];
    const fallback = DICTS.zh;
    const t = (key: MessageKey, vars?: Record<string, string | number>) =>
      format(dict[key] ?? fallback[key] ?? key, vars);
    return { lang, setLang, t };
  }, [lang, setLang]);

  return createElement(I18nContext.Provider, { value }, children);
}

export function useI18n(): I18nCtx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("LanguageProvider missing");
  return ctx;
}

export function useT() {
  return useI18n().t;
}

export type { MessageKey };
