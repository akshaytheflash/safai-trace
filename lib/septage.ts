// Live query of the Min. of Housing & Urban Affairs dataset on data.gov.in:
// "State/UT-wise Data of the Total Number of Sewerage & Septage Management
// Projects Sanctioned under AMRUT (reply to Unstarred Question, 20 March 2023)".
//
// No key in source. Without DATA_GOV_API_KEY this returns an "unconfigured"
// result and the UI says so — it never substitutes a remembered figure.

const RESOURCE_ID = "00e11c0d-8803-4ba5-96e6-e6b4b1b5d5e3";
export const AMRUT_RESOURCE_URL = `https://api.data.gov.in/resource/${RESOURCE_ID}`;
export const AMRUT_DATASET_TITLE =
  "Sewerage & Septage Management projects sanctioned under AMRUT (Ministry of Housing & Urban Affairs), reply to Unstarred Question, 20 March 2023";

/** States and UTs as spelled in the AMRUT dataset's own rows. */
export const AMRUT_STATES = [
  "Andaman and Nicobar", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli", "Daman and Diu", "Delhi",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand",
  "Karnataka", "Kerala", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Pondicherry", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export type SeptageStats =
  | {
      ok: true;
      state: string;
      phases: { saap1: number | null; saap2: number | null; saap3: number | null };
      total: number;
      fetchedAt: string;
    }
  | { ok: false; reason: "unconfigured" | "no-row" | "error"; message: string };

const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** data.gov.in spells States differently from a pincode API. Map the few that differ. */
const ALIASES: Record<string, string> = {
  "nct of delhi": "Delhi",
  delhi: "Delhi",
  "andaman and nicobar islands": "Andaman and Nicobar",
  "daman and diu": "Daman and Diu",
  "dadra and nagar haveli": "Dadra and Nagar Haveli",
  puducherry: "Pondicherry",
  pondicherry: "Pondicherry",
  orissa: "Odisha",
  uttaranchal: "Uttarakhand",
};

export function normaliseState(raw: string): string {
  const key = raw.trim().toLowerCase();
  return ALIASES[key] ?? raw.trim();
}

type Cache = { at: number; rows: Array<Record<string, unknown>> };
let cache: Cache | null = null;
const TTL_MS = 6 * 60 * 60 * 1000;

async function fetchRows(): Promise<Array<Record<string, unknown>>> {
  const key = process.env.DATA_GOV_API_KEY;
  if (!key) throw Object.assign(new Error("unconfigured"), { code: "unconfigured" });
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  const url = `${AMRUT_RESOURCE_URL}?api-key=${key}&format=json&limit=100`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`data.gov.in returned HTTP ${res.status}`);
  const json = (await res.json()) as { records?: Array<Record<string, unknown>> };
  const rows = json.records ?? [];
  cache = { at: Date.now(), rows };
  return rows;
}

export async function septageForState(rawState: string): Promise<SeptageStats> {
  const state = normaliseState(rawState);
  let rows: Array<Record<string, unknown>>;
  try {
    rows = await fetchRows();
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "unconfigured") {
      return {
        ok: false,
        reason: "unconfigured",
        message: "No data.gov.in key is configured, so this figure is not shown rather than guessed.",
      };
    }
    return { ok: false, reason: "error", message: e instanceof Error ? e.message : "data.gov.in unavailable" };
  }

  const row = rows.find((r) => normaliseState(String(r.state___ut ?? "")) === state);
  if (!row) {
    return {
      ok: false,
      reason: "no-row",
      message: `data.gov.in has no AMRUT row for ${state}. No figure is shown.`,
    };
  }
  const total = num(row._total) ?? 0;
  return {
    ok: true,
    state,
    phases: { saap1: num(row.saap_1), saap2: num(row.saap_2), saap3: num(row.saap_3) },
    total,
    fetchedAt: new Date().toISOString(),
  };
}
