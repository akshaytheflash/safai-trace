// Cited planning norms and citizen-help data. No invented benchmarks.
// Everything here is either quoted from a linked public document or computed
// from the user's own inputs.

export const CPHEEO = {
  sludgeM3PerPersonYear: 0.067,
  planningBandYears: [2, 3] as [number, number],
  is2470FiveUserThreeYearLitres: 1500,
  accumulationSource:
    "CPHEEO Manual on Sewerage and Sewage Treatment (2012), Table 9.2: 0.067 m³ per capita per year for a 3-year desludging interval (wet conditions).",
  accumulationUrl:
    "https://sswm.info/sites/default/files/reference_attachments/CPHEEO%202012%20Manual%20on%20sewerage%20and%20sewage%20treatment.%20Part%20A%20Engineering.pdf",
  intervalSource:
    "SBM-U Advisory on Faecal Sludge and Septage Management in Small and Medium Towns (CPHEEO, November 2024), quoting CPHEEO 2013: clean at least once in 2–3 years if the tank is not overloaded.",
  intervalUrl:
    "https://sbmurban.org/storage/app/media/e-library/Technical%20Advisory/Advisory%20on%20Faecal%20Sludge%20and%20Septage%20Management%20in%20Small%20and%20Medium%20Towns.pdf",
  is2470Source:
    "IS 2470 (Part 1):1985, as cited in the SBM-U 2024 advisory: 1.5 m³ effective capacity for a 5-person household at a 3-year cleaning interval.",
  caveat:
    "Planning estimate, not a measurement. Sludge depth must be checked on site. CPHEEO 2012 §9.3.5.3 also says small domestic tanks should be cleaned at least once in 1–2 years; a tank that fills faster than 2 years needs annual emptying.",
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

export function calculateDesludging(personsInput: number, tankLitresInput: number): NormResult {
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
      headline: "Empty it every year",
      detail: `At ${annualSludgeL} L of sludge a year, this ${tankLitres.toLocaleString("en-IN")} L tank reaches its planning limit in ${rounded} years — below the CPHEEO 2–3 year band. Treat it as undersized: desludge annually and plan a larger tank. A 3-year interval needs about ${required3yL.toLocaleString("en-IN")} L of sludge storage.`,
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
      headline: "Within the 2–3 year band",
      detail: `At ${annualSludgeL} L of sludge a year, this ${tankLitres.toLocaleString("en-IN")} L tank reaches its planning limit in ${rounded} years. Schedule emptying every ${Math.max(2, Math.floor(yearsToFill))} years, inside the CPHEEO band. Do not wait for an overflow call.`,
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
    headline: "Cap the interval at 3 years",
    detail: `The tank has roughly ${rounded} years of sludge storage at ${annualSludgeL} L a year, but CPHEEO caps the planning interval at 3 years. Book at year 3, not when it overflows.`,
  };
}

export const PRICE_BENCHMARK = {
  min: 1500,
  max: 2500,
  currency: "INR",
  unit: "per trip",
  label: "Residential / mixed-property septic tank collection",
  primarySource:
    "Jharkhand Liquid Waste Management & User Charges Rules, 2025, §11: ₹1,500 per trip (residential septic tank), ₹2,500 per trip (mixed property).",
  primaryUrl: "https://udhd.jharkhand.gov.in/Handlers/Notices2.ashx?id=05012026040134PM.pdf",
  secondarySource:
    "NMCG / CSE Septage Management: A Practitioner's Guide: a private mechanised truck charges about ₹1,500 per trip.",
  secondaryUrl:
    "https://nmcg.nic.in/writereaddata/fileupload/5_Septage%20Practitioner's%20Guide-EnglishVersion.pdf",
  caveat:
    "This is a notified ULB rate card from Jharkhand (2025), cross-checked with the NMCG guide — not a Delhi notified rate. Ask your ULB for its current rate card. A per-trip price is not a per-litre price.",
};

