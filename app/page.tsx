"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PlantMap from "./components/PlantMap";
import type { Plant } from "@/lib/plants";
import {
  CPHEEO,
  HELP_ROUTES,
  HELP_VERIFIED_ON,
  PRICE_BENCHMARK,
  calculateDesludging,
  checkPrice,
} from "@/lib/norms";
import { AMRUT_DATASET_TITLE, AMRUT_RESOURCE_URL, AMRUT_STATES, type SeptageStats } from "@/lib/septage";

type Tab = "book" | "norms" | "price" | "act" | "oversight";
type Msg = { kind: "err" | "ok" | "info"; text: string } | null;

type Trip = {
  id: string;
  householdLabel: string;
  householdAddress: string;
  householdPincode: string;
  householdLat: number;
  householdLon: number;
  plantName: string;
  plantAddress: string;
  plantLat: number;
  plantLon: number;
  operatorName: string;
  vehicleNo: string;
  distanceKm: number | null;
  durationMin: number | null;
  routeSource: string;
  routeGeometry: string | null;
  quotedPrice: number | null;
  status: string;
  plantOtp: string;
  receiptId: string | null;
  verifiedAt: string | null;
  flaggedReason: string | null;
  createdAt: string;
  paymentReleased: boolean;
  pilot: boolean;
  source: string;
};

type Stats = {
  total: number;
  verified: number;
  flagged: number;
  inFlight: number;
  pctSafe: number;
  pctSafeOfAll: number;
  avgKm: number;
};

type Health = { apis?: Record<string, string>; llmConfigured?: boolean };

type PlantsPayload = {
  ok?: boolean;
  plants?: Plant[];
  source?: string;
  fetchedAt?: string;
  stale?: boolean;
  liveError?: string;
  osmUrl?: string;
  license?: string;
  note?: string;
  namedCount?: number;
  error?: string;
};

type CallLog = { id: string; label: string; status: number | null; note: string; at: string };

const STATUS_LABEL: Record<string, string> = {
  BOOKED: "BOOKED",
  EN_ROUTE: "EN ROUTE",
  AT_PLANT: "AT PLANT",
  VERIFIED: "VERIFIED",
  FLAGGED: "FLAGGED",
};

const STATIONS = [
  { key: "BOOKED", name: "Booked", note: "job logged" },
  { key: "EN_ROUTE", name: "En route", note: "tanker moving" },
  { key: "AT_PLANT", name: "At plant", note: "at the gate" },
  { key: "VERIFIED", name: "Verified", note: "receipt sealed" },
];

const TABS: { id: Tab; label: string }[] = [
  { id: "book", label: "Book a trip" },
  { id: "norms", label: "Desludging norms" },
  { id: "price", label: "Price check" },
  { id: "act", label: "Act on a dumping" },
  { id: "oversight", label: "Oversight" },
];

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function plantDisplayName(p: Plant) {
  if (!p.name) return "Unnamed wastewater plant";
  if (/^\d+(\.\d+)?\s*MGD$/i.test(p.name)) return `Unnamed plant · ${p.name}`;
  return p.name;
}

