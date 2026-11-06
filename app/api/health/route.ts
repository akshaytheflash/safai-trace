import { NextResponse } from "next/server";
import { checkLiveApis } from "../../../lib/apis";

export async function GET() {
  const apis = await checkLiveApis();
  const llmConfigured = Boolean(process.env.BHARATCODE_API_KEY);
  return NextResponse.json({ ok: true, apis, llmConfigured, note: "No fake coords: if an API is down, the UI shows error + retry and never invents distances." });
}