export type PriceResult = {
  status: "below" | "within" | "above";
  headline: string;
  detail: string;
  quote: number;
};

export function checkPrice(quoteInput: number): PriceResult | null {
  if (!Number.isFinite(quoteInput) || quoteInput <= 0) return null;
  const quote = Math.round(quoteInput);
  if (quote < PRICE_BENCHMARK.min) {
    return {
      status: "below",
      quote,
      headline: "Below the cited range",
      detail: `₹${quote.toLocaleString("en-IN")} is under the ₹1,500–₹2,500 benchmark. An unusually low quote is how a trip gets paid for without a treatment-plant receipt. Ask where the load will be tipped, and require the weighbridge slip before paying.`,
    };
  }
  if (quote > PRICE_BENCHMARK.max) {
    return {
      status: "above",
      quote,
      headline: "Above the cited range",
      detail: `₹${quote.toLocaleString("en-IN")} is above the ₹1,500–₹2,500 benchmark. Ask for an itemised bill (emptying + transport + treatment fee) and the plant receipt. A high price is not proof of safe disposal.`,
    };
  }
  return {
    status: "within",
    quote,
    headline: "Within the cited range",
    detail: `₹${quote.toLocaleString("en-IN")} sits inside the ₹1,500–₹2,500 benchmark. Price is not proof: the plant OTP and weighbridge receipt still decide whether payment releases.`,
  };
}

export type HelpRoute = {
  name: string;
  number?: string;
  alt?: string;
  url: string;
  channel: string;
  note: string;
  sourceUrl: string;
  sourceLabel: string;
};

export const HELP_ROUTES: HelpRoute[] = [
  {
    name: "Swachh Bharat Mission (Urban) helpline",
    number: "1969",
    url: "https://sbmurban.org/contact-us",
    channel: "Phone",
    note: "National SBM-U helpline; the Swachhata app lists 1969 for app and sanitation queries.",
    sourceUrl: "https://sbmurban.org/contact-us",
    sourceLabel: "sbmurban.org/contact-us",
  },
  {
    name: "Swachhata app (MoHUA)",
    url: "https://swachh.city/",
    channel: "App / web",
    note: "Geo-tagged photo complaint routed to your ULB. Use the trip ID and vehicle number in the description.",
    sourceUrl: "https://play.google.com/store/apps/details?id=com.ichangemycity.swachhbharat",
    sourceLabel: "Swachhata-MoHUA on Google Play",
  },
  {
    name: "CPGRAMS",
    url: "https://pgportal.gov.in/",
    channel: "Web",
    note: "Central public grievance portal. Escalate if the ULB does not respond; attach the complaint text and any photos.",
    sourceUrl: "https://pgportal.gov.in/",
    sourceLabel: "pgportal.gov.in",
  },
  {
    name: "Municipal Corporation of Delhi call centre",
    number: "155305",
    url: "https://mcdonline.nic.in/portal/contactUs",
    channel: "Phone",
    note: "MCD citizen call centre. MCD-311 also accepts non-emergency sanitation complaints.",
    sourceUrl: "https://mcdonline.nic.in/portal/contactUs",
    sourceLabel: "mcdonline.nic.in/portal/contactUs",
  },
  {
    name: "Delhi Jal Board",
    number: "1916",
    alt: "1800-117-118",
    url: "https://delhijalboard.delhi.gov.in/jalboard/contact-us",
    channel: "Phone",
    note: "Water and sewer complaints for DJB-served areas, including sewer overflow and illegal discharge.",
    sourceUrl: "https://delhijalboard.delhi.gov.in/jalboard/contact-us",
    sourceLabel: "delhijalboard.delhi.gov.in",
  },
  {
    name: "New Delhi Municipal Council",
    number: "1533",
    url: "https://www.ndmc.gov.in/complaints.aspx",
    channel: "Phone",
    note: "NDMC toll-free complaints line for the New Delhi municipal area.",
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
