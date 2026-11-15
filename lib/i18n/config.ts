// Locale registry for the site. English is the source language; the ten most
// widely spoken Indian languages follow (2011 Census, native speakers).
// Keep this file dependency-free so it can be imported from client and server.

export const DEFAULT_LOCALE = "en" as const;
export const LOCALE_COOKIE = "i18n_locale";

export const LOCALES = [
  { code: "en", name: "English", native: "English", dir: "ltr" },
  { code: "hi", name: "Hindi", native: "हिन्दी", dir: "ltr" },
  { code: "bn", name: "Bengali", native: "বাংলা", dir: "ltr" },
  { code: "mr", name: "Marathi", native: "मराठी", dir: "ltr" },
  { code: "te", name: "Telugu", native: "తెలుగు", dir: "ltr" },
  { code: "ta", name: "Tamil", native: "தமிழ்", dir: "ltr" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી", dir: "ltr" },
  { code: "ur", name: "Urdu", native: "اردو", dir: "rtl" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", dir: "ltr" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ", dir: "ltr" },
  { code: "ml", name: "Malayalam", native: "മലയാളം", dir: "ltr" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];
export type Direction = "ltr" | "rtl";

const CODES = new Set<string>(LOCALES.map((l) => l.code));

export function isLocale(value: string | null | undefined): value is Locale {
  return typeof value === "string" && CODES.has(value);
}

export function dirFor(locale: Locale): Direction {
  const found = LOCALES.find((l) => l.code === locale);
  return found?.dir === "rtl" ? "rtl" : "ltr";
}

export function nativeName(locale: Locale): string {
  return LOCALES.find((l) => l.code === locale)?.native ?? "English";
}
