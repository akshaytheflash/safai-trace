import fs from "node:fs";
import path from "node:path";
import snapshotJson from "@/data/plants-delhi.json";

export type Plant = {
  id: string;
  name: string | null;
  operator: string | null;
  description: string | null;
  lat: number;
  lon: number;
  osmType: string;
  osmId: number;
  tags: { man_made: string | null; amenity: string | null; official_name: string | null };
  osmUrl: string;
};

export type PlantSnapshot = {
  snapshot: string;
  fetchedAt: string;
  fetchedDate: string;
  mirror: string;
  query: string;
  bbox: { south: number; west: number; north: number; east: number };
  license: string;
  note: string;
  count: number;
  namedCount: number;
  plants: Plant[];
};

export const PLANTS_SNAPSHOT = snapshotJson as unknown as PlantSnapshot;
export const DELHI_BBOX = PLANTS_SNAPSHOT.bbox;

export const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

export type OverpassAttempt = { mirror: string; status: number | null; error: string | null };

export function buildOverpassQuery(bbox = DELHI_BBOX) {
  const b = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  return `[out:json][timeout:60];(nwr["man_made"="wastewater_plant"](${b});nwr["amenity"="wastewater_plant"](${b}););out center tags;`;
}

function normalize(elements: Array<Record<string, unknown>>, bbox = DELHI_BBOX): Plant[] {
  const seen = new Set<string>();
  const out: Plant[] = [];
  for (const e of elements) {
    const center = e.center as { lat?: number; lon?: number } | undefined;
    const lat = typeof e.lat === "number" ? e.lat : center?.lat;
    const lon = typeof e.lon === "number" ? e.lon : center?.lon;
    if (typeof lat !== "number" || typeof lon !== "number") continue;
    if (lat < bbox.south || lat > bbox.north || lon < bbox.west || lon > bbox.east) continue;
    const id = `${e.type}/${e.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const tags = (e.tags || {}) as Record<string, string>;
    out.push({
      id,
      name: tags.name || null,
      operator: tags.operator || null,
      description: tags.description || null,
      lat: Math.round(lat * 1e7) / 1e7,
      lon: Math.round(lon * 1e7) / 1e7,
      osmType: String(e.type),
      osmId: Number(e.id),
      tags: {
        man_made: tags.man_made || null,
        amenity: tags.amenity || null,
        official_name: tags.official_name || null,
      },
      osmUrl: `https://www.openstreetmap.org/${e.type}/${e.id}`,
    });
  }
  return out.sort((a, b) => (a.name ? 0 : 1) - (b.name ? 0 : 1) || (a.name || "").localeCompare(b.name || ""));
}

const CACHE_PATH = process.env.VERCEL
  ? "/tmp/safai-plants-cache.json"
  : path.join(process.cwd(), "data", "plants-cache.json");

type Cache = { fetchedAt: string; bbox: { south: number; west: number; north: number; east: number }; plants: Plant[] };

export function readPlantCache(): Cache | null {
  try {
    const c = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) as Cache;
    if (!Array.isArray(c.plants) || !c.plants.length) return null;
    return c;
  } catch {
    return null;
  }
}

function writePlantCache(plants: Plant[]) {
  try {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify({ fetchedAt: new Date().toISOString(), bbox: DELHI_BBOX, plants }));
  } catch {
    // Read-only or full filesystem: the bundled dated snapshot remains the fallback.
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchOverpassPlants(): Promise<{
  plants: Plant[];
  mirror: string;
  fetchedAt: string;
  attempts: OverpassAttempt[];
}> {
  const query = buildOverpassQuery();
  const body = new URLSearchParams({ data: query }).toString();
  const attempts: OverpassAttempt[] = [];

  for (let round = 0; round < 2; round++) {
    for (const mirror of OVERPASS_MIRRORS) {
      const started = Date.now();
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 15000);
        const res = await fetch(mirror, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
            "User-Agent": "SafaiTrace/1.0 (SBM 2.0 FSM pilot)",
          },
          body,
          signal: ctrl.signal,
          cache: "no-store",
        });
        clearTimeout(timer);
        if (!res.ok) {
          attempts.push({ mirror, status: res.status, error: `HTTP ${res.status}` });
          continue;
        }
        const data = (await res.json()) as { elements?: Array<Record<string, unknown>> };
        const plants = normalize(data.elements || []);
        if (!plants.length) {
          attempts.push({ mirror, status: res.status, error: "HTTP 200 but 0 plant records" });
          continue;
        }
        attempts.push({ mirror, status: res.status, error: null });
        writePlantCache(plants);
        return { plants, mirror, fetchedAt: new Date().toISOString(), attempts };
      } catch (e) {
        const msg = e instanceof Error ? (e.name === "AbortError" ? "timeout after 15s" : e.message) : "network error";
        attempts.push({ mirror, status: null, error: `${msg} (${Date.now() - started}ms)` });
      }
    }
    if (round === 0) await sleep(900);
  }
  throw new Error(attempts.map((a) => `${a.mirror}: ${a.error || a.status}`).join(" | "));
}