function csvCell(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("book");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const [callLog, setCallLog] = useState<CallLog[]>([]);

  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantMeta, setPlantMeta] = useState<PlantsPayload | null>(null);
  const [plantsLoading, setPlantsLoading] = useState(true);
  const [plantsRefreshing, setPlantsRefreshing] = useState(false);

  // booking
  const [hhLabel, setHhLabel] = useState("");
  const [hhAddress, setHhAddress] = useState("Connaught Place, New Delhi");
  const [pincode, setPincode] = useState("110001");
  const [pinInfo, setPinInfo] = useState<string | null>(null);
  const [hhCoords, setHhCoords] = useState<{ lat: number; lon: number; displayName: string } | null>(null);
  const [plantId, setPlantId] = useState("");
  const [plantMode, setPlantMode] = useState<"osm" | "custom">("osm");
  const [customPlant, setCustomPlant] = useState("");
  const [plantCoords, setPlantCoords] = useState<{ lat: number; lon: number; displayName: string } | null>(null);
  const [operator, setOperator] = useState("Ramesh Kumar (pilot operator)");
  const [vehicle, setVehicle] = useState("DL-1LS-4201");
  const [quote, setQuote] = useState("1800");
  const [persons, setPersons] = useState(5);
  const [tankLitres, setTankLitres] = useState(1500);
  const [lastTrip, setLastTrip] = useState<Trip | null>(null);
  const [septageState, setSeptageState] = useState("Delhi");
  const [septage, setSeptage] = useState<SeptageStats | null>(null);
  const [septageLoading, setSeptageLoading] = useState(false);

  // operator
  const [verifyMap, setVerifyMap] = useState<Record<string, { otp: string; receiptId: string }>>({});
  const [flagReason, setFlagReason] = useState<Record<string, string>>({});

  // complaint
  const [complaintTripId, setComplaintTripId] = useState("");
  const [complaintArea, setComplaintArea] = useState("");
  const [complaintText, setComplaintText] = useState("");
  const [complaintBusy, setComplaintBusy] = useState(false);

  // ai
  const [aiTripId, setAiTripId] = useState("");
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const logCall = useCallback((label: string, status: number | null, note: string) => {
    setCallLog((prev) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          label,
          status,
          note,
          at: new Date().toLocaleTimeString("en-IN", { hour12: false }),
        },
        ...prev,
      ].slice(0, 50),
    );
  }, []);

  const loadPlants = useCallback(
    async (refresh = false) => {
      if (refresh) setPlantsRefreshing(true);
      try {
        const r = await fetch(`/api/plants${refresh ? "?refresh=1" : ""}`, { cache: "no-store" });
        const d = (await r.json()) as PlantsPayload;
        const note = d.ok
          ? `${d.source}${d.stale ? " (stale)" : ""}${d.liveError ? ` · live: ${d.liveError}` : ""}`
          : d.error || "plant map unavailable";
        logCall(`GET /api/plants${refresh ? "?refresh=1" : ""}`, r.status, note);
        setPlantMeta(d);
        if (d.ok && Array.isArray(d.plants)) setPlants(d.plants);
        if (!d.ok) setMsg({ kind: "err", text: d.error || "Plant map unavailable. Open the OSM link or retry." });
        else if (refresh) {
          setMsg(
            d.stale
              ? { kind: "err", text: `Overpass refresh failed (${d.liveError || "all mirrors"}). Showing the dated OSM snapshot — no coordinates were invented.` }
              : { kind: "ok", text: `Plant register refreshed live from ${d.source === "overpass-live" ? "Overpass" : d.source}.` },
          );
        }
      } catch (e) {
        logCall("GET /api/plants", null, e instanceof Error ? e.message : "network error");
        setPlantMeta({ ok: false, error: e instanceof Error ? e.message : "Plant map unavailable" });
        setMsg({ kind: "err", text: "Plant map unavailable. Retry or open OpenStreetMap." });
      } finally {
        setPlantsRefreshing(false);
        setPlantsLoading(false);
      }
    },
    [logCall],
  );

  const refreshTrips = useCallback(async () => {
    try {
      const [tr, sr] = await Promise.all([fetch("/api/trips", { cache: "no-store" }), fetch("/api/stats", { cache: "no-store" })]);
      const td = await tr.json();
      const sd = await sr.json();
      logCall("GET /api/trips", tr.status, `${td.trips?.length ?? 0} pilot trips`);
      logCall("GET /api/stats", sr.status, "ULB KPIs recomputed from pilot rows");
      setTrips((td.trips || []) as Trip[]);
      setStats((sd.stats || null) as Stats | null);
    } catch (e) {
      logCall("GET /api/trips + /api/stats", null, e instanceof Error ? e.message : "network error");
    }
  }, [logCall]);

  useEffect(() => {
    (async () => {
      const [tr, sr, hr] = await Promise.all([
        fetch("/api/trips", { cache: "no-store" }),
        fetch("/api/stats", { cache: "no-store" }),
        fetch("/api/health", { cache: "no-store" }),
      ]);
      const td = await tr.json();
      const sd = await sr.json();
      const hd = (await hr.json()) as Health;
      logCall("GET /api/trips", tr.status, `${td.trips?.length ?? 0} pilot trips`);
      logCall("GET /api/stats", sr.status, "ULB KPIs recomputed from pilot rows");
      logCall("GET /api/health", hr.status, hd.apis ? Object.entries(hd.apis).map(([k, v]) => `${k}:${v === "ok" ? "ok" : "down"}`).join(" · ") : "health unavailable");
      setTrips((td.trips || []) as Trip[]);
      setStats((sd.stats || null) as Stats | null);
      setHealth(hd);
      loadPlants(false);
    })();
  }, [loadPlants, logCall]);

  useEffect(() => {
    if (plants.length && !plantId) {
      const okhla = plants.find((p) => /okhla/i.test(p.name || ""));
      setPlantId(okhla?.id || plants.find((p) => p.name)?.id || plants[0].id);
    }
  }, [plants, plantId]);

  const selected = useMemo(() => {
    if (selectedId) {
      const hit = trips.find((t) => t.id === selectedId);
      if (hit) return hit;
    }
    return trips.find((t) => ["AT_PLANT", "EN_ROUTE", "BOOKED", "FLAGGED"].includes(t.status)) || trips[0] || null;
  }, [trips, selectedId]);

  const selectedPlant = useMemo(() => plants.find((p) => p.id === plantId) || null, [plants, plantId]);
  const namedPlants = useMemo(() => plants.filter((p) => p.name), [plants]);

  const norm = useMemo(() => calculateDesludging(persons, tankLitres), [persons, tankLitres]);
  const price = useMemo(() => checkPrice(Number(quote)), [quote]);

  const hotspots = useMemo(() => trips.filter((t) => t.status === "FLAGGED"), [trips]);

  useEffect(() => {
    if (!complaintTripId && trips.length) {
      setComplaintTripId((hotspots[0] || trips.find((t) => t.status !== "VERIFIED") || trips[0]).id);
    }
  }, [complaintTripId, trips, hotspots]);

  useEffect(() => {
    if (!aiTripId && trips.length) setAiTripId(trips[0].id);
  }, [aiTripId, trips]);

  useEffect(() => {
    let alive = true;
    setSeptageLoading(true);
    fetch(`/api/septage?state=${encodeURIComponent(septageState)}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive) setSeptage(d as SeptageStats);
      })
      .catch(() => {
        if (alive)
          setSeptage({ ok: false, reason: "error", message: "data.gov.in could not be reached just now." });
      })
      .finally(() => {
        if (alive) setSeptageLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [septageState]);

  async function checkPincode() {
    setBusy(true);
    try {
      const r = await fetch(`/api/pincode?pincode=${encodeURIComponent(pincode)}`);
      const d = await r.json();
      logCall(`GET /api/pincode?pincode=${pincode}`, r.status, r.ok ? `${d.district}, ${d.state} · ${d.count} post offices` : d.error);
      if (!r.ok || !d.ok) throw new Error(d.error || "Pincode check failed");
      setPinInfo(`${d.district}, ${d.state} — ${d.count} post offices (e.g. ${d.postOffices.join(", ")})`);
      setMsg({ kind: "ok", text: `Pincode verified live: ${d.district}, ${d.state}.` });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Pincode API down. Retry — no fake validation." });
    } finally {
      setBusy(false);
    }
  }

  async function geocodeHousehold() {
    setBusy(true);
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(hhAddress)}`);
      const d = await r.json();
      logCall(`GET /api/geocode?q=${encodeURIComponent(hhAddress).slice(0, 60)}`, r.status, r.ok ? `pickup ${d.results?.[0]?.lat?.toFixed(5)}, ${d.results?.[0]?.lon?.toFixed(5)}` : d.error);
      if (!r.ok || !d.ok || !d.results?.length) throw new Error(d.error || "No geocode match. Try a fuller address.");
      const w = d.results[0];
      setHhCoords({ lat: w.lat, lon: w.lon, displayName: w.displayName });
      setMsg({ kind: "ok", text: `Pickup geocoded live (Nominatim): ${w.lat.toFixed(5)}, ${w.lon.toFixed(5)} — ${w.displayName}` });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Nominatim down. Cannot book without real coords — retry." });
    } finally {
      setBusy(false);
    }
  }

  async function geocodeCustomPlant() {
    if (!customPlant.trim()) {
      setMsg({ kind: "err", text: "Type a plant name or address first." });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(customPlant)}`);
      const d = await r.json();
      logCall(`GET /api/geocode?q=${encodeURIComponent(customPlant).slice(0, 60)}`, r.status, r.ok ? `plant ${d.results?.[0]?.lat?.toFixed(5)}, ${d.results?.[0]?.lon?.toFixed(5)}` : d.error);
      if (!r.ok || !d.ok || !d.results?.length) throw new Error(d.error || "Plant geocode failed.");
      const w = d.results[0];
      setPlantCoords({ lat: w.lat, lon: w.lon, displayName: w.displayName });
      setMsg({ kind: "ok", text: `Plant geocoded live: ${w.lat.toFixed(5)}, ${w.lon.toFixed(5)} — ${w.displayName}` });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Nominatim down for plant. Retry." });
    } finally {
      setBusy(false);
    }
  }

  async function book() {
    if (!hhCoords) {
      setMsg({ kind: "err", text: "Geocode the pickup first. Real coordinates are required — no fake tanker locations." });
      return;
    }
    const plant = plantMode === "osm" ? selectedPlant : null;
    const pLat = plantMode === "osm" ? plant?.lat : plantCoords?.lat;
    const pLon = plantMode === "osm" ? plant?.lon : plantCoords?.lon;
    const pName = plantMode === "osm" ? (plant ? plantDisplayName(plant) : "") : customPlant.trim();
    const pAddress = plantMode === "osm" ? (plant ? `${plant.operator || "OSM record"} · ${plant.id}` : "") : plantCoords?.displayName || "";
    if (!pName || pLat == null || pLon == null) {
      setMsg({ kind: "err", text: "Choose a plant from the OSM register, or geocode a custom plant first." });
      return;
    }
    if (!operator.trim() || !vehicle.trim()) {
      setMsg({ kind: "err", text: "Operator name and vehicle number are required for the custody record." });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdLabel: hhLabel || hhAddress,
          householdAddress: hhCoords.displayName,
          householdPincode: pincode,
          householdLat: hhCoords.lat,
          householdLon: hhCoords.lon,
          plantName: pName,
          plantAddress: pAddress,
          plantLat: pLat,
          plantLon: pLon,
          operatorName: operator,
          vehicleNo: vehicle,
          quotedPrice: quote ? Number(quote) : null,
        }),
      });
      const d = await r.json();
      logCall("POST /api/trips", r.status, r.ok ? `${d.trip?.id} · OSRM ${d.trip?.distanceKm} km` : d.error);
      if (!r.ok) throw new Error(d.error || "Booking failed");
      const trip = d.trip as Trip;
      setLastTrip(trip);
      setSelectedId(trip.id);
      setMsg({
        kind: "ok",
        text: `${trip.id} booked. OSRM live: ${trip.distanceKm} km / ${trip.durationMin} min. Gate OTP ${trip.plantOtp} issued — the chain is open until the plant verifies it.`,
      });
      await refreshTrips();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Booking failed." });
    } finally {
      setBusy(false);
    }
  }

  async function advance(trip: Trip, to: string) {
    setBusy(true);
    try {
      const r = await fetch(`/api/trips/${trip.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, reason: flagReason[trip.id] }),
      });
      const d = await r.json();
      logCall(`POST /api/trips/${trip.id}/status → ${to}`, r.status, r.ok ? `${trip.status} → ${to}` : d.error);
      if (!r.ok) throw new Error(d.error || "Status update failed");
      setMsg({
        kind: "ok",
        text: to === "FLAGGED" ? `${trip.id} flagged. The chain is broken and payment stays held.` : `${trip.id} → ${STATUS_LABEL[to] || to}.`,
      });
      await refreshTrips();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Update failed" });
    } finally {
      setBusy(false);
    }
  }

  async function verify(trip: Trip) {
    const v = verifyMap[trip.id] || { otp: "", receiptId: "" };
    setBusy(true);
    try {
      const r = await fetch(`/api/trips/${trip.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: v.otp, receiptId: v.receiptId }),
      });
      const d = await r.json();
      logCall(`POST /api/trips/${trip.id}/verify`, r.status, r.ok ? `OTP match · receipt ${v.receiptId}` : d.error);
      if (!r.ok) throw new Error(d.error || "Verification failed");
      setMsg({ kind: "ok", text: d.message });
      await refreshTrips();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Verify failed" });
    } finally {
      setBusy(false);
    }
  }

  async function generateComplaint() {
    if (!complaintTripId) {
      setMsg({ kind: "err", text: "Select a trip first." });
      return;
    }
    setComplaintBusy(true);
    try {
      const r = await fetch("/api/complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: complaintTripId, area: complaintArea }),
      });
      const d = await r.json();
      logCall("POST /api/complaint", r.status, r.ok ? `draft for ${complaintTripId}` : d.error);
      if (!r.ok) throw new Error(d.error || "Complaint generation failed");
      setComplaintText(d.text);
      setMsg({ kind: "ok", text: "Complaint built from the trip record. Review the facts before sending." });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Complaint generation failed" });
    } finally {
      setComplaintBusy(false);
    }
  }

  async function runAi() {
    setAiBusy(true);
    try {
      const trip = trips.find((t) => t.id === aiTripId) || selected;
      const r = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "otp",
          tripId: trip?.id || "",
          otp: trip?.plantOtp || "",
          plant: trip?.plantName || "",
          vehicle: trip?.vehicleNo || "",
          area: trip?.householdAddress || "",
          date: new Date().toISOString().slice(0, 10),
        }),
      });
      const d = await r.json();
      logCall("POST /api/ai (otp)", r.status, r.ok ? `source: ${d.source}` : d.error);
      if (!r.ok) throw new Error(d.error || "AI failed");
      setAiText(d.text);
      setAiSource(d.source + (d.llmError ? ` · LLM: ${d.llmError} → template fallback` : ""));
    } catch (e) {
      setAiText(`AI endpoint error: ${e instanceof Error ? e.message : "unknown"}. The field flow does not depend on it.`);
      setAiSource("client-error");
    } finally {
      setAiBusy(false);
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg({ kind: "ok", text: `${label} copied.` });
    } catch {
      setMsg({ kind: "err", text: "Clipboard blocked by the browser. Select the text and copy manually." });
    }
  }

  function downloadText(filename: string, text: string) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const head = ["trip_id", "status", "plant", "household", "distance_km", "duration_min", "operator", "vehicle", "receipt", "verified_at", "payment_released", "quoted_price", "pilot", "source"];
    const rows = trips.map((t) => [
      t.id,
      t.status,
      t.plantName,
      t.householdAddress,
      t.distanceKm ?? "",
      t.durationMin ?? "",
      t.operatorName,
      t.vehicleNo,
      t.receiptId ?? "",
      t.verifiedAt ?? "",
      t.paymentReleased ? "yes" : "no",
      t.quotedPrice ?? "",
      t.pilot ? "pilot" : "",
      t.source,
    ]);
    const csv = [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `safai-trace-trips-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg({ kind: "ok", text: `Exported ${trips.length} pilot rows as CSV. Pilot label is a column, not a footnote.` });
  }

  const chain = buildChain(selected);
  const statusLabel = selected ? STATUS_LABEL[selected.status] || selected.status : "NO TRIP SELECTED";
  const statusTone = selected ? (selected.status === "VERIFIED" ? "ok" : selected.status === "FLAGGED" ? "bad" : "open") : "idle";
  const mapTrip = selected
    ? {
        id: selected.id,
        status: selected.status,
        householdLabel: selected.householdLabel,
        householdAddress: selected.householdAddress,
        householdLat: selected.householdLat,
        householdLon: selected.householdLon,
        plantName: selected.plantName,
        plantAddress: selected.plantAddress,
        plantLat: selected.plantLat,
        plantLon: selected.plantLon,
        routeGeometry: selected.routeGeometry,
        distanceKm: selected.distanceKm,
      }
    : null;

  const onSelectPlant = useCallback((p: Plant) => {
    setPlantMode("osm");
    setPlantId(p.id);
    setMsg({ kind: "info", text: `Plant selected from OSM: ${plantDisplayName(p)} (${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}).` });
  }, []);

  const apiEntries = health?.apis ? Object.entries(health.apis) : [];

  return (
    <div className="console">
      <div className="hazard" aria-hidden="true" />
      <header className="masthead">
        <div className="brand">
          <ChainMark />
          <div>
            <h1>Safai Trace</h1>
            <p>Faecal sludge chain of custody</p>
          </div>
        </div>
        <div className="mast-meta">
          <span className="pilot-tag">Pilot · Delhi</span>
          <span className="mast-date">06 Nov 2026</span>
        </div>
        <div className="api-lights" aria-label="Live API status">
          {apiEntries.length === 0 && <span className="light checking"><i />checking APIs</span>}
          {apiEntries.map(([k, v]) => (
            <span key={k} className={`light ${v === "ok" ? "up" : "down"}`} title={v}>
              <i />
              {k}
            </span>
          ))}
          <span className={`light ${health?.llmConfigured ? "up" : "checking"}`}>
            <i />
            llm
          </span>
        </div>
      </header>

      <section className={`chain-strip ${selected ? selected.status : "empty"}`} aria-label="Chain of custody">
        <div className="chain-head">
          <div className="chain-id">
            {selected ? (
              <>
                <span className="mono">{selected.id}</span>
                {selected.pilot && <span className="pilot-tag">Pilot</span>}
              </>
            ) : (
              <span>No trip selected</span>
            )}
          </div>
          <div className={`chain-status ${statusTone}`}>{statusLabel}</div>
          <div className={`chain-pay ${selected?.paymentReleased ? "released" : selected?.status === "FLAGGED" ? "broken" : ""}`}>
            {selected ? (selected.paymentReleased ? "Payment released" : "Payment held") : "—"}
          </div>
        </div>

        <div className="chain-rail">
          {STATIONS.map((s, i) => {
            const st = chain.stations[i];
            return (
              <div className="chain-cell" key={s.key}>
                <div className={`station ${st}`}>
                  <span className="station-num">0{i + 1}</span>
                  <span className="station-name">{s.name}</span>
                  <span className="station-note">{s.note}</span>
                </div>
                {i < STATIONS.length - 1 && (
                  <div className={`link ${chain.links[i]}`} aria-hidden="true">
                    {chain.links[i] === "broken" ? <b>×</b> : <i />}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="chain-caption">{chain.caption}</p>
      </section>

      {msg && (
        <div className={`notice ${msg.kind}`} role="status">
          <span>{msg.text}</span>
          <button type="button" onClick={() => setMsg(null)} aria-label="Dismiss message">×</button>
        </div>
      )}

      <main className="deck">
        <aside className="queue" aria-label="Dispatch queue">
          <div className="panel-title">
            <h2>Dispatch queue</h2>
            <span>{trips.length} trips</span>
          </div>
          <div className="queue-list">
            {trips.map((t) => (
              <button
                type="button"
                key={t.id}
                className={`queue-item ${selected?.id === t.id ? "active" : ""} ${t.status}`}
                onClick={() => setSelectedId(t.id)}
              >
                <span className={`queue-dot ${t.status}`} />
                <span className="queue-main">
                  <span className="queue-idline">
                    <span className="queue-id mono">{t.id}</span>
                    {t.pilot && <span className="pilot-tag queue-pilot">Pilot</span>}
                  </span>
                  <span className="queue-plant">{t.plantName}</span>
                </span>
                <span className="queue-side">
                  <span className={`queue-status ${t.status}`}>{STATUS_LABEL[t.status] || t.status}</span>
                  <span className="queue-km">{t.distanceKm != null ? `${t.distanceKm} km` : "no route"}</span>
                </span>
              </button>
            ))}
            {!trips.length && <p className="empty">No trips yet. Book one from the desk below.</p>}
          </div>
          <p className="queue-note">Every row is pilot-collected. No row is a real municipal trip.</p>
        </aside>

        <section className="map-panel" aria-label="Plant map">
          <div className="panel-bar">
            <div>
              <span className="bar-title">Plant register</span>
              <span className="bar-meta">
                {plantsLoading ? "loading…" : `${plants.length} OSM records · ${plantMeta?.namedCount ?? namedPlants.length} named`}
              </span>
            </div>
            <div className="bar-actions">
              {plantMeta?.fetchedAt && <span className="bar-stamp">snapshot {fmtDate(plantMeta.fetchedAt)}</span>}
              <button type="button" className="btn tiny ghost" onClick={() => loadPlants(true)} disabled={plantsRefreshing}>
                {plantsRefreshing ? "Refreshing…" : "Refresh OSM"}
              </button>
              <a className="bar-link" href={plantMeta?.osmUrl || "https://www.openstreetmap.org/#map=11/28.64/77.20"} target="_blank" rel="noreferrer">
                Open OSM
              </a>
            </div>
          </div>

          {plantMeta?.stale && (
            <div className="map-warning">
              Overpass refresh failed. Showing the dated snapshot from {fmtDate(plantMeta.fetchedAt)}. {plantMeta.liveError}
            </div>
          )}
          {!plantsLoading && plants.length === 0 && (
            <div className="map-unavailable">
              <strong>Plant map unavailable.</strong>
              <p>{plantMeta?.error || "All Overpass mirrors failed."} No plant coordinates are invented.</p>
              <div className="row">
                <button type="button" className="btn" onClick={() => loadPlants(true)}>Retry Overpass</button>
                <a className="bar-link" href="https://www.openstreetmap.org/#map=11/28.64/77.20" target="_blank" rel="noreferrer">Open OSM</a>
              </div>
            </div>
          )}

          <PlantMap plants={plants} trip={mapTrip} selectedPlantId={plantMode === "osm" ? plantId : null} onSelectPlant={onSelectPlant} />

          <div className="map-key">
            <span><i className="key-dot plant" /> OSM wastewater plant</span>
            <span><i className="key-dot selected" /> selected disposal plant</span>
            <span><i className="key-dot pickup" /> household pickup</span>
            <span><i className="key-line route" /> OSRM road route</span>
            <span className="key-note">{plantMeta?.license || "OpenStreetMap contributors, ODbL"}</span>
          </div>
        </section>

        <aside className="dossier" aria-label="Selected trip dossier">
          <div className="panel-title">
            <h2>Trip dossier</h2>
            {selected?.pilot && <span className="pilot-tag">Pilot</span>}
          </div>
          {!selected && <p className="empty">Select a trip from the queue. The chain stays open until a plant receipt is recorded.</p>}
          {selected && (
            <>
              <div className={`dossier-status ${statusTone}`}>
                <span>{statusLabel}</span>
                <small>{selected.paymentReleased ? "payment released" : "payment held"}</small>
              </div>

              <dl className="facts">
                <div><dt>Pickup</dt><dd>{selected.householdAddress}</dd></div>
                <div><dt>Plant</dt><dd>{selected.plantName}<br /><span className="dim">{selected.plantAddress}</span></dd></div>
                <div><dt>Distance</dt><dd>{selected.distanceKm != null ? `${selected.distanceKm} km · ${selected.durationMin} min` : "not recorded"} <span className="dim">OSRM live</span></dd></div>
                <div><dt>Operator</dt><dd>{selected.operatorName}<br /><span className="dim">{selected.vehicleNo}</span></dd></div>
                <div><dt>Quoted</dt><dd>{selected.quotedPrice != null ? `₹${selected.quotedPrice.toLocaleString("en-IN")}` : "not recorded"}</dd></div>
                <div><dt>Booked</dt><dd>{fmtDateTime(selected.createdAt)}</dd></div>
              </dl>

              <div className="gate-code">
                <span className="gate-label">Plant board OTP</span>
                <div className="otp-digits" aria-label={`OTP ${selected.plantOtp}`}>
                  {selected.plantOtp.split("").map((d, i) => <span key={i}>{d}</span>)}
                </div>
                <span className="gate-hint">Driver must match this at the weighbridge. It is not proof until a receipt is entered.</span>
              </div>

              <div className="dossier-actions">
                {selected.status === "BOOKED" && (
                  <button type="button" className="btn wide" disabled={busy} onClick={() => advance(selected, "EN_ROUTE")}>Start trip · en route</button>
                )}
                {selected.status === "EN_ROUTE" && (
                  <button type="button" className="btn wide" disabled={busy} onClick={() => advance(selected, "AT_PLANT")}>Mark arrival at plant</button>
                )}
                {selected.status === "AT_PLANT" && (
                  <div className="verify-block">
                    <label htmlFor={`otp-${selected.id}`}>OTP from plant board</label>
                    <input
                      id={`otp-${selected.id}`}
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="4 digits"
                      value={verifyMap[selected.id]?.otp || ""}
                      onChange={(e) => setVerifyMap({ ...verifyMap, [selected.id]: { ...(verifyMap[selected.id] || { receiptId: "" }), otp: e.target.value } })}
                    />
                    <label htmlFor={`rcpt-${selected.id}`}>Weighbridge receipt ID</label>
                    <input
                      id={`rcpt-${selected.id}`}
                      placeholder="WBR-OKH-20261106-002"
                      value={verifyMap[selected.id]?.receiptId || ""}
                      onChange={(e) => setVerifyMap({ ...verifyMap, [selected.id]: { ...(verifyMap[selected.id] || { otp: "" }), receiptId: e.target.value } })}
                    />
                    <button type="button" className="btn wide" disabled={busy} onClick={() => verify(selected)}>Verify disposal · release payment</button>
                  </div>
                )}
                {selected.status === "FLAGGED" && (
                  <>
                    <div className="broken-note">No plant receipt. The chain is broken; payment stays held.</div>
                    <button type="button" className="btn wide ghost" disabled={busy} onClick={() => advance(selected, "AT_PLANT")}>Revisit plant · reopen chain</button>
                    <button type="button" className="btn wide ghost" onClick={() => { setTab("act"); setComplaintTripId(selected.id); }}>Build a dumping complaint</button>
                  </>
                )}
                {selected.status === "VERIFIED" && (
                  <>
                    <div className="verified-note">Receipt {selected.receiptId} sealed {fmtDateTime(selected.verifiedAt)}. Payment released.</div>
                    <Link className="btn wide" href={`/certificate/${selected.id}`}>Open disposal certificate</Link>
                  </>
                )}
                {(selected.status === "EN_ROUTE" || selected.status === "AT_PLANT") && (
                  <div className="flag-block">
                    <label htmlFor={`flag-${selected.id}`}>Flag this trip (reason required)</label>
                    <input
                      id={`flag-${selected.id}`}
                      placeholder="e.g. receipt missing after 24h"
                      value={flagReason[selected.id] || ""}
                      onChange={(e) => setFlagReason({ ...flagReason, [selected.id]: e.target.value })}
                    />
                    <button type="button" className="btn wide danger" disabled={busy} onClick={() => advance(selected, "FLAGGED")}>Flag · break the chain</button>
                  </div>
                )}
              </div>

              <div className="gate-token">
                <span>Gate token</span>
                <code>SAFAI-TRACE:{selected.id}:OTP-{selected.plantOtp}</code>
                <button type="button" className="link-btn" onClick={() => copyText(`SAFAI-TRACE:${selected.id}:OTP-${selected.plantOtp}`, "Gate token")}>Copy</button>
              </div>

              <div className="osm-links">
                <a href={`https://www.openstreetmap.org/?mlat=${selected.householdLat}&mlon=${selected.householdLon}#map=15/${selected.householdLat}/${selected.householdLon}`} target="_blank" rel="noreferrer">Pickup on OSM</a>
                <a href={`https://www.openstreetmap.org/?mlat=${selected.plantLat}&mlon=${selected.plantLon}#map=15/${selected.plantLat}/${selected.plantLon}`} target="_blank" rel="noreferrer">Plant on OSM</a>
              </div>
            </>
          )}
        </aside>
      </main>

      <nav className="desk-tabs" aria-label="Control desk">
        {TABS.map((t) => (
          <button type="button" key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <section className="desk">
        {tab === "book" && (
          <div className="book-grid">
            <div className="field-col">
              <div className="section-head">
                <h2>Book a desludging</h2>
                <p>The trip is not a trip until OSRM returns a road distance. The chain opens at BOOKED.</p>
              </div>

              <label htmlFor="hh-label">Household label <span className="opt">optional</span></label>
              <input id="hh-label" value={hhLabel} onChange={(e) => setHhLabel(e.target.value)} placeholder="House 12, Janpath" />

              <label htmlFor="hh-address">Pickup address <span className="req">geocoded live</span></label>
              <div className="input-row">
                <input id="hh-address" value={hhAddress} onChange={(e) => setHhAddress(e.target.value)} placeholder="Connaught Place, New Delhi" />
                <button type="button" className="btn ghost" disabled={busy} onClick={geocodeHousehold}>Find pickup</button>
              </div>
              {hhCoords ? (
                <p className="readout ok">Nominatim · {hhCoords.lat.toFixed(5)}, {hhCoords.lon.toFixed(5)}<br /><span>{hhCoords.displayName}</span></p>
              ) : (
                <p className="readout">No coordinates yet. Booking stays disabled — never fake a pickup point.</p>
              )}

              <label htmlFor="pincode">Pincode <span className="req">India Post</span></label>
              <div className="input-row">
                <input id="pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="110001" inputMode="numeric" maxLength={6} />
                <button type="button" className="btn ghost" disabled={busy} onClick={checkPincode}>Validate</button>
              </div>
              {pinInfo && <p className="readout ok">{pinInfo}</p>}

              <div className="section-head sub">
                <h3>Tank + household</h3>
                <p>Used for the CPHEEO advice and the quoted-price check. It does not change the route.</p>
              </div>
              <div className="two-up">
                <div>
                  <label htmlFor="persons">People using the tank</label>
                  <input id="persons" type="number" min={1} max={50} value={persons} onChange={(e) => setPersons(Number(e.target.value))} />
                </div>
                <div>
                  <label htmlFor="tank">Tank capacity (litres)</label>
                  <input id="tank" type="number" min={100} step={100} value={tankLitres} onChange={(e) => setTankLitres(Number(e.target.value))} />
                </div>
              </div>
              <p className="readout">
                CPHEEO planning: <strong>{norm.headline.toLowerCase()}</strong> — {norm.annualSludgeL} L of sludge a year. <button type="button" className="link-btn" onClick={() => setTab("norms")}>See the formula</button>
              </p>
            </div>

            <div className="field-col">
              <div className="section-head">
                <h2>Disposal plant</h2>
                <p>Pick a real OSM wastewater-plant record, or geocode a site that is not in OSM.</p>
              </div>

              <label htmlFor="plant">Plant record</label>
              <select
                id="plant"
                value={plantMode === "custom" ? "__custom__" : plantId}
                onChange={(e) => {
                  if (e.target.value === "__custom__") setPlantMode("custom");
                  else {
                    setPlantMode("osm");
                    setPlantId(e.target.value);
                  }
                }}
              >
                {namedPlants.map((p) => (
                  <option key={p.id} value={p.id}>{plantDisplayName(p)} · {p.lat.toFixed(4)}, {p.lon.toFixed(4)}</option>
                ))}
                <option value="__custom__">Other — geocode an address</option>
              </select>
              {plantMode === "osm" && selectedPlant && (
                <p className="readout ok">
                  {selectedPlant.operator || "OSM record"} · {selectedPlant.id}<br />
                  <a href={selectedPlant.osmUrl} target="_blank" rel="noreferrer">Open this record on OSM</a>
                </p>
              )}
              {plantMode === "custom" && (
                <>
                  <label htmlFor="custom-plant">Plant name / address</label>
                  <div className="input-row">
                    <input id="custom-plant" value={customPlant} onChange={(e) => setCustomPlant(e.target.value)} placeholder="FSTP Najafgarh Delhi" />
                    <button type="button" className="btn ghost" disabled={busy} onClick={geocodeCustomPlant}>Geocode</button>
                  </div>
                  {plantCoords ? (
                    <p className="readout ok">Nominatim · {plantCoords.lat.toFixed(5)}, {plantCoords.lon.toFixed(5)}<br /><span>{plantCoords.displayName}</span></p>
                  ) : (
                    <p className="readout">Not geocoded yet. The book button stays disabled.</p>
                  )}
                </>
              )}

              <div className="two-up">
                <div>
                  <label htmlFor="operator">Operator</label>
                  <input id="operator" value={operator} onChange={(e) => setOperator(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="vehicle">Vehicle no.</label>
                  <input id="vehicle" value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
                </div>
              </div>

              <label htmlFor="quote">Quoted price (₹ per trip) <span className="req">sanity check</span></label>
              <input id="quote" type="number" min={0} step={100} value={quote} onChange={(e) => setQuote(e.target.value)} />
              {price && (
                <p className={`readout price-${price.status}`}>
                  <strong>{price.headline}.</strong> {price.detail}
                </p>
              )}

              <button type="button" className="btn wide book-btn" disabled={busy || !hhCoords || (plantMode === "osm" ? !selectedPlant : !plantCoords)} onClick={book}>
                {busy ? "Working…" : "Book trip + compute OSRM route"}
              </button>
              <p className="fine">No fake coordinates. If Nominatim or OSRM is down you get an error and a retry, never an invented distance.</p>

              {lastTrip && (
                <div className="proof-box">
                  <div className="proof-head">
                    <strong>{lastTrip.id} · gate proof</strong>
                    <span className="pilot-tag">Pilot</span>
                  </div>
                  <p>OTP <strong className="mono">{lastTrip.plantOtp}</strong> · {lastTrip.distanceKm} km / {lastTrip.durationMin} min (OSRM)</p>
                  <code>SAFAI-TRACE:{lastTrip.id}:OTP-{lastTrip.plantOtp}</code>
                  <button type="button" className="link-btn" onClick={() => copyText(`SAFAI-TRACE:${lastTrip.id}:OTP-${lastTrip.plantOtp}`, "Gate token")}>Copy token</button>
                  <p className="fine">Print or scan this at the plant gate. Verification needs the OTP and a weighbridge receipt.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "norms" && (
          <div className="norms-grid">
            <div className="field-col">
              <div className="section-head">
                <h2>When should this tank be emptied?</h2>
                <p>CPHEEO plans on 0.067 m³ of sludge per person per year. Enter the household and the tank you actually have.</p>
              </div>
              <div className="two-up">
                <div>
                  <label htmlFor="n-persons">People using the tank</label>
                  <input id="n-persons" type="number" min={1} max={50} value={persons} onChange={(e) => setPersons(Number(e.target.value))} />
                </div>
                <div>
                  <label htmlFor="n-tank">Tank capacity (litres)</label>
                  <input id="n-tank" type="number" min={100} step={100} value={tankLitres} onChange={(e) => setTankLitres(Number(e.target.value))} />
                </div>
              </div>
              <div className="preset-row">
                {[1000, 1500, 2000, 3000].map((v) => (
                  <button type="button" key={v} className={`chip ${tankLitres === v ? "on" : ""}`} onClick={() => setTankLitres(v)}>{v.toLocaleString("en-IN")} L</button>
                ))}
              </div>
              <div className={`norm-result ${norm.status}`}>
                <span className="norm-big">{norm.recommendedYears}<small>{norm.recommendedYears === 1 ? "year" : "years"}</small></span>
                <div>
                  <strong>{norm.headline}</strong>
                  <p>{norm.detail}</p>
                </div>
              </div>
              <div className="formula">
                <span>Formula</span>
                <code>V = N × 0.067 m³/person/yr × T</code>
                <p>N = {norm.persons} people · annual sludge = {norm.annualSludgeL.toLocaleString("en-IN")} L · 3-year sludge volume = {norm.required3yL.toLocaleString("en-IN")} L · theoretical fill time = {norm.yearsToFill} years.</p>
              </div>
            </div>

            <div className="field-col">
              <div className="section-head">
                <h2>Quick reference</h2>
                <p>Computed from the same formula. Years are the recommended interval, capped at the CPHEEO 3-year band.</p>
              </div>
              <table className="matrix">
                <thead>
                  <tr>
                    <th>People</th>
                    {[1000, 1500, 2000, 3000].map((v) => <th key={v}>{v.toLocaleString("en-IN")} L</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[3, 5, 7, 9].map((p) => (
                    <tr key={p}>
                      <th>{p}</th>
                      {[1000, 1500, 2000, 3000].map((v) => {
                        const r = calculateDesludging(p, v);
                        return <td key={v} className={r.status}>{r.recommendedYears} yr</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="section-head" style={{ marginTop: 22 }}>
                <h2>Sanctioned septage projects in your State</h2>
                <p>
                  Queried live from data.gov.in (Ministry of Housing &amp; Urban Affairs), not copied
                  from a report. Choose a State to see how many sewerage and septage projects AMRUT has
                  sanctioned there — the public footprint a trip like this has to reach.
                </p>
              </div>
              <label htmlFor="septage-state" className="sr-only">State for the AMRUT project count</label>
              <select
                id="septage-state"
                value={septageState}
                onChange={(e) => setSeptageState(e.target.value)}
                style={{ maxWidth: 320 }}
              >
                {AMRUT_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <div className="septage-live" aria-live="polite">
                {septageLoading && <p>Querying data.gov.in…</p>}
                {!septageLoading && septage?.ok && (
                  <>
                    <p className="septage-total">
                      <strong>{septage.total}</strong> {septage.total === 1 ? "project" : "projects"} sanctioned in {septage.state}
                    </p>
                    <p className="fine">
                      AMRUT 1.0: {septage.phases.saap1 ?? "—"} · AMRUT 2.0: {septage.phases.saap2 ?? "—"} ·
                      state share: {septage.phases.saap3 ?? "—"}. Fetched {new Date(septage.fetchedAt).toLocaleString("en-IN")}.
                    </p>
                  </>
                )}
                {!septageLoading && septage && !septage.ok && (
                  <p className="fine">{septage.message}</p>
                )}
                <p className="fine">
                  Source:{" "}
                  <a href={AMRUT_RESOURCE_URL} target="_blank" rel="noreferrer">
                    {AMRUT_DATASET_TITLE}
                  </a>
                  .
                </p>
              </div>

              <div className="source-block">
                <p><strong>Norm.</strong> {CPHEEO.intervalSource}</p>
                <p><strong>Accumulation.</strong> {CPHEEO.accumulationSource}</p>
                <p><strong>Tank size.</strong> {CPHEEO.is2470Source}</p>
                <p className="fine">{CPHEEO.caveat}</p>
                <div className="source-links">
                  <a href={CPHEEO.intervalUrl} target="_blank" rel="noreferrer">SBM-U advisory (Nov 2024)</a>
                  <a href={CPHEEO.accumulationUrl} target="_blank" rel="noreferrer">CPHEEO manual (2012)</a>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "price" && (
          <div className="price-grid">
            <div className="field-col">
              <div className="section-head">
                <h2>Is the quote in range?</h2>
                <p>Enter what the operator quoted. The benchmark is a notified ULB rate card, not a number we made up.</p>
              </div>
              <label htmlFor="p-quote">Quoted price (₹ per trip)</label>
              <input id="p-quote" type="number" min={0} step={100} value={quote} onChange={(e) => setQuote(e.target.value)} />
              <div className={`price-verdict ${price?.status || "empty"}`}>
                <span className="price-big">{price ? `₹${price.quote.toLocaleString("en-IN")}` : "—"}</span>
                <div>
                  <strong>{price?.headline || "Enter a quote"}</strong>
                  <p>{price?.detail || `The cited benchmark is ₹${PRICE_BENCHMARK.min.toLocaleString("en-IN")}–₹${PRICE_BENCHMARK.max.toLocaleString("en-IN")} per trip.`}</p>
                </div>
              </div>
              <div className="price-track" aria-hidden="true">
                <span className="price-band" />
                {price && <span className="price-marker" style={{ left: `${Math.min(100, Math.max(0, (price.quote / 4000) * 100))}%` }} />}
                <span className="price-tick" style={{ left: "37.5%" }}>₹1,500</span>
                <span className="price-tick" style={{ left: "62.5%" }}>₹2,500</span>
              </div>
              <p className="fine">Scale: ₹0–₹4,000. The yellow band is the cited range. A price inside the band still does not prove safe disposal.</p>
            </div>
            <div className="field-col">
              <div className="section-head">
                <h2>What the benchmark covers</h2>
                <p>{PRICE_BENCHMARK.label}. Per trip, not per litre.</p>
              </div>
              <div className="source-block">
                <p><strong>Primary.</strong> {PRICE_BENCHMARK.primarySource}</p>
                <p><strong>Cross-check.</strong> {PRICE_BENCHMARK.secondarySource}</p>
                <p className="fine">{PRICE_BENCHMARK.caveat}</p>
                <div className="source-links">
                  <a href={PRICE_BENCHMARK.primaryUrl} target="_blank" rel="noreferrer">Jharkhand LWM rules 2025</a>
                  <a href={PRICE_BENCHMARK.secondaryUrl} target="_blank" rel="noreferrer">NMCG septage guide</a>
                </div>
              </div>
              <div className="advice">
                <h3>Three questions before you pay</h3>
                <ol>
                  <li>Which FSTP/STP will take this load, and what is its gate OTP?</li>
                  <li>Will I get the weighbridge slip with the trip ID on it?</li>
                  <li>Is the quoted price for the trip or for a fixed number of litres?</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {tab === "act" && (
          <div className="act-grid">
            <div className="field-col">
              <div className="section-head">
                <h2>Build a complaint</h2>
                <p>Generates a formal complaint from the trip record. It adds no facts. Review it, then send it through a real channel.</p>
              </div>
              <label htmlFor="c-trip">Trip</label>
              <select id="c-trip" value={complaintTripId} onChange={(e) => setComplaintTripId(e.target.value)}>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>{t.id} · {STATUS_LABEL[t.status] || t.status} · {t.vehicleNo}</option>
                ))}
              </select>
              <label htmlFor="c-area">Dumping area <span className="opt">defaults to the pickup address</span></label>
              <input id="c-area" value={complaintArea} onChange={(e) => setComplaintArea(e.target.value)} placeholder="e.g. drain behind Janpath market" />
              <button type="button" className="btn wide" disabled={complaintBusy} onClick={generateComplaint}>
                {complaintBusy ? "Building…" : "Build complaint from the trip record"}
              </button>
              {complaintText && (
                <>
                  <textarea className="complaint-text" value={complaintText} onChange={(e) => setComplaintText(e.target.value)} rows={16} />
                  <div className="row wrap">
                    <button type="button" className="btn ghost" onClick={() => copyText(complaintText, "Complaint")}>Copy</button>
                    <button type="button" className="btn ghost" onClick={() => downloadText(`safai-complaint-${complaintTripId}.txt`, complaintText)}>Download .txt</button>
                    <a className="btn ghost" href={`https://wa.me/?text=${encodeURIComponent(complaintText.slice(0, 1800))}`} target="_blank" rel="noreferrer">Open in WhatsApp</a>
                  </div>
                  <p className="fine">WhatsApp truncates long text. Attach the downloaded file if you need the full record.</p>
                </>
              )}
            </div>

            <div className="field-col">
              <div className="section-head">
                <h2>Where to send it</h2>
                <p>Official routes only. Numbers checked against the linked page on {HELP_VERIFIED_ON}.</p>
              </div>
              <ul className="help-list">
                {HELP_ROUTES.map((h) => (
                  <li key={h.name}>
                    <div className="help-main">
                      <strong>{h.name}</strong>
                      <span className="help-note">{h.note}</span>
                      <a className="help-source" href={h.sourceUrl} target="_blank" rel="noreferrer">{h.sourceLabel}</a>
                    </div>
                    <div className="help-action">
                      {h.number && <a className="help-number" href={`tel:${h.number}`}>{h.number}</a>}
                      {h.alt && <span className="help-alt">{h.alt}</span>}
                      <a className="help-open" href={h.url} target="_blank" rel="noreferrer">{h.channel}</a>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="fine">If a number is wrong or changes, use the linked official page — do not trust a number copied from a poster.</p>
            </div>
          </div>
        )}

        {tab === "oversight" && (
          <div className="oversight">
            <div className="kpi-strip">
              <div><span className="kpi-num">{stats?.total ?? "—"}</span><span className="kpi-label">trips booked</span><span className="kpi-sub">pilot-collected</span></div>
              <div><span className="kpi-num ok">{stats?.pctSafe ?? 0}%</span><span className="kpi-label">safely disposed</span><span className="kpi-sub">verified ÷ (verified + flagged)</span></div>
              <div><span className="kpi-num bad">{stats?.flagged ?? 0}</span><span className="kpi-label">flagged</span><span className="kpi-sub">no plant receipt</span></div>
              <div><span className="kpi-num">{stats?.inFlight ?? 0}</span><span className="kpi-label">in flight</span><span className="kpi-sub">chain still open</span></div>
              <div><span className="kpi-num">{stats?.avgKm ?? 0} km</span><span className="kpi-label">average trip</span><span className="kpi-sub">OSRM live at booking</span></div>
            </div>

            <div className="oversight-grid">
              <div className="oversight-col">
                <div className="section-head">
                  <h2>Dumping hotspots</h2>
                  <p>Flagged trips are the ULB inspection queue. A flag is a missing receipt, not a proven dump.</p>
                </div>
                {hotspots.length === 0 && <p className="empty">No flagged trips. Every completed pilot trip has a plant receipt.</p>}
                {hotspots.map((t) => (
                  <div className="hotspot" key={t.id}>
                    <div className="hotspot-head">
                      <span className="mono">{t.id}</span>
                      <span className="pilot-tag">Pilot</span>
                      <span className="bad">{t.vehicleNo}</span>
                    </div>
                    <p>{t.householdAddress}</p>
                    <p className="dim">{t.flaggedReason}</p>
                    <div className="row wrap">
                      <button type="button" className="link-btn" onClick={() => { setSelectedId(t.id); setTab("act"); setComplaintTripId(t.id); }}>Build complaint</button>
                      <a className="link-btn" href={`https://www.openstreetmap.org/?mlat=${t.householdLat}&mlon=${t.householdLon}#map=15/${t.householdLat}/${t.householdLon}`} target="_blank" rel="noreferrer">Pickup on OSM</a>
                    </div>
                  </div>
                ))}

                <div className="section-head sub">
                  <h2>Verification log</h2>
                  <p>Payment releases only on VERIFIED: OTP match plus a weighbridge receipt.</p>
                </div>
                <div className="table-wrap">
                  <table className="log-table">
                    <thead><tr><th>Trip</th><th>Status</th><th>Plant</th><th>Receipt</th><th>Payment</th></tr></thead>
                    <tbody>
                      {trips.map((t) => (
                        <tr key={t.id}>
                          <td className="mono">{t.id}</td>
                          <td><span className={`status-chip ${t.status}`}>{STATUS_LABEL[t.status] || t.status}</span></td>
                          <td>{t.plantName}</td>
                          <td>{t.receiptId || "—"}</td>
                          <td>{t.paymentReleased ? "released" : "held"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="row wrap">
                  <button type="button" className="btn ghost" onClick={exportCsv}>Export CSV</button>
                  <a className="btn ghost" href="/api/stats" target="_blank" rel="noreferrer">Open /api/stats</a>
                </div>
              </div>

              <div className="oversight-col">
                <div className="section-head">
                  <h2>Live calls</h2>
                  <p>Every upstream request this session, with its HTTP status. Failures are shown, never smoothed over.</p>
                </div>
                <div className="table-wrap call-table">
                  <table className="log-table">
                    <thead><tr><th>Time</th><th>Call</th><th>Status</th><th>Note</th></tr></thead>
                    <tbody>
                      {callLog.map((c) => (
                        <tr key={c.id}>
                          <td className="mono">{c.at}</td>
                          <td className="mono call-label">{c.label}</td>
                          <td className={c.status && c.status < 400 ? "ok" : "bad"}>{c.status ?? "ERR"}</td>
                          <td>{c.note}</td>
                        </tr>
                      ))}
                      {!callLog.length && <tr><td colSpan={4}>No calls yet.</td></tr>}
                    </tbody>
                  </table>
                </div>

                <details className="ai-box">
                  <summary>Hindi gate script (BharatCode)</summary>
                  <p>Optional field aid. The model is 503-prone; the flow falls back to a template and never blocks verification.</p>
                  <div className="row wrap">
                    <select value={aiTripId} onChange={(e) => setAiTripId(e.target.value)}>
                      {trips.map((t) => <option key={t.id} value={t.id}>{t.id} · {t.plantName}</option>)}
                    </select>
                    <button type="button" className="btn ghost" disabled={aiBusy} onClick={runAi}>{aiBusy ? "Calling…" : "Generate"}</button>
                  </div>
                  {aiText && <pre className="ai-text">{aiText}</pre>}
                  {aiSource && <p className="fine">Source: {aiSource}</p>}
                </details>
              </div>
            </div>
          </div>
        )}
      </section>

      <footer className="foot">
        <div className="foot-grid">
          <div>
            <h2>What this proves</h2>
            <p>A trip is verified only when the plant OTP matches and a weighbridge receipt is recorded. No receipt, no payment. The pilot does not claim a municipal mandate or a measured dumping rate.</p>
            <p className="fine">Built for Code for a Billion · Impact: Sanitation. Trip rows are pilot-collected and labelled.</p>
          </div>
          <div>
            <h2>Norms + price</h2>
            <ul>
              <li><a href={CPHEEO.intervalUrl} target="_blank" rel="noreferrer">SBM-U / CPHEEO FSM advisory (Nov 2024)</a> — 2–3 year desludging band</li>
              <li><a href={CPHEEO.accumulationUrl} target="_blank" rel="noreferrer">CPHEEO Sewerage &amp; Sewage Treatment manual (2012)</a> — 0.067 m³/person/yr</li>
              <li><a href={PRICE_BENCHMARK.primaryUrl} target="_blank" rel="noreferrer">Jharkhand LWM &amp; User Charges Rules 2025</a> — ₹1,500 / ₹2,500 per trip</li>
              <li><a href={PRICE_BENCHMARK.secondaryUrl} target="_blank" rel="noreferrer">NMCG Septage Practitioner&apos;s Guide</a> — ₹1,500 per trip</li>
            </ul>
          </div>
          <div>
            <h2>Problem + data</h2>
            <ul>
              <li><a href="https://www.ndtv.com/india-news/nearly-500-died-while-cleaning-sewers-or-septic-tanks-since-2019-centre-11866683" target="_blank" rel="noreferrer">498 sewer/septic-cleaning deaths since Jan 2019</a> — Central Govt data in Lok Sabha (NCSK reporting)</li>
              <li><a href="https://sbmurban.org/storage/app/media/pdf/swachh-bharat-2.pdf" target="_blank" rel="noreferrer">SBM (Urban) 2.0</a> — ~4,000 ULBs in scope</li>
              <li><a href="https://censusindia.gov.in/" target="_blank" rel="noreferrer">Census 2011 C-08 + NSSO 76th Round</a> — off-sewer context</li>
              <li><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> (ODbL) · Overpass · OSRM · India Post · Nominatim</li>
            </ul>
          </div>
        </div>
        <div className="foot-base">
          <span>Safai Trace · pilot console</span>
          <span>No fabricated coordinates, plants, distances, prices or phone numbers.</span>
        </div>
      </footer>
    </div>
  );
}

function buildChain(trip: Trip | null) {
  const stations: string[] = ["pending", "pending", "pending", "pending"];
  const links: string[] = ["pending", "pending", "pending"];
  if (!trip) {
    return {
      stations,
      links,
      caption: "Select a trip. The chain fills only when a plant verifies the load; nothing is pre-filled.",
    };
  }
  if (trip.status === "FLAGGED") {
    stations[0] = "done";
    stations[1] = "done";
    stations[2] = "done";
    stations[3] = "broken";
    links[0] = "done";
    links[1] = "done";
    links[2] = "broken";
    return {
      stations,
      links,
      caption: `Chain broken at the plant gate. ${trip.flaggedReason || "No weighbridge receipt."} Payment is held; the ULB queue has the hotspot.`,
    };
  }
  const idx = ["BOOKED", "EN_ROUTE", "AT_PLANT", "VERIFIED"].indexOf(trip.status);
  for (let i = 0; i < stations.length; i++) {
    stations[i] = i < idx ? "done" : i === idx ? "current" : "pending";
  }
  for (let i = 0; i < links.length; i++) {
    links[i] = i < idx ? "done" : i === idx ? "active" : "pending";
  }
  if (trip.status === "VERIFIED") {
    stations[3] = "verified";
    links[2] = "done";
  }
  const captions: Record<string, string> = {
    BOOKED: "Job logged, OTP issued. Nothing is proven yet — the chain is open.",
    EN_ROUTE: "Tanker moving. The load is unproven until it reaches a plant gate.",
    AT_PLANT: "At the gate. The chain closes only when the plant OTP matches and a weighbridge receipt is entered.",
    VERIFIED: `Receipt ${trip.receiptId} sealed ${fmtDateTime(trip.verifiedAt)}. Payment released.`,
  };
  return { stations, links, caption: captions[trip.status] || "Chain state unknown." };
}

function ChainMark() {
  return (
    <svg className="chain-mark" viewBox="0 0 48 32" aria-hidden="true">
      <rect x="2" y="9" width="21" height="14" rx="7" fill="none" stroke="currentColor" strokeWidth="3" />
      <rect x="25" y="9" width="21" height="14" rx="7" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M17 16h14" stroke="currentColor" strokeWidth="3" />
      <path d="M24 9v14" stroke="#23262B" strokeWidth="2" />
    </svg>
  );
}
