import { NextResponse } from "next/server";
import { getStats, listTrips } from "../../../lib/db";

export async function GET() {
  const stats = getStats();
  const trips = listTrips().map((t) => ({
    id: t.id, status: t.status, plantName: t.plantName, householdAddress: t.householdAddress,
    distanceKm: t.distanceKm, operatorName: t.operatorName, vehicleNo: t.vehicleNo,
    receiptId: t.receiptId, flaggedReason: t.flaggedReason, pilot: t.pilot, source: t.source, createdAt: t.createdAt,
  }));
  return NextResponse.json({ ok: true, stats, trips, note: "Pilot-collected trips only. Govt baseline stats are cited, not derived from pilot data." });
}
