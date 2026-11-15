// English source strings. Every other locale is a Partial of this map, so a
// missing translation falls back to English rather than showing a key.
// Add new keys here and run: node scripts/check-i18n.mjs

export const en = {
  "language.label": "Language",
  "language.select": "Choose a language",

  // Shared chrome
  "common.pilot": "Pilot",
  "common.optional": "optional",
  "common.loading": "loading…",
  "common.working": "Working…",
  "common.copy": "Copy",
  "common.trip": "Trip",
  "common.plant": "Plant",
  "common.notRecorded": "not recorded",
  "common.openOsm": "Open OSM",
  "common.openOnOsm": "Open on OSM",
  "common.source": "Source:",
  "status.none": "NO TRIP SELECTED",

  // Browser metadata
  "meta.title": "Safai Trace — faecal sludge chain of custody",
  "meta.description":
    "A utility operations console that proves a septic-tank tanker reached a treatment plant: plant OTP + weighbridge receipt, or no payment.",

  // Masthead
  "mast.tagline": "Faecal sludge chain of custody",
  "mast.pilotTag": "Pilot · Delhi",
  "mast.apiStatus": "Live API status",
  "mast.checkingApis": "checking APIs",

  // Trip status labels (codes stay unchanged in payloads)
  "status.BOOKED": "BOOKED",
  "status.EN_ROUTE": "EN ROUTE",
  "status.AT_PLANT": "AT PLANT",
  "status.VERIFIED": "VERIFIED",
  "status.FLAGGED": "FLAGGED",

  // Chain of custody strip
  "chain.aria": "Chain of custody",
  "chain.noTrip": "No trip selected",
  "chain.paymentReleased": "Payment released",
  "chain.paymentHeld": "Payment held",
  "chain.station.booked": "Booked",
  "chain.station.bookedNote": "job logged",
  "chain.station.enRoute": "En route",
  "chain.station.enRouteNote": "tanker moving",
  "chain.station.atPlant": "At plant",
  "chain.station.atPlantNote": "at the gate",
  "chain.station.verified": "Verified",
  "chain.station.verifiedNote": "receipt sealed",
  "chain.caption.none":
    "Select a trip. The chain fills only when a plant verifies the load; nothing is pre-filled.",
  "chain.caption.flagged":
    "Chain broken at the plant gate. {reason} Payment is held; the ULB queue has the hotspot.",
  "chain.noReceiptReason": "No weighbridge receipt.",
  "chain.caption.booked": "Job logged, OTP issued. Nothing is proven yet — the chain is open.",
  "chain.caption.enRoute": "Tanker moving. The load is unproven until it reaches a plant gate.",
  "chain.caption.atPlant":
    "At the gate. The chain closes only when the plant OTP matches and a weighbridge receipt is entered.",
  "chain.caption.verified": "Receipt {receipt} sealed {at}. Payment released.",
  "chain.caption.unknown": "Chain state unknown.",

  // Notices
  "notice.dismiss": "Dismiss message",

  // Dispatch queue
  "queue.aria": "Dispatch queue",
  "queue.title": "Dispatch queue",
  "queue.countOne": "{count} trip",
  "queue.count": "{count} trips",
  "queue.noRoute": "no route",
  "queue.empty": "No trips yet. Book one from the desk below.",
  "queue.note": "Every row is pilot-collected. No row is a real municipal trip.",

  // Plant map panel
  "map.aria": "Plant map",
  "map.registerTitle": "Plant register",
  "map.registerMeta": "{total} OSM records · {named} named",
  "map.snapshot": "snapshot {date}",
  "map.refresh": "Refresh OSM",
  "map.refreshing": "Refreshing…",
  "map.stale":
    "Overpass refresh failed. Showing the dated snapshot from {date}. {error}",
  "map.unavailableTitle": "Plant map unavailable.",
  "map.unavailableBody": "{error} No plant coordinates are invented.",
  "map.allMirrorsFailed": "All Overpass mirrors failed.",
  "map.retry": "Retry Overpass",
  "map.key.plant": "OSM wastewater plant",
  "map.key.selected": "selected disposal plant",
  "map.key.pickup": "household pickup",
  "map.key.route": "OSRM road route",
  "map.license": "OpenStreetMap contributors, ODbL",
  "map.canvasAria": "Map of wastewater treatment plants and the selected trip",
  "map.straightLine":
    "Straight line between endpoints — road geometry was not stored for this seeded pilot row.",
  "map.pickup": "PICKUP",
  "map.plant": "PLANT",
  "map.tileError":
    "Basemap tiles did not load. Plant coordinates and the trip line are still real OSM/OSRM data.",
  "plant.unnamed": "Unnamed wastewater plant",
  "plant.unnamedWithName": "Unnamed plant · {name}",
  "plant.option": "{name} · {lat}, {lon}",

  // Trip dossier
  "dossier.aria": "Selected trip dossier",
  "dossier.title": "Trip dossier",
  "dossier.empty":
    "Select a trip from the queue. The chain stays open until a plant receipt is recorded.",
  "dossier.paymentReleasedLower": "payment released",
  "dossier.paymentHeldLower": "payment held",
  "dossier.pickup": "Pickup",
  "dossier.plant": "Plant",
  "dossier.distance": "Distance",
  "dossier.osrmLive": "OSRM live",
  "dossier.operator": "Operator",
  "dossier.quoted": "Quoted",
  "dossier.booked": "Booked",
  "dossier.gateLabel": "Plant board OTP",
  "dossier.otpAria": "OTP {otp}",
  "dossier.gateHint":
    "Driver must match this at the weighbridge. It is not proof until a receipt is entered.",
  "dossier.startTrip": "Start trip · en route",
  "dossier.markArrival": "Mark arrival at plant",
  "dossier.otpField": "OTP from plant board",
  "dossier.otpPlaceholder": "4 digits",
  "dossier.receiptField": "Weighbridge receipt ID",
  "dossier.verify": "Verify disposal · release payment",
  "dossier.brokenNote": "No plant receipt. The chain is broken; payment stays held.",
  "dossier.revisit": "Revisit plant · reopen chain",
  "dossier.buildComplaint": "Build a dumping complaint",
  "dossier.openCertificate": "Open disposal certificate",
  "dossier.flagLabel": "Flag this trip (reason required)",
  "dossier.flagPlaceholder": "e.g. receipt missing after 24h",
  "dossier.flagAction": "Flag · break the chain",
  "dossier.gateToken": "Gate token",
  "dossier.pickupOsm": "Pickup on OSM",
  "dossier.plantOsm": "Plant on OSM",

  // Tabs
  "tabs.aria": "Control desk",
  "tabs.book": "Book a trip",
  "tabs.norms": "Desludging norms",
  "tabs.price": "Price check",
  "tabs.act": "Act on a dumping",
  "tabs.oversight": "Oversight",

  // Booking
  "book.title": "Book a desludging",
  "book.lead":
    "The trip is not a trip until OSRM returns a road distance. The chain opens at BOOKED.",
  "book.householdLabel": "Household label",
  "book.householdPlaceholder": "House 12, Janpath",
  "book.pickupAddress": "Pickup address",
  "book.geocodedLive": "geocoded live",
  "book.pickupPlaceholder": "Connaught Place, New Delhi",
  "book.findPickup": "Find pickup",
  "book.nominatimReadout": "Nominatim · {lat}, {lon}",
  "book.noCoords":
    "No coordinates yet. Booking stays disabled — never fake a pickup point.",
  "book.pincode": "Pincode",
  "book.validate": "Validate",
  "book.pinInfo": "{district}, {state} — {count} post offices (e.g. {offices})",
  "book.tankTitle": "Tank + household",
  "book.tankLead":
    "Used for the CPHEEO advice and the quoted-price check. It does not change the route.",
  "book.people": "People using the tank",
  "book.tankCapacity": "Tank capacity (litres)",
  "book.cpheeo": "CPHEEO planning: {headline} — {litres} L of sludge a year.",
  "book.seeFormula": "See the formula",
  "book.plantTitle": "Disposal plant",
  "book.plantLead":
    "Pick a real OSM wastewater-plant record, or geocode a site that is not in OSM.",
  "book.plantRecord": "Plant record",
  "book.otherPlant": "Other — geocode an address",
  "book.osmRecord": "OSM record",
  "book.openRecord": "Open this record on OSM",
  "book.customPlant": "Plant name / address",
  "book.customPlantPlaceholder": "FSTP Najafgarh Delhi",
  "book.geocode": "Geocode",
  "book.notGeocoded": "Not geocoded yet. The book button stays disabled.",
  "book.operator": "Operator",
  "book.vehicle": "Vehicle no.",
  "book.quote": "Quoted price (₹ per trip)",
  "book.sanityCheck": "sanity check",
  "book.bookButton": "Book trip + compute OSRM route",
  "book.noFake":
    "No fake coordinates. If Nominatim or OSRM is down you get an error and a retry, never an invented distance.",
  "book.gateProof": "{id} · gate proof",
  "book.otpLine": "OTP {otp} · {km} km / {min} min (OSRM)",
  "book.copyToken": "Copy token",
  "book.proofFine":
    "Print or scan this at the plant gate. Verification needs the OTP and a weighbridge receipt.",

  // Desludging norms
  "norms.title": "When should this tank be emptied?",
  "norms.lead":
    "CPHEEO plans on 0.067 m³ of sludge per person per year. Enter the household and the tank you actually have.",
  "norms.unit.year": "year",
  "norms.unit.years": "years",
  "norms.formulaLabel": "Formula",
  "norms.formulaDetail":
    "N = {persons} people · annual sludge = {annual} L · 3-year sludge volume = {required} L · theoretical fill time = {years} years.",
  "norms.quickTitle": "Quick reference",
  "norms.quickLead":
    "Computed from the same formula. Years are the recommended interval, capped at the CPHEEO 3-year band.",
  "norms.peopleCol": "People",
  "norms.yearsValue": "{years} yr",
  "norms.septageTitle": "Sanctioned septage projects in your State",
  "norms.septageLead":
    "Queried live from data.gov.in (Ministry of Housing & Urban Affairs), not copied from a report. Choose a State to see how many sewerage and septage projects AMRUT has sanctioned there — the public footprint a trip like this has to reach.",
  "norms.septageStateLabel": "State for the AMRUT project count",
  "norms.querying": "Querying data.gov.in…",
  "norms.septageTotalOne": "{count} project sanctioned in {state}",
  "norms.septageTotal": "{count} projects sanctioned in {state}",
  "norms.septagePhases":
    "AMRUT 1.0: {saap1} · AMRUT 2.0: {saap2} · state share: {saap3}. Fetched {date}.",
  "norms.normLabel": "Norm.",
  "norms.accumulationLabel": "Accumulation.",
  "norms.tankSizeLabel": "Tank size.",
  "norms.link.advisory": "SBM-U advisory (Nov 2024)",
  "norms.link.manual": "CPHEEO manual (2012)",
  "norms.source.interval":
    "SBM-U Advisory on Faecal Sludge and Septage Management in Small and Medium Towns (CPHEEO, November 2024), quoting CPHEEO 2013: clean at least once in 2–3 years if the tank is not overloaded.",
  "norms.source.accumulation":
    "CPHEEO Manual on Sewerage and Sewage Treatment (2012), Table 9.2: 0.067 m³ per capita per year for a 3-year desludging interval (wet conditions).",
  "norms.source.tank":
    "IS 2470 (Part 1):1985, as cited in the SBM-U 2024 advisory: 1.5 m³ effective capacity for a 5-person household at a 3-year cleaning interval.",
  "norms.source.caveat":
    "Planning estimate, not a measurement. Sludge depth must be checked on site. CPHEEO 2012 §9.3.5.3 also says small domestic tanks should be cleaned at least once in 1–2 years; a tank that fills faster than 2 years needs annual emptying.",
  "norms.headline.undersized": "Empty it every year",
  "norms.headline.within": "Within the 2–3 year band",
  "norms.headline.longer": "Cap the interval at 3 years",
  "norms.detail.undersized":
    "At {annual} L of sludge a year, this {tank} L tank reaches its planning limit in {years} years — below the CPHEEO 2–3 year band. Treat it as undersized: desludge annually and plan a larger tank. A 3-year interval needs about {required} L of sludge storage.",
  "norms.detail.within":
    "At {annual} L of sludge a year, this {tank} L tank reaches its planning limit in {years} years. Schedule emptying every {recommended} years, inside the CPHEEO band. Do not wait for an overflow call.",
  "norms.detail.longer":
    "The tank has roughly {years} years of sludge storage at {annual} L a year, but CPHEEO caps the planning interval at 3 years. Book at year 3, not when it overflows.",

  // Price check
  "price.title": "Is the quote in range?",
  "price.lead":
    "Enter what the operator quoted. The benchmark is a notified ULB rate card, not a number we made up.",
  "price.enterQuote": "Enter a quote",
  "price.benchmarkFallback":
    "The cited benchmark is ₹{min}–₹{max} per trip.",
  "price.scaleNote":
    "Scale: ₹0–₹4,000. The yellow band is the cited range. A price inside the band still does not prove safe disposal.",
  "price.coversTitle": "What the benchmark covers",
  "price.coversLead":
    "Residential / mixed-property septic tank collection. Per trip, not per litre.",
  "price.primaryLabel": "Primary.",
  "price.crossCheckLabel": "Cross-check.",
  "price.linkPrimary": "Jharkhand LWM rules 2025",
  "price.linkSecondary": "NMCG septage guide",
  "price.primarySource":
    "Jharkhand Liquid Waste Management & User Charges Rules, 2025, §11: ₹1,500 per trip (residential septic tank), ₹2,500 per trip (mixed property).",
  "price.secondarySource":
    "NMCG / CSE Septage Management: A Practitioner's Guide: a private mechanised truck charges about ₹1,500 per trip.",
  "price.caveat":
    "This is a notified ULB rate card from Jharkhand (2025), cross-checked with the NMCG guide — not a Delhi notified rate. Ask your ULB for its current rate card. A per-trip price is not a per-litre price.",
  "price.adviceTitle": "Three questions before you pay",
  "price.advice1": "Which FSTP/STP will take this load, and what is its gate OTP?",
  "price.advice2": "Will I get the weighbridge slip with the trip ID on it?",
  "price.advice3":
    "Is the quoted price for the trip or for a fixed number of litres?",
  "price.headline.below": "Below the cited range",
  "price.headline.within": "Within the cited range",
  "price.headline.above": "Above the cited range",
  "price.detail.below":
    "₹{quote} is under the ₹1,500–₹2,500 benchmark. An unusually low quote is how a trip gets paid for without a treatment-plant receipt. Ask where the load will be tipped, and require the weighbridge slip before paying.",
  "price.detail.above":
    "₹{quote} is above the ₹1,500–₹2,500 benchmark. Ask for an itemised bill (emptying + transport + treatment fee) and the plant receipt. A high price is not proof of safe disposal.",
  "price.detail.within":
    "₹{quote} sits inside the ₹1,500–₹2,500 benchmark. Price is not proof: the plant OTP and weighbridge receipt still decide whether payment releases.",

  // Act on a dumping
  "act.title": "Build a complaint",
  "act.lead":
    "Generates a formal complaint from the trip record. It adds no facts. Review it, then send it through a real channel.",
  "act.area": "Dumping area",
  "act.areaHint": "defaults to the pickup address",
  "act.areaPlaceholder": "e.g. drain behind Janpath market",
  "act.buildButton": "Build complaint from the trip record",
  "act.building": "Building…",
  "act.copyLabel": "Complaint",
  "act.download": "Download .txt",
  "act.whatsapp": "Open in WhatsApp",
  "act.whatsappFine":
    "WhatsApp truncates long text. Attach the downloaded file if you need the full record.",
  "act.routesTitle": "Where to send it",
  "act.routesLead": "Official routes only. Numbers checked against the linked page on {date}.",
  "act.routesFine":
    "If a number is wrong or changes, use the linked official page — do not trust a number copied from a poster.",
  "help.channel.phone": "Phone",
  "help.channel.appWeb": "App / web",
  "help.channel.web": "Web",
  "help.note.sbm": "National SBM-U helpline; the Swachhata app lists 1969 for app and sanitation queries.",
  "help.note.swachhata":
    "Geo-tagged photo complaint routed to your ULB. Use the trip ID and vehicle number in the description.",
  "help.note.cpgrams":
    "Central public grievance portal. Escalate if the ULB does not respond; attach the complaint text and any photos.",
  "help.note.mcd":
    "MCD citizen call centre. MCD-311 also accepts non-emergency sanitation complaints.",
  "help.note.djb":
    "Water and sewer complaints for DJB-served areas, including sewer overflow and illegal discharge.",
  "help.note.ndmc":
    "NDMC toll-free complaints line for the New Delhi municipal area.",

  // Oversight
  "oversight.kpiTrips": "trips booked",
  "oversight.kpiTripsSub": "pilot-collected",
  "oversight.kpiSafe": "safely disposed",
  "oversight.kpiSafeSub": "verified ÷ (verified + flagged)",
  "oversight.kpiFlagged": "flagged",
  "oversight.kpiFlaggedSub": "no plant receipt",
  "oversight.kpiInFlight": "in flight",
  "oversight.kpiInFlightSub": "chain still open",
  "oversight.kpiAvg": "average trip",
  "oversight.kpiAvgSub": "OSRM live at booking",
  "oversight.hotspotsTitle": "Dumping hotspots",
  "oversight.hotspotsLead":
    "Flagged trips are the ULB inspection queue. A flag is a missing receipt, not a proven dump.",
  "oversight.hotspotsEmpty":
    "No flagged trips. Every completed pilot trip has a plant receipt.",
  "oversight.buildComplaint": "Build complaint",
  "oversight.logTitle": "Verification log",
  "oversight.logLead":
    "Payment releases only on VERIFIED: OTP match plus a weighbridge receipt.",
  "oversight.status": "Status",
  "oversight.receipt": "Receipt",
  "oversight.payment": "Payment",
  "oversight.released": "released",
  "oversight.held": "held",
  "oversight.exportCsv": "Export CSV",
  "oversight.openStats": "Open /api/stats",
  "oversight.callsTitle": "Live calls",
  "oversight.callsLead":
    "Every upstream request this session, with its HTTP status. Failures are shown, never smoothed over.",
  "oversight.time": "Time",
  "oversight.call": "Call",
  "oversight.note": "Note",
  "oversight.noCalls": "No calls yet.",
  "oversight.aiSummary": "Hindi gate script (BharatCode)",
  "oversight.aiLead":
    "Optional field aid. The model is 503-prone; the flow falls back to a template and never blocks verification.",
  "oversight.generate": "Generate",
  "oversight.calling": "Calling…",
  "oversight.aiSource": "Source: {source}",

  // Footer
  "footer.provesTitle": "What this proves",
  "footer.provesBody":
    "A trip is verified only when the plant OTP matches and a weighbridge receipt is recorded. No receipt, no payment. The pilot does not claim a municipal mandate or a measured dumping rate.",
  "footer.builtFor":
    "Built for Code for a Billion · Impact: Sanitation. Trip rows are pilot-collected and labelled.",
  "footer.normsTitle": "Norms + price",
  "footer.linkAdvisory": "SBM-U / CPHEEO FSM advisory (Nov 2024)",
  "footer.linkAdvisoryNote": "2–3 year desludging band",
  "footer.linkManual": "CPHEEO Sewerage & Sewage Treatment manual (2012)",
  "footer.linkManualNote": "0.067 m³/person/yr",
  "footer.linkRates": "Jharkhand LWM & User Charges Rules 2025",
  "footer.linkRatesNote": "₹1,500 / ₹2,500 per trip",
  "footer.linkGuide": "NMCG Septage Practitioner's Guide",
  "footer.linkGuideNote": "₹1,500 per trip",
  "footer.dataTitle": "Problem + data",
  "footer.linkDeaths": "498 sewer/septic-cleaning deaths since Jan 2019",
  "footer.linkDeathsNote": "Central Govt data in Lok Sabha (NCSK reporting)",
  "footer.linkSbmNote": "~4,000 ULBs in scope",
  "footer.linkCensus": "Census 2011 C-08 + NSSO 76th Round",
  "footer.linkCensusNote": "off-sewer context",
  "footer.baseBrand": "Safai Trace · pilot console",
  "footer.baseNote":
    "No fabricated coordinates, plants, distances, prices or phone numbers.",

  // Floating payout card
  "floating.aria": "Payment today",
  "floating.releasedLabel": "Released against plant receipts",
  "floating.held": "Payment held",
  "floating.flagged": "Flagged trips",
  "floating.note": "Held until a weighbridge receipt is entered at the plant.",

  // Toasts and errors
  "toast.booked":
    "{id} booked. OSRM live: {km} km / {min} min. Gate OTP {otp} issued — the chain is open until the plant verifies it.",
  "toast.pincodeOk": "Pincode verified live: {district}, {state}.",
  "toast.geocodePickup":
    "Pickup geocoded live (Nominatim): {lat}, {lon} — {name}",
  "toast.geocodePlant": "Plant geocoded live: {lat}, {lon} — {name}",
  "toast.plantSelected": "Plant selected from OSM: {name} ({lat}, {lon}).",
  "toast.copied": "{label} copied.",
  "toast.clipboardBlocked":
    "Clipboard blocked by the browser. Select the text and copy manually.",
  "toast.csvExported":
    "Exported {count} pilot rows as CSV. Pilot label is a column, not a footnote.",
  "toast.complaintBuilt":
    "Complaint built from the trip record. Review the facts before sending.",
  "toast.selectTripFirst": "Select a trip first.",
  "toast.flagged":
    "{id} flagged. The chain is broken and payment stays held.",
  "toast.statusAdvanced": "{id} → {status}.",
  "toast.verified": "{id} verified at {plant}. Receipt {receipt} recorded. Payment released.",
  "toast.plantsRefreshed": "Plant register refreshed live from {source}.",
  "error.pincode": "Pincode check failed",
  "error.pincodeDown": "Pincode API down. Retry — no fake validation.",
  "error.geocodeNoMatch": "No geocode match. Try a fuller address.",
  "error.nominatim":
    "Nominatim down. Cannot book without real coords — retry.",
  "error.plantNameFirst": "Type a plant name or address first.",
  "error.plantGeocode": "Plant geocode failed.",
  "error.nominatimPlant": "Nominatim down for plant. Retry.",
  "error.geocodeFirst":
    "Geocode the pickup first. Real coordinates are required — no fake tanker locations.",
  "error.choosePlant":
    "Choose a plant from the OSM register, or geocode a custom plant first.",
  "error.operatorVehicle":
    "Operator name and vehicle number are required for the custody record.",
  "error.booking": "Booking failed",
  "error.statusUpdate": "Status update failed",
  "error.update": "Update failed",
  "error.verification": "Verification failed",
  "error.verify": "Verify failed",
  "error.ai": "AI failed",
  "error.aiEndpoint":
    "AI endpoint error: {error}. The field flow does not depend on it.",
  "error.complaint": "Complaint generation failed",
  "error.plantMap": "Plant map unavailable. Open the OSM link or retry.",
  "error.overpassRefresh":
    "Overpass refresh failed ({error}). Showing the dated OSM snapshot — no coordinates were invented.",
  "error.plantMapRetry": "Plant map unavailable. Retry or open OpenStreetMap.",
  "log.pilotTrips": "{count} pilot trips",
  "log.kpis": "ULB KPIs recomputed from pilot rows",
  "log.healthUnavailable": "health unavailable",
  "log.networkError": "network error",
  "log.plantMapUnavailable": "plant map unavailable",
  "log.postOffices": "{count} post offices",
  "log.pickupCoords": "pickup {lat}, {lon}",
  "log.plantCoords": "plant {lat}, {lon}",
  "log.osrmDistance": "OSRM {km} km",
  "log.otpMatch": "OTP match · receipt {receipt}",
  "log.complaintDraft": "draft for {id}",
  "log.aiSource": "source: {source}",
  "log.llmFallback": "LLM: {error} → template fallback",
  "log.staleSuffix": " (stale)",
  "log.liveSuffix": " · live: {error}",

  // Septage dataset states
  "septage.unconfigured":
    "No data.gov.in key is configured, so this figure is not shown rather than guessed.",
  "septage.noRow": "data.gov.in has no AMRUT row for {state}. No figure is shown.",
  "septage.error": "data.gov.in could not be reached just now.",

  // Official-document notice
  "doc.englishOnly": "Official documents are issued in English.",

  // Certificate chrome (the certificate body stays English)
  "cert.back": "← Back to the console",
  "cert.print": "Print / save as PDF",
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
export type LocaleMessages = Partial<Messages>;
