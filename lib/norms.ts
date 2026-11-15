// Cited planning norms and citizen-help data. No invented benchmarks.
// Everything here is either quoted from a linked public document or computed
// from the user's own inputs.
//
// Display prose lives in lib/i18n/messages/en.ts so it can be translated;
// formulas, rates, numbers, URLs and scheme names stay here unchanged.

import { translate } from "./i18n";
import type { MessageKey } from "./i18n/messages/en";

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

/** English fallback for callers that have no request locale (tests, scripts). */
const enT: Translate = (key, vars) => translate("en", key, vars);

export const CPHEEO = {
  sludgeM3PerPersonYear: 0.067,
  planningBandYears: [2, 3] as [number, number],
  is2470FiveUserThreeYearLitres: 1500,
  accumulationUrl:
    "https://sswm.info/sites/default/files/reference_attachments/CPHEEO%202012%20Manual%20on%20sewerage%20and%20sewage%20treatment.%20Part%20A%20Engineering.pdf",
  intervalUrl:
    "https://sbmurban.org/storage/app/media/e-library/Technical%20Advisory/Advisory%20on%20Faecal%20Sludge%20and%20Septage%20Management%20in%20Small%20and%20Medium%20Towns.pdf",
};

export type NormResult = {
  persons: number;
  tankLitres: number;
  annualSludgeL: number;
  yearsToFill: number;
  recommendedYears: number;
  required3yL: number;
  status: "undersized" | "within" | "longer";
  headline: string;
  detail: string;
};

export function calculateDesludging(
  personsInput: number,
  tankLitresInput: number,
  t: Translate = enT
): NormResult {
  const persons = Math.max(1, Math.min(50, Math.round(personsInput || 1)));
  const tankLitres = Math.max(100, Math.min(100000, Math.round(tankLitresInput || 0)));
  const annualSludgeL = Math.round(persons * CPHEEO.sludgeM3PerPersonYear * 1000);
  const yearsToFill = tankLitres / Math.max(1, annualSludgeL);
  const required3yL = Math.round(annualSludgeL * 3);
  const rounded = Math.round(yearsToFill * 10) / 10;

  if (yearsToFill < CPHEEO.planningBandYears[0]) {
    return {
      persons,
      tankLitres,
      annualSludgeL,
      yearsToFill: rounded,
      recommendedYears: 1,
      required3yL,
      status: "undersized",
      headline: t("norms.headline.undersized"),
      detail: t("norms.detail.undersized", {
        annual: annualSludgeL,
        tank: tankLitres.toLocaleString("en-IN"),
        years: rounded,
        required: required3yL.toLocaleString("en-IN"),
      }),
    };
  }

  if (yearsToFill <= CPHEEO.planningBandYears[1]) {
    return {
      persons,
      tankLitres,
      annualSludgeL,
      yearsToFill: rounded,
      recommendedYears: Math.max(2, Math.floor(yearsToFill)),
      required3yL,
      status: "within",
      headline: t("norms.headline.within"),
      detail: t("norms.detail.within", {
        annual: annualSludgeL,
        tank: tankLitres.toLocaleString("en-IN"),
        years: rounded,
        recommended: Math.max(2, Math.floor(yearsToFill)),
      }),
    };
  }

  return {
    persons,
    tankLitres,
    annualSludgeL,
    yearsToFill: rounded,
    recommendedYears: 3,
    required3yL,
    status: "longer",
    headline: t("norms.headline.longer"),
    detail: t("norms.detail.longer", {
      years: rounded,
      annual: annualSludgeL,
    }),
  };
}

export const PRICE_BENCHMARK = {
  min: 1500,
  max: 2500,
  currency: "INR",
  unit: "per trip",
  primaryUrl: "https://udhd.jharkhand.gov.in/Handlers/Notices2.ashx?id=05012026040134PM.pdf",
  secondaryUrl:
    "https://nmcg.nic.in/writereaddata/fileupload/5_Septage%20Practitioner's%20Guide-EnglishVersion.pdf",
};

export type PriceResult = {
  status: "below" | "within" | "above";
  headline: string;
  detail: string;
  quote: number;
};

export function checkPrice(quoteInput: number, t: Translate = enT): PriceResult | null {
  if (!Number.isFinite(quoteInput) || quoteInput <= 0) return null;
  const quote = Math.round(quoteInput);
  const formatted = quote.toLocaleString("en-IN");
  if (quote < PRICE_BENCHMARK.min) {
    return {
      status: "below",
      quote,
      headline: t("price.headline.below"),
      detail: t("price.detail.below", { quote: formatted }),
    };
  }
  if (quote > PRICE_BENCHMARK.max) {
    return {
      status: "above",
      quote,
      headline: t("price.headline.above"),
      detail: t("price.detail.above", { quote: formatted }),
    };
  }
  return {
    status: "within",
    quote,
    headline: t("price.headline.within"),
    detail: t("price.detail.within", { quote: formatted }),
  };
}

export type HelpRoute = {
  name: string;
  number?: string;
  alt?: string;
  url: string;
  channelKey: MessageKey;
  noteKey: MessageKey;
  sourceUrl: string;
  sourceLabel: string;
};

