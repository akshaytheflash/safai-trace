import { NextResponse } from "next/server";
import { AMRUT_DATASET_TITLE, AMRUT_RESOURCE_URL, septageForState } from "@/lib/septage";

export const runtime = "nodejs";

/** Live AMRUT septage-project row for a State/UT, from data.gov.in. Cached 6h. */
export async function GET(req: Request) {
  const state = new URL(req.url).searchParams.get("state");
  if (!state) return NextResponse.json({ error: "state query parameter required" }, { status: 400 });
  const result = await septageForState(state);
  return NextResponse.json(
    { ...result, dataset: AMRUT_DATASET_TITLE, sourceUrl: AMRUT_RESOURCE_URL },
    { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } }
  );
}
