import { NextResponse } from "next/server";
import { osrmRoute } from "../../../lib/apis";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fromLat = parseFloat(searchParams.get("fromLat") || "");
  const fromLon = parseFloat(searchParams.get("fromLon") || "");
  const toLat = parseFloat(searchParams.get("toLat") || "");
  const toLon = parseFloat(searchParams.get("toLon") || "");
  if (Number.isNaN(fromLat) || Number.isNaN(fromLon) || Number.isNaN(toLat) || Number.isNaN(toLon)) {
    return NextResponse.json({ error: "fromLat/fromLon/toLat/toLon required (real coords only)" }, { status: 400 });
  }
  try {
    const data = await osrmRoute(fromLat, fromLon, toLat, toLon);
    return NextResponse.json({ ok: true, ...data, source: "OSRM public demo server — live routing" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "OSRM error. Retry." }, { status: 502 });
  }
}