export const HELP_ROUTES: HelpRoute[] = [
  {
    name: "Swachh Bharat Mission (Urban) helpline",
    number: "1969",
    url: "https://sbmurban.org/contact-us",
    channelKey: "help.channel.phone",
    noteKey: "help.note.sbm",
    sourceUrl: "https://sbmurban.org/contact-us",
    sourceLabel: "sbmurban.org/contact-us",
  },
  {
    name: "Swachhata app (MoHUA)",
    url: "https://swachh.city/",
    channelKey: "help.channel.appWeb",
    noteKey: "help.note.swachhata",
    sourceUrl: "https://play.google.com/store/apps/details?id=com.ichangemycity.swachhbharat",
    sourceLabel: "Swachhata-MoHUA on Google Play",
  },
  {
    name: "CPGRAMS",
    url: "https://pgportal.gov.in/",
    channelKey: "help.channel.web",
    noteKey: "help.note.cpgrams",
    sourceUrl: "https://pgportal.gov.in/",
    sourceLabel: "pgportal.gov.in",
  },
  {
    name: "Municipal Corporation of Delhi call centre",
    number: "155305",
    url: "https://mcdonline.nic.in/portal/contactUs",
    channelKey: "help.channel.phone",
    noteKey: "help.note.mcd",
    sourceUrl: "https://mcdonline.nic.in/portal/contactUs",
    sourceLabel: "mcdonline.nic.in/portal/contactUs",
  },
  {
    name: "Delhi Jal Board",
    number: "1916",
    alt: "1800-117-118",
    url: "https://delhijalboard.delhi.gov.in/jalboard/contact-us",
    channelKey: "help.channel.phone",
    noteKey: "help.note.djb",
    sourceUrl: "https://delhijalboard.delhi.gov.in/jalboard/contact-us",
    sourceLabel: "delhijalboard.delhi.gov.in",
  },
  {
    name: "New Delhi Municipal Council",
    number: "1533",
    url: "https://www.ndmc.gov.in/complaints.aspx",
    channelKey: "help.channel.phone",
    noteKey: "help.note.ndmc",
    sourceUrl: "https://www.ndmc.gov.in/complaints.aspx",
    sourceLabel: "ndmc.gov.in/complaints",
  },
];

export const HELP_VERIFIED_ON = "6 November 2026";

export type ComplaintTrip = {
  id: string;
  householdAddress: string;
  householdPincode: string;
  plantName: string;
  plantAddress: string;
  operatorName: string;
  vehicleNo: string;
  distanceKm: number | null;
  durationMin: number | null;
  status: string;
  flaggedReason: string | null;
  receiptId: string | null;
  verifiedAt: string | null;
  createdAt: string;
  pilot: boolean;
};

// Generated complaint text is an official artifact and deliberately stays in
// English regardless of the interface language.
export function buildComplaint(trip: ComplaintTrip, area?: string) {
  const created = new Date(trip.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const where = area?.trim() || trip.householdAddress;
  const evidence = [
    `Trip ${trip.id} was booked for ${where} (pincode ${trip.householdPincode || "not recorded"}).`,
    `Assigned disposal plant: ${trip.plantName}, ${trip.plantAddress}.`,
    `Operator ${trip.operatorName}, vehicle ${trip.vehicleNo}.`,
    trip.distanceKm != null
      ? `OSRM road distance household → plant at booking: ${trip.distanceKm} km (${trip.durationMin} min).`
      : "No OSRM distance was recorded for this trip.",
    trip.receiptId
      ? `Weighbridge receipt on file: ${trip.receiptId}, verified ${trip.verifiedAt || "timestamp missing"}.`
      : "No weighbridge receipt is on file. The plant OTP was not verified.",
    trip.flaggedReason ? `System flag: ${trip.flaggedReason}` : `Current status: ${trip.status}.`,
    trip.pilot ? "This is a Safai Trace pilot record; the underlying booking and routing calls are logged." : "",
  ].filter(Boolean);

  return `To
The Executive Officer / Sanitation Officer
Urban Local Body — ${trip.householdPincode || "jurisdiction"}

Subject: Unverified faecal sludge disposal — trip ${trip.id}, vehicle ${trip.vehicleNo}

Sir / Madam,

I am reporting a desludging trip that has no proof of safe disposal at a treatment plant. Under SBM (Urban) 2.0 and the CPHEEO FSM chain, faecal sludge must be transported to a registered FSTP/STP and recorded at the weighbridge. A tanker that leaves the household without a plant receipt may have dumped into a drain or open land.

What the record shows
${evidence.map((e) => `- ${e}`).join("\n")}

What I am asking for
1. Check the weighbridge / plant register for vehicle ${trip.vehicleNo} on ${created}.
2. Confirm whether this load reached ${trip.plantName}.
3. If it did not, inspect the route and any dumping point near ${where}.
4. Keep payment on hold until a plant receipt is produced, and share the inspection outcome with me.

I can provide the trip record and the OTP/verification log. Please treat this as a sanitation and public-health complaint, not a billing dispute.

Name:
Phone:
Address: ${where}
Date: ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}

Reference: Safai Trace trip ${trip.id} · pilot record · no receipt = no payment.`;
}
