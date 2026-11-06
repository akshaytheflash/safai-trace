// BharatCode OpenAI-compatible LLM — server-side only. Exponential backoff + template fallback.

const BASE = process.env.BHARATCODE_BASE_URL || "https://bharatcode.ai/api/model/v1";
const MODEL = process.env.BHARATCODE_MODEL || "qwen-3.8-27b";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function chatWithBackoff(system: string, user: string) {
  const key = process.env.BHARATCODE_API_KEY;
  if (!key) return { text: null, source: "no-key", error: "BHARATCODE_API_KEY not set on server" };
  let lastError = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: MODEL, messages: [{ role: "system", content: system }, { role: "user", content: user }], max_tokens: 700, temperature: 0.3 }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (typeof text === "string" && text.trim()) return { text: text.trim(), source: `bharatcode:${MODEL}`, error: null };
        lastError = "empty completion";
      } else {
        lastError = `HTTP ${res.status}`;
        if (res.status !== 429 && res.status !== 503 && res.status < 500) break;
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : "fetch error";
    }
    if (attempt < 3) await sleep(600 * Math.pow(2, attempt) + Math.random() * 200);
  }
  return { text: null as string | null, source: "template-fallback", error: lastError };
}

export function templateFallback(kind: string, context: Record<string, string>): string {
  if (kind === "otp") {
    return [
      `Namaste, main Safai Trace se bol raha hoon. Trip ${context.tripId || "—"} ke liye aapka plant OTP hai: ${context.otp || "—"}.`,
      `Tanker No. ${context.vehicle || "—"} ko ${context.plant || "plant"} me sludge dalne se pehle OTP verify karein, weighbridge receipt par ye OTP likhna zaroori hai.`,
      `Bina receipt ke payment release nahi hoga. Dhanyavaad.`,
    ].join("\n");
  }
  if (kind === "complaint") {
    return [
      `To: Executive Officer, Municipal Corporation — Safai Trace Report`,
      `Subject: Report of unsafe faecal-sludge dumping near ${context.area || "reported location"} on ${new Date().toISOString().slice(0, 10)}`,
      ``,
      `Mahoday, dinank ${context.date || ""} ko ${context.area || ""} me raat me tanker se sludge dumping dekha gaya. Trip ${context.tripId || ""} is samay FLAGGED sthiti me hai kyunki plant receipt uplabdh nahi hui.`,
      `Kripya sthaniya janch, CCTV/route record review aur karravai ka request hai. SBM 2.0 / CPHEEO FSM (2020) ke anusaar sludge ka surakshit nistarhan FSTP/STP par hona chahiye.`,
      `— Safai Trace pilot report (pilot-collected data)`,
    ].join("\n");
  }
  return [
    `SBM 2.0 Faecal Sludge Management (CPHEEO Manual 2020) — chain: containment → emptying → transport → treatment at FSTP/STP → safe reuse/disposal.`,
    `Night dumping breaks the chain between transport and treatment: sludge reaches drains, not the plant.`,
    `Safai Trace makes proof cheap: household booking → GPS trip (real coords + OSRM distance) → plant OTP + weighbridge receipt → ULB dashboard.`,
    `No plant receipt = FLAGGED hotspot, payment held. Receipt present = VERIFIED, payment released.`,
    `Pilot rule: operator-first (one tanker + one weighbridge), ULB dashboard second. Replicates to ~4,000 SBM 2.0 ULBs.`,
  ].join("\n");
}
