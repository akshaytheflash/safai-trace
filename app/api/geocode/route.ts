import { NextResponse } from "next/server";
import { geocode } from "../../../lib/apis";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });
  try {
    const results = await geocode(q);
    return NextResponse.json({ ok: true, q, results, source: "OpenStreetMap Nominatim — live geocoding (real coords)" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Nominatim error. Retry." }, { status: 502 });
  }
}
