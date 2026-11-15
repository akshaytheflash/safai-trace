import { DEFAULT_LOCALE, type Locale } from "./config";
import { en, type LocaleMessages, type MessageKey, type Messages } from "./messages/en";
import hi from "./messages/hi";
import bn from "./messages/bn";
import mr from "./messages/mr";
import te from "./messages/te";
import ta from "./messages/ta";
import gu from "./messages/gu";
import ur from "./messages/ur";
import kn from "./messages/kn";
import or from "./messages/or";
import ml from "./messages/ml";

const DICTIONARIES: Record<Locale, LocaleMessages> = {
  en,
  hi,
  bn,
  mr,
  te,
  ta,
  gu,
  ur,
  kn,
  or,
  ml,
};

/**
 * Translate a key for a locale, interpolating {placeholders}.
 * Falls back to English, then to the key itself, so missing strings are never
 * fatal at runtime.
 */
export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>
): string {
  const dict = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
  let text = dict[key] ?? en[key] ?? key;
  if (vars) {
    text = text.replace(/\{(\w+)\}/g, (match, name: string) =>
      vars[name] === undefined || vars[name] === null ? match : String(vars[name])
    );
  }
  return text;
}

export type { MessageKey, Messages, LocaleMessages };
export { en };
