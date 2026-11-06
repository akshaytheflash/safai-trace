import { NextResponse } from "next/server";
import { chatWithBackoff, templateFallback } from "../../../lib/llm";

export async function POST(req: Request) {
  const { kind, tripId, otp, plant, vehicle, area, date } = await req.json();
  if (kind === "otp") {
    const sys = "You write short Hindi caller scripts for a sanitation desludging pilot (SBM 2.0). Keep it 3-4 lines, polite, mention OTP, plant name, vehicle, and receipt requirement.";
    const usr = `Trip: ${tripId}. OTP: ${otp}. Plant: ${plant}. Vehicle: ${vehicle}. Write a Hindi phone script for the plant operator to read aloud.`;
    const llm = await chatWithBackoff(sys, usr);
    const text = llm.text ?? templateFallback("otp", { tripId, otp, plant, vehicle });
    return NextResponse.json({ ok: true, text, source: llm.source, llmError: llm.error });
  }
  if (kind === "complaint") {
    const sys = "You draft formal Hindi complaints to a ULB Executive Officer about unsafe faecal sludge dumping, citing SBM 2.0 and CPHEEO FSM (2020).";
    const usr = `Area/location: ${area}. Date: ${date}. Trip: ${tripId}. Draft a complaint citing that no plant receipt means payment stays on hold and FSM requires treatment at FSTP/STP.`;
    const llm = await chatWithBackoff(sys, usr);
    const text = llm.text ?? templateFallback("complaint", { area, date, tripId });
    return NextResponse.json({ ok: true, text, source: llm.source, llmError: llm.error });
  }
  if (kind === "explain") {
    const sys = "You explain SBM 2.0 faecal sludge management in simple English for a hackathon judge. Cite CPHEEO FSM manual (2020) chain: containment, emptying, transport, treatment, reuse/disposal.";
    const llm = await chatWithBackoff(sys, "Explain in 8 lines why proof-of-disposal (plant OTP + weighbridge receipt) stops night dumping, and how Safai Trace fits SBM 2.0.");
    const text = llm.text ?? templateFallback("explain", { tripId: "" });
    return NextResponse.json({ ok: true, text, source: llm.source, llmError: llm.error });
  }
  return NextResponse.json({ error: "kind must be otp|complaint|explain" }, { status: 400 });
}
