"use client";

import { LOCALES, type Locale } from "@/lib/i18n/config";
import { useI18n } from "./I18nProvider";

/**
 * Language picker. Uses a native select so it is keyboard- and screen-reader
 * accessible on low-end Android browsers. Native names are always shown in
 * their own script; the control is excluded from auto-translation.
 */
export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className={`lang-switcher ${className}`}>
      <svg className="lang-switcher-globe" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <ellipse cx="8" cy="8" rx="2.9" ry="6.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M1.8 8h12.4M2.6 4.6h10.8M2.6 11.4h10.8" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      <span className="lang-switcher-label">{t("language.label")}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        aria-label={t("language.select")}
        translate="no"
      >
        {LOCALES.map((item) => (
          <option key={item.code} value={item.code} lang={item.code} dir={item.dir}>
            {item.native}
          </option>
        ))}
      </select>
    </label>
  );
}
