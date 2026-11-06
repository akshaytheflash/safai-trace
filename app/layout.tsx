import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Safai Trace — Septic-Tank Proof of Delivery | SBM 2.0 FSM",
  description: "Household booking → GPS trip → plant OTP/weighbridge receipt → ULB dashboard. No plant receipt = flagged, no payment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
