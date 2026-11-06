import { NextResponse } from "next/server";
import { getTrip, updateTripStatus, getDb } from "../../../../../lib/db";

// Plant proof: driver enters OTP displayed at plant QR/weighbridge board + receipt id.
// No receipt = no verification, no payment.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { otp, receiptId, weightNote } = await req.json();
  const trip = getTrip(params.id);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (trip.status === "VERIFIED") return NextResponse.json({ error: "Already verified" }, { status: 409 });
  if (!otp || String(otp).trim() !== trip.plantOtp) {
    return NextResponse.json({ error: "OTP mismatch. Check OTP from plant board/weighbridge display and retry. Wrong OTP does not release payment." }, { status: 401 });
  }
  if (!receiptId || !String(receiptId).trim()) {
    return NextResponse.json({ error: "Plant receipt / weighbridge slip ID required. No receipt = no payment (SBM 2.0 FSM chain of custody)." }, { status: 400 });
  }
  const now = new Date().toISOString();
  getDb().prepare(`INSERT OR IGNORE INTO receipts (id,tripId,otp,plantName,verifiedAt,weightNote) VALUES (?,?,?,?,?,?)`).run(String(receiptId).trim(), trip.id, trip.plantOtp, trip.plantName, now, weightNote || "");
  const updated = updateTripStatus(trip.id, "VERIFIED", { receiptId: String(receiptId).trim(), verifiedAt: now, paymentReleased: true, flaggedReason: null });
  return NextResponse.json({ ok: true, trip: updated, message: `Verified at ${trip.plantName}. Receipt ${receiptId} recorded. Payment released.` });
}
