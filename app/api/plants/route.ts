import { NextResponse } from "next/server";
import {
  DELHI_BBOX,
  PLANTS_SNAPSHOT,
  fetchOverpassPlants,
  readPlantCache,
} from "../../../lib/plants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OSM_URL = "https://www.openstreetmap.org/#map=11/28.64/77.20";
const FRESH_MS = 45 * 24 * 60 * 60 * 1000;
const CACHE_FRESH_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  const cache = readPlantCache();
  const cacheAge = cache ? Date.now() - Date.parse(cache.fetchedAt) : Infinity;
  const snapshotAge = Date.now() - Date.parse(PLANTS_SNAPSHOT.fetchedAt);

  if (!refresh && cache && cacheAge < CACHE_FRESH_MS) {
    return NextResponse.json({
      ok: true,
      plants: cache.plants,
      source: "overpass-cache",
      fetchedAt: cache.fetchedAt,
      bbox: DELHI_BBOX,
      license: PLANTS_SNAPSHOT.license,
      note: PLANTS_SNAPSHOT.note,
      osmUrl: OSM_URL,
      stale: false,
    });
  }

  if (!refresh && snapshotAge < FRESH_MS) {
    return NextResponse.json({
      ok: true,
      plants: PLANTS_SNAPSHOT.plants,
      source: "osm-snapshot",
      fetchedAt: PLANTS_SNAPSHOT.fetchedAt,
      bbox: DELHI_BBOX,
      license: PLANTS_SNAPSHOT.license,
      note: PLANTS_SNAPSHOT.note,
      osmUrl: OSM_URL,
      stale: false,
      namedCount: PLANTS_SNAPSHOT.namedCount,
    });
  }

  try {
    const live = await fetchOverpassPlants();
    return NextResponse.json({
      ok: true,
      plants: live.plants,
      source: "overpass-live",
      mirror: live.mirror,
      fetchedAt: live.fetchedAt,
      bbox: DELHI_BBOX,
      license: PLANTS_SNAPSHOT.license,
      note: PLANTS_SNAPSHOT.note,
      osmUrl: OSM_URL,
      stale: false,
      attempts: live.attempts,
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : "Overpass request failed";
    if (PLANTS_SNAPSHOT.plants.length) {
      return NextResponse.json({
        ok: true,
        plants: PLANTS_SNAPSHOT.plants,
        source: "osm-snapshot",
        fetchedAt: PLANTS_SNAPSHOT.fetchedAt,
        bbox: DELHI_BBOX,
        license: PLANTS_SNAPSHOT.license,
        note: PLANTS_SNAPSHOT.note,
        osmUrl: OSM_URL,
        stale: true,
        liveError: error,
      });
    }
    return NextResponse.json(
      {
        ok: false,
        error: `Plant map unavailable — all Overpass mirrors failed. ${error}`,
        osmUrl: OSM_URL,
        retry: "/api/plants?refresh=1",
      },
      { status: 503 },
    );
  }
}
