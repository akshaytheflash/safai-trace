import { NextResponse } from "next/server";
import { getTrip } from "../../../lib/db";
import { buildComplaint } from "../../../lib/norms";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { tripId?: string; area?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON body with tripId required" }, { status: 400 });
  }
  if (!body.tripId) return NextResponse.json({ error: "tripId required" }, { status: 400 });
  const trip = getTrip(body.tripId);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (trip.status === "VERIFIED") {
    return NextResponse.json(
      { error: "This trip has a plant receipt. A dumping complaint needs an unverified or flagged trip." },
      { status: 409 },
    );
  }
  const text = buildComplaint(trip, body.area);
  return NextResponse.json({
    ok: true,
    text,
    tripId: trip.id,
    evidence: {
      status: trip.status,
      receiptId: trip.receiptId,
      verifiedAt: trip.verifiedAt,
      distanceKm: trip.distanceKm,
      flaggedReason: trip.flaggedReason,
    },
    note: "Generated from the trip record only. No facts are added. Review before sending.",
  });
}
