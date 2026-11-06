import { NextResponse } from "next/server";
import { getTrip, updateTripStatus } from "../../../../../lib/db";
import type { TripStatus } from "../../../../../lib/db";

const FLOW: Record<string, TripStatus[]> = {
  BOOKED: ["EN_ROUTE"],
  EN_ROUTE: ["AT_PLANT"],
  AT_PLANT: ["FLAGGED"],
  FLAGGED: ["AT_PLANT"],
};

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { to, reason } = await req.json();
  const trip = getTrip(params.id);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  const allowed = FLOW[trip.status] || [];
  if (!allowed.includes(to)) return NextResponse.json({ error: `Cannot move ${trip.status} → ${to}. Use plant verification to reach VERIFIED.` }, { status: 409 });
  if (to === "FLAGGED" && !reason) return NextResponse.json({ error: "Flag reason required" }, { status: 400 });
  const updated = updateTripStatus(trip.id, to, to === "FLAGGED" ? { flaggedReason: String(reason), paymentReleased: false } : {});
  return NextResponse.json({ ok: true, trip: updated });
}
