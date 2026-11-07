// Live API helpers — real govt / open APIs only. No mock fallback coords.

export async function validatePincode(pincode: string) {
  const res = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pincode)}`);
  if (!res.ok) throw new Error(`Postal API HTTP ${res.status}`);
  const data = await res.json();
  const entry = data?.[0];
  if (!entry || entry.Status !== "Success" || !entry.PostOffice?.length) {
    throw new Error("Pincode not found in India Post database");
  }
  return {
    district: entry.PostOffice[0].District,
    state: entry.PostOffice[0].State,
    postOffices: entry.PostOffice.slice(0, 5).map((p: { Name: string }) => p.Name),
    count: entry.PostOffice.length,
  };
}

export async function geocode(query: string) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
  const res = await fetch(url, { headers: { "User-Agent": "SafaiTrace/1.0 (hackathon pilot)" } });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) throw new Error("No match from Nominatim");
  return data.map((r: { lat: string; lon: string; display_name: string; name?: string }) => ({
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    displayName: r.display_name,
    name: r.name || r.display_name.split(",")[0],
  }));
}

export async function osrmRoute(fromLat: number, fromLon: number, toLat: number, toLon: number) {
  // OSRM expects lon,lat order. Full geometry is stored so the map draws the
  // road route that OSRM actually returned — never a decorative straight line.
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson&steps=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) throw new Error(data.message || "OSRM no route");
  const r = data.routes[0];
  const geometry: [number, number][] = Array.isArray(r.geometry?.coordinates)
    ? r.geometry.coordinates.map((c: [number, number]) => [
        Math.round(c[1] * 1e6) / 1e6,
        Math.round(c[0] * 1e6) / 1e6,
      ])
    : [];
  return {
    distanceKm: Math.round((r.distance / 1000) * 100) / 100,
    durationMin: Math.round((r.duration / 60) * 10) / 10,
    geometry,
  };
}

export async function checkLiveApis() {
  const checks: Record<string, string> = {};
  try {
    await validatePincode("110001");
    checks.postal = "ok";
  } catch (e) {
    checks.postal = `down: ${e instanceof Error ? e.message : "error"}`;
  }
  try {
    await geocode("Connaught Place, New Delhi");
    checks.nominatim = "ok";
  } catch (e) {
    checks.nominatim = `down: ${e instanceof Error ? e.message : "error"}`;
  }
  try {
    await osrmRoute(28.6317, 77.2193, 28.5475, 77.2828);
    checks.osrm = "ok";
  } catch (e) {
    checks.osrm = `down: ${e instanceof Error ? e.message : "error"}`;
  }
  return checks;
}
