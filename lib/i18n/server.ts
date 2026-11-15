import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, dirFor, isLocale, type Locale } from "./config";
import { translate, type MessageKey } from "./index";

/** Locale chosen by the visitor (cookie set by the language switcher). */
export function getLocale(): Locale {
  const value = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Server-component helper: const { t, locale, dir } = getI18n(); */
export function getI18n() {
  const locale = getLocale();
  return {
    locale,
    dir: dirFor(locale),
    t: (key: MessageKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
  };
}
