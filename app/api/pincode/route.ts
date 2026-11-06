import { NextResponse } from "next/server";
import { validatePincode } from "../../../lib/apis";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pincode = (searchParams.get("pincode") || "").trim();
  if (!/^\d{6}$/.test(pincode)) return NextResponse.json({ error: "Enter a 6-digit Indian pincode" }, { status: 400 });
  try {
    const data = await validatePincode(pincode);
    return NextResponse.json({ ok: true, pincode, ...data, source: "India Post API (api.postalpincode.in) — live" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Postal API error. Retry in a moment." }, { status: 502 });
  }
}
