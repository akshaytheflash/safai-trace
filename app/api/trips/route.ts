import { NextResponse } from "next/server";
import { listTrips, createTrip, nextTripId } from "../../../lib/db";
import { osrmRoute } from "../../../lib/apis";

export async function GET() {
  return NextResponse.json({ ok: true, trips: listTrips(), note: "Trip records are pilot-collected; coords from Nominatim, distances from OSRM. Govt stats are cited separately." });
}

function genOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function POST(req: Request) {
  const body = await req.json();
  const { householdLabel, householdAddress, householdPincode, householdLat, householdLon, plantName, plantAddress, plantLat, plantLon, operatorName, vehicleNo } = body;
  if (!householdAddress || householdLat == null || householdLon == null || !plantName || plantLat == null || plantLon == null || !operatorName || !vehicleNo) {
    return NextResponse.json({ error: "Missing fields. Geocode household + plant first (real coords required)." }, { status: 400 });
  }
  let distanceKm: number | null = null;
  let durationMin: number | null = null;
  let routeSource = "OSRM live";
  try {
    const r = await osrmRoute(Number(householdLat), Number(householdLon), Number(plantLat), Number(plantLon));
    distanceKm = r.distanceKm;
    durationMin = r.durationMin;
  } catch (e) {
    return NextResponse.json({ error: `OSRM failed: ${e instanceof Error ? e.message : "error"}. No fake distance shown — fix coords or retry.` }, { status: 502 });
  }
  const trip = createTrip({
    id: nextTripId(),
    householdLabel: householdLabel || householdAddress,
    householdAddress,
    householdPincode: householdPincode || "",
    householdLat: Number(householdLat),
    householdLon: Number(householdLon),
    plantName,
    plantAddress,
    plantLat: Number(plantLat),
    plantLon: Number(plantLon),
    operatorName,
    vehicleNo,
    distanceKm,
    durationMin,
    routeSource,
    status: "BOOKED",
    plantOtp: genOtp(),
    receiptId: null,
    verifiedAt: null,
    flaggedReason: null,
    createdAt: new Date().toISOString(),
    paymentReleased: false,
    pilot: true,
    source: "pilot-collected (Nominatim + OSRM live at booking)",
  });
  return NextResponse.json({ ok: true, trip, message: "Booked. Share OTP + QR token with plant operator at FSTP/STP weighbridge." });
}
