import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { I18nProvider } from "@/app/components/I18nProvider";
import { getI18n } from "@/lib/i18n/server";
import { INDIC_FONTS_HREF } from "@/lib/i18n/fonts";

export const metadata: Metadata = {
  title: "Safai Trace — faecal sludge chain of custody",
  description:
    "A utility operations console that proves a septic-tank tanker reached a treatment plant: plant OTP + weighbridge receipt, or no payment.",
};

export const viewport: Viewport = {
  themeColor: "#23262B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dir } = getI18n();
  return (
    <html lang={locale} dir={dir}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link href={INDIC_FONTS_HREF} rel="stylesheet" />
      </head>
      <body>
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
