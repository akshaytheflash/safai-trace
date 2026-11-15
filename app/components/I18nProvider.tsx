"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  dirFor,
  isLocale,
  type Direction,
  type Locale,
} from "@/lib/i18n/config";
import { translate, type MessageKey } from "@/lib/i18n";

interface I18nContextValue {
  locale: Locale;
  dir: Direction;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [, startTransition] = useTransition();

  const apply = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
      document.documentElement.dir = dirFor(next);
    }
  }, []);

  // A visitor may have picked a language on another page or app; honour the
  // local choice once, then refresh server components with the new cookie.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(LOCALE_COOKIE);
    } catch {
      /* storage blocked */
    }
    if (isLocale(stored) && stored !== initialLocale) {
      apply(stored);
      startTransition(() => router.refresh());
    }
  }, [apply, initialLocale, router, startTransition]);

  const setLocale = useCallback(
    (next: Locale) => {
      if (!isLocale(next)) return;
      apply(next);
      try {
        window.localStorage.setItem(LOCALE_COOKIE, next);
      } catch {
        /* storage blocked */
      }
      document.cookie = LOCALE_COOKIE + "=" + next + "; path=/; max-age=31536000; samesite=lax";
      startTransition(() => router.refresh());
    },
    [apply, router, startTransition]
  );

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, dir: dirFor(locale), setLocale, t }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
