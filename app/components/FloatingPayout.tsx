"use client";

import { useEffect, useState } from "react";
import { useI18n } from "./I18nProvider";

type TripRow = {
  id: string;
  status: string;
  quotedPrice: number | null;
  paymentReleased: boolean;
};

/**
 * What is payable today, kept in the corner of the operator's screen.
 *
 * An operator's real question is not "what is this trip's status" but "what
 * am I owed, and what is being held back". This appears once the trip
 * dossier scrolls away, and counts the released and held money across the
 * queue. No receipt, no payment — the held figure is the visual argument.
 */
export default function FloatingPayout({ trips }: { trips: TripRow[] }) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = document.querySelector(".chain-strip");
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShown(!e.isIntersecting), {
      rootMargin: "-60px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!shown) return null;

  const paid = trips.filter((t) => t.paymentReleased).reduce((n, t) => n + (t.quotedPrice ?? 0), 0);
  const held = trips
    .filter((t) => !t.paymentReleased && (t.status === "FLAGGED" || t.status === "AT_PLANT" || t.status === "EN_ROUTE" || t.status === "BOOKED"))
    .reduce((n, t) => n + (t.quotedPrice ?? 0), 0);
  const flagged = trips.filter((t) => t.status === "FLAGGED").length;

  if (!trips.length) return null;

  return (
    <aside className="float-pay" aria-label={t("floating.aria")}>
      <p className="fp-label">{t("floating.releasedLabel")}</p>
      <p className="fp-paid">₹{paid.toLocaleString("en-IN")}</p>
      <div className="fp-row">
        <div>
          <span className="fp-k">{t("floating.held")}</span>
          <span className="fp-v">{held > 0 ? `₹${held.toLocaleString("en-IN")}` : "₹0"}</span>
        </div>
        <div>
          <span className="fp-k">{t("floating.flagged")}</span>
          <span className="fp-v">{flagged}</span>
        </div>
      </div>
      {held > 0 && <p className="fp-note">{t("floating.note")}</p>}
    </aside>
  );
}
