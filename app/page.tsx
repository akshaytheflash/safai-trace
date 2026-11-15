"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PlantMap from "./components/PlantMap";
import FloatingPayout from "./components/FloatingPayout";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { useI18n } from "./components/I18nProvider";
import type { MessageKey } from "@/lib/i18n/messages/en";
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

const STATUS_LABEL: Record<string, MessageKey> = {
  BOOKED: "status.BOOKED",
  EN_ROUTE: "status.EN_ROUTE",
  AT_PLANT: "status.AT_PLANT",
  VERIFIED: "status.VERIFIED",
  FLAGGED: "status.FLAGGED",
};

const STATIONS: { key: string; nameKey: MessageKey; noteKey: MessageKey }[] = [
  { key: "BOOKED", nameKey: "chain.station.booked", noteKey: "chain.station.bookedNote" },
  { key: "EN_ROUTE", nameKey: "chain.station.enRoute", noteKey: "chain.station.enRouteNote" },
  { key: "AT_PLANT", nameKey: "chain.station.atPlant", noteKey: "chain.station.atPlantNote" },
  { key: "VERIFIED", nameKey: "chain.station.verified", noteKey: "chain.station.verifiedNote" },
];

const TABS: { id: Tab; labelKey: MessageKey }[] = [
  { id: "book", labelKey: "tabs.book" },
  { id: "norms", labelKey: "tabs.norms" },
  { id: "price", labelKey: "tabs.price" },
  { id: "act", labelKey: "tabs.act" },
  { id: "oversight", labelKey: "tabs.oversight" },
];

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function plantDisplayName(p: Plant, tr: (key: MessageKey, vars?: Record<string, string | number>) => string) {
  if (!p.name) return tr("plant.unnamed");
  if (/^\d+(\.\d+)?\s*MGD$/i.test(p.name)) return tr("plant.unnamedWithName", { name: p.name });
  return p.name;
}

/** Stable English fallback used in API payloads, never in the interface. */
function plantPayloadName(p: Plant) {
  if (!p.name) return "Unnamed wastewater plant";
  if (/^\d+(\.\d+)?\s*MGD$/i.test(p.name)) return `Unnamed plant · ${p.name}`;
  return p.name;
}

function tripStatusLabel(
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
  status: string
) {
  const key = STATUS_LABEL[status];
  return key ? t(key) : status;
}

function csvCell(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function Home() {
  const { t: tr } = useI18n();
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
          ? `${d.source}${d.stale ? tr("log.staleSuffix") : ""}${d.liveError ? tr("log.liveSuffix", { error: d.liveError }) : ""}`
          : d.error || tr("log.plantMapUnavailable");
        logCall(`GET /api/plants${refresh ? "?refresh=1" : ""}`, r.status, note);
        setPlantMeta(d);
        if (d.ok && Array.isArray(d.plants)) setPlants(d.plants);
        if (!d.ok) setMsg({ kind: "err", text: d.error || tr("error.plantMap") });
        else if (refresh) {
          setMsg(
            d.stale
              ? { kind: "err", text: tr("error.overpassRefresh", { error: d.liveError || tr("map.allMirrorsFailed") }) }
              : { kind: "ok", text: tr("toast.plantsRefreshed", { source: d.source === "overpass-live" ? "Overpass" : String(d.source ?? "") }) },
          );
        }
      } catch (e) {
        logCall("GET /api/plants", null, e instanceof Error ? e.message : tr("log.networkError"));
        setPlantMeta({ ok: false, error: e instanceof Error ? e.message : tr("error.plantMapRetry") });
        setMsg({ kind: "err", text: tr("error.plantMapRetry") });
      } finally {
        setPlantsRefreshing(false);
        setPlantsLoading(false);
      }
    },
    [logCall, tr],
  );

  const refreshTrips = useCallback(async () => {
    try {
      const [tripsRes, statsRes] = await Promise.all([fetch("/api/trips", { cache: "no-store" }), fetch("/api/stats", { cache: "no-store" })]);
      const td = await tripsRes.json();
      const sd = await statsRes.json();
      logCall("GET /api/trips", tripsRes.status, tr("log.pilotTrips", { count: td.trips?.length ?? 0 }));
      logCall("GET /api/stats", statsRes.status, tr("log.kpis"));
      setTrips((td.trips || []) as Trip[]);
      setStats((sd.stats || null) as Stats | null);
    } catch (e) {
      logCall("GET /api/trips + /api/stats", null, e instanceof Error ? e.message : tr("log.networkError"));
    }
  }, [logCall, tr]);

  useEffect(() => {
    (async () => {
      const [tripsRes, statsRes, healthRes] = await Promise.all([
        fetch("/api/trips", { cache: "no-store" }),
        fetch("/api/stats", { cache: "no-store" }),
        fetch("/api/health", { cache: "no-store" }),
      ]);
      const td = await tripsRes.json();
      const sd = await statsRes.json();
      const hd = (await healthRes.json()) as Health;
      logCall("GET /api/trips", tripsRes.status, tr("log.pilotTrips", { count: td.trips?.length ?? 0 }));
      logCall("GET /api/stats", statsRes.status, tr("log.kpis"));
      logCall("GET /api/health", healthRes.status, hd.apis ? Object.entries(hd.apis).map(([k, v]) => `${k}:${v === "ok" ? "ok" : "down"}`).join(" · ") : tr("log.healthUnavailable"));
      setTrips((td.trips || []) as Trip[]);
      setStats((sd.stats || null) as Stats | null);
      setHealth(hd);
      loadPlants(false);
    })();
  }, [loadPlants, logCall, tr]);

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

  const norm = useMemo(() => calculateDesludging(persons, tankLitres, tr), [persons, tankLitres, tr]);
  const price = useMemo(() => checkPrice(Number(quote), tr), [quote, tr]);

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
      logCall(`GET /api/pincode?pincode=${pincode}`, r.status, r.ok ? `${d.district}, ${d.state} · ${tr("log.postOffices", { count: d.count })}` : d.error);
      if (!r.ok || !d.ok) throw new Error(d.error || tr("error.pincode"));
      setPinInfo(tr("book.pinInfo", { district: d.district, state: d.state, count: d.count, offices: d.postOffices.join(", ") }));
      setMsg({ kind: "ok", text: tr("toast.pincodeOk", { district: d.district, state: d.state }) });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : tr("error.pincodeDown") });
    } finally {
      setBusy(false);
    }
  }

  async function geocodeHousehold() {
    setBusy(true);
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(hhAddress)}`);
      const d = await r.json();
      logCall(`GET /api/geocode?q=${encodeURIComponent(hhAddress).slice(0, 60)}`, r.status, r.ok ? tr("log.pickupCoords", { lat: d.results?.[0]?.lat?.toFixed(5), lon: d.results?.[0]?.lon?.toFixed(5) }) : d.error);
      if (!r.ok || !d.ok || !d.results?.length) throw new Error(d.error || tr("error.geocodeNoMatch"));
      const w = d.results[0];
      setHhCoords({ lat: w.lat, lon: w.lon, displayName: w.displayName });
      setMsg({ kind: "ok", text: tr("toast.geocodePickup", { lat: w.lat.toFixed(5), lon: w.lon.toFixed(5), name: w.displayName }) });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : tr("error.nominatim") });
    } finally {
      setBusy(false);
    }
  }

  async function geocodeCustomPlant() {
    if (!customPlant.trim()) {
      setMsg({ kind: "err", text: tr("error.plantNameFirst") });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(customPlant)}`);
      const d = await r.json();
      logCall(`GET /api/geocode?q=${encodeURIComponent(customPlant).slice(0, 60)}`, r.status, r.ok ? tr("log.plantCoords", { lat: d.results?.[0]?.lat?.toFixed(5), lon: d.results?.[0]?.lon?.toFixed(5) }) : d.error);
      if (!r.ok || !d.ok || !d.results?.length) throw new Error(d.error || tr("error.plantGeocode"));
      const w = d.results[0];
      setPlantCoords({ lat: w.lat, lon: w.lon, displayName: w.displayName });
      setMsg({ kind: "ok", text: tr("toast.geocodePlant", { lat: w.lat.toFixed(5), lon: w.lon.toFixed(5), name: w.displayName }) });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : tr("error.nominatimPlant") });
    } finally {
      setBusy(false);
    }
  }

  async function book() {
    if (!hhCoords) {
      setMsg({ kind: "err", text: tr("error.geocodeFirst") });
      return;
    }
    const plant = plantMode === "osm" ? selectedPlant : null;
    const pLat = plantMode === "osm" ? plant?.lat : plantCoords?.lat;
    const pLon = plantMode === "osm" ? plant?.lon : plantCoords?.lon;
    const pName = plantMode === "osm" ? (plant ? plantDisplayName(plant, tr) : "") : customPlant.trim();
    const pAddress = plantMode === "osm" ? (plant ? `${plant.operator || "OSM record"} · ${plant.id}` : "") : plantCoords?.displayName || "";
    if (!pName || pLat == null || pLon == null) {
      setMsg({ kind: "err", text: tr("error.choosePlant") });
      return;
    }
    if (!operator.trim() || !vehicle.trim()) {
      setMsg({ kind: "err", text: tr("error.operatorVehicle") });
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
      logCall("POST /api/trips", r.status, r.ok ? `${d.trip?.id} · ${tr("log.osrmDistance", { km: d.trip?.distanceKm })}` : d.error);
      if (!r.ok) throw new Error(d.error || tr("error.booking"));
      const trip = d.trip as Trip;
      setLastTrip(trip);
      setSelectedId(trip.id);
      setMsg({
        kind: "ok",
        text: tr("toast.booked", { id: trip.id, km: trip.distanceKm ?? "—", min: trip.durationMin ?? "—", otp: trip.plantOtp }),
      });
      await refreshTrips();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : tr("error.booking") });
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
      if (!r.ok) throw new Error(d.error || tr("error.statusUpdate"));
      setMsg({
        kind: "ok",
        text: to === "FLAGGED" ? tr("toast.flagged", { id: trip.id }) : tr("toast.statusAdvanced", { id: trip.id, status: tripStatusLabel(tr, to) }),
      });
      await refreshTrips();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : tr("error.update") });
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
      logCall(`POST /api/trips/${trip.id}/verify`, r.status, r.ok ? tr("log.otpMatch", { receipt: v.receiptId }) : d.error);
      if (!r.ok) throw new Error(d.error || tr("error.verification"));
      setMsg({ kind: "ok", text: tr("toast.verified", { id: trip.id, plant: trip.plantName, receipt: v.receiptId }) });
      await refreshTrips();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : tr("error.verify") });
    } finally {
      setBusy(false);
    }
  }

  async function generateComplaint() {
    if (!complaintTripId) {
      setMsg({ kind: "err", text: tr("toast.selectTripFirst") });
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
      logCall("POST /api/complaint", r.status, r.ok ? tr("log.complaintDraft", { id: complaintTripId }) : d.error);
      if (!r.ok) throw new Error(d.error || tr("error.complaint"));
      setComplaintText(d.text);
      setMsg({ kind: "ok", text: tr("toast.complaintBuilt") });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : tr("error.complaint") });
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
      logCall("POST /api/ai (otp)", r.status, r.ok ? tr("log.aiSource", { source: d.source }) : d.error);
      if (!r.ok) throw new Error(d.error || tr("error.ai"));
      setAiText(d.text);
      setAiSource(d.source + (d.llmError ? ` · ${tr("log.llmFallback", { error: d.llmError })}` : ""));
    } catch (e) {
      setAiText(tr("error.aiEndpoint", { error: e instanceof Error ? e.message : "unknown" }));
      setAiSource("client-error");
    } finally {
      setAiBusy(false);
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg({ kind: "ok", text: tr("toast.copied", { label }) });
    } catch {
      setMsg({ kind: "err", text: tr("toast.clipboardBlocked") });
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
    setMsg({ kind: "ok", text: tr("toast.csvExported", { count: trips.length }) });
  }

  const chain = buildChain(selected, tr);
  const statusLabel = selected ? tripStatusLabel(tr, selected.status) : tr("status.none");
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
    setMsg({ kind: "info", text: tr("toast.plantSelected", { name: plantDisplayName(p, tr), lat: p.lat.toFixed(5), lon: p.lon.toFixed(5) }) });
  }, [tr]);

  const apiEntries = health?.apis ? Object.entries(health.apis) : [];

  return (
    <div className="console">
      <div className="hazard" aria-hidden="true" />
      <header className="masthead">
        <div className="brand">
          <ChainMark />
          <div>
            <h1>Safai Trace</h1>
            <p>{tr("mast.tagline")}</p>
          </div>
        </div>
        <div className="mast-meta">
          <span className="pilot-tag">{tr("mast.pilotTag")}</span>
          <span className="mast-date">06 Nov 2026</span>
          <LanguageSwitcher className="mast-lang" />
        </div>
        <div className="api-lights" aria-label={tr("mast.apiStatus")}>
          {apiEntries.length === 0 && <span className="light checking"><i />{tr("mast.checkingApis")}</span>}
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

      <section className={`chain-strip ${selected ? selected.status : "empty"}`} aria-label={tr("chain.aria")}>
        <div className="chain-head">
          <div className="chain-id">
            {selected ? (
              <>
                <span className="mono">{selected.id}</span>
                {selected.pilot && <span className="pilot-tag">{tr("common.pilot")}</span>}
              </>
            ) : (
              <span>{tr("chain.noTrip")}</span>
            )}
          </div>
          <div className={`chain-status ${statusTone}`}>{statusLabel}</div>
          <div className={`chain-pay ${selected?.paymentReleased ? "released" : selected?.status === "FLAGGED" ? "broken" : ""}`}>
            {selected ? (selected.paymentReleased ? tr("chain.paymentReleased") : tr("chain.paymentHeld")) : "—"}
          </div>
        </div>

        <div className="chain-rail">
          {STATIONS.map((s, i) => {
            const st = chain.stations[i];
            return (
              <div className="chain-cell" key={s.key}>
                <div className={`station ${st}`}>
                  <span className="station-num">0{i + 1}</span>
                  <span className="station-name">{tr(s.nameKey)}</span>
                  <span className="station-note">{tr(s.noteKey)}</span>
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
          <button type="button" onClick={() => setMsg(null)} aria-label={tr("notice.dismiss")}>×</button>
        </div>
      )}

      <FloatingPayout trips={trips} />

      <main className="deck">
        <aside className="queue" aria-label={tr("queue.aria")}>
          <div className="panel-title">
            <h2>{tr("queue.title")}</h2>
            <span>{trips.length === 1 ? tr("queue.countOne", { count: trips.length }) : tr("queue.count", { count: trips.length })}</span>
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
                    {t.pilot && <span className="pilot-tag queue-pilot">{tr("common.pilot")}</span>}
                  </span>
                  <span className="queue-plant">{t.plantName}</span>
                </span>
                <span className="queue-side">
                  <span className={`queue-status ${t.status}`}>{tripStatusLabel(tr, t.status)}</span>
                  <span className="queue-km">{t.distanceKm != null ? `${t.distanceKm} km` : tr("queue.noRoute")}</span>
                </span>
              </button>
            ))}
            {!trips.length && <p className="empty">{tr("queue.empty")}</p>}
          </div>
          <p className="queue-note">{tr("queue.note")}</p>
        </aside>

        <section className="map-panel" aria-label={tr("map.aria")}>
          <div className="panel-bar">
            <div>
              <span className="bar-title">{tr("map.registerTitle")}</span>
              <span className="bar-meta">
                {plantsLoading
                  ? tr("common.loading")
                  : tr("map.registerMeta", { total: plants.length, named: plantMeta?.namedCount ?? namedPlants.length })}
              </span>
            </div>
            <div className="bar-actions">
              {plantMeta?.fetchedAt && <span className="bar-stamp">{tr("map.snapshot", { date: fmtDate(plantMeta.fetchedAt) })}</span>}
              <button type="button" className="btn tiny ghost" onClick={() => loadPlants(true)} disabled={plantsRefreshing}>
                {plantsRefreshing ? tr("map.refreshing") : tr("map.refresh")}
              </button>
              <a className="bar-link" href={plantMeta?.osmUrl || "https://www.openstreetmap.org/#map=11/28.64/77.20"} target="_blank" rel="noreferrer">
                {tr("common.openOsm")}
              </a>
            </div>
          </div>

          {plantMeta?.stale && (
            <div className="map-warning">
              {tr("map.stale", { date: fmtDate(plantMeta.fetchedAt), error: plantMeta.liveError || "" })}
            </div>
          )}
          {!plantsLoading && plants.length === 0 && (
            <div className="map-unavailable">
              <strong>{tr("map.unavailableTitle")}</strong>
              <p>{tr("map.unavailableBody", { error: plantMeta?.error || tr("map.allMirrorsFailed") })}</p>
              <div className="row">
                <button type="button" className="btn" onClick={() => loadPlants(true)}>{tr("map.retry")}</button>
                <a className="bar-link" href="https://www.openstreetmap.org/#map=11/28.64/77.20" target="_blank" rel="noreferrer">{tr("common.openOsm")}</a>
              </div>
            </div>
          )}

          <PlantMap plants={plants} trip={mapTrip} selectedPlantId={plantMode === "osm" ? plantId : null} onSelectPlant={onSelectPlant} />

          <div className="map-key">
            <span><i className="key-dot plant" /> {tr("map.key.plant")}</span>
            <span><i className="key-dot selected" /> {tr("map.key.selected")}</span>
            <span><i className="key-dot pickup" /> {tr("map.key.pickup")}</span>
            <span><i className="key-line route" /> {tr("map.key.route")}</span>
            <span className="key-note">{plantMeta?.license || tr("map.license")}</span>
          </div>
        </section>

        <aside className="dossier" aria-label={tr("dossier.aria")}>
          <div className="panel-title">
            <h2>{tr("dossier.title")}</h2>
            {selected?.pilot && <span className="pilot-tag">{tr("common.pilot")}</span>}
          </div>
          {!selected && <p className="empty">{tr("dossier.empty")}</p>}
          {selected && (
            <>
              <div className={`dossier-status ${statusTone}`}>
                <span>{statusLabel}</span>
                <small>{selected.paymentReleased ? tr("dossier.paymentReleasedLower") : tr("dossier.paymentHeldLower")}</small>
              </div>

              <dl className="facts">
                <div><dt>{tr("dossier.pickup")}</dt><dd>{selected.householdAddress}</dd></div>
                <div><dt>{tr("dossier.plant")}</dt><dd>{selected.plantName}<br /><span className="dim">{selected.plantAddress}</span></dd></div>
                <div><dt>{tr("dossier.distance")}</dt><dd>{selected.distanceKm != null ? `${selected.distanceKm} km · ${selected.durationMin} min` : tr("common.notRecorded")} <span className="dim">{tr("dossier.osrmLive")}</span></dd></div>
                <div><dt>{tr("dossier.operator")}</dt><dd>{selected.operatorName}<br /><span className="dim">{selected.vehicleNo}</span></dd></div>
                <div><dt>{tr("dossier.quoted")}</dt><dd>{selected.quotedPrice != null ? `₹${selected.quotedPrice.toLocaleString("en-IN")}` : tr("common.notRecorded")}</dd></div>
                <div><dt>{tr("dossier.booked")}</dt><dd>{fmtDateTime(selected.createdAt)}</dd></div>
              </dl>

              <div className="gate-code">
                <span className="gate-label">{tr("dossier.gateLabel")}</span>
                <div className="otp-digits" aria-label={tr("dossier.otpAria", { otp: selected.plantOtp })}>
                  {selected.plantOtp.split("").map((d, i) => <span key={i}>{d}</span>)}
                </div>
                <span className="gate-hint">{tr("dossier.gateHint")}</span>
              </div>

              <div className="dossier-actions">
                {selected.status === "BOOKED" && (
                  <button type="button" className="btn wide" disabled={busy} onClick={() => advance(selected, "EN_ROUTE")}>{tr("dossier.startTrip")}</button>
                )}
                {selected.status === "EN_ROUTE" && (
                  <button type="button" className="btn wide" disabled={busy} onClick={() => advance(selected, "AT_PLANT")}>{tr("dossier.markArrival")}</button>
                )}
                {selected.status === "AT_PLANT" && (
                  <div className="verify-block">
                    <label htmlFor={`otp-${selected.id}`}>{tr("dossier.otpField")}</label>
                    <input
                      id={`otp-${selected.id}`}
                      inputMode="numeric"
                      maxLength={4}
                      placeholder={tr("dossier.otpPlaceholder")}
                      value={verifyMap[selected.id]?.otp || ""}
                      onChange={(e) => setVerifyMap({ ...verifyMap, [selected.id]: { ...(verifyMap[selected.id] || { receiptId: "" }), otp: e.target.value } })}
                    />
                    <label htmlFor={`rcpt-${selected.id}`}>{tr("dossier.receiptField")}</label>
                    <input
                      id={`rcpt-${selected.id}`}
                      placeholder="WBR-OKH-20261106-002"
                      value={verifyMap[selected.id]?.receiptId || ""}
                      onChange={(e) => setVerifyMap({ ...verifyMap, [selected.id]: { ...(verifyMap[selected.id] || { otp: "" }), receiptId: e.target.value } })}
                    />
                    <button type="button" className="btn wide" disabled={busy} onClick={() => verify(selected)}>{tr("dossier.verify")}</button>
                  </div>
                )}
                {selected.status === "FLAGGED" && (
                  <>
                    <div className="broken-note">{tr("dossier.brokenNote")}</div>
                    <button type="button" className="btn wide ghost" disabled={busy} onClick={() => advance(selected, "AT_PLANT")}>{tr("dossier.revisit")}</button>
                    <button type="button" className="btn wide ghost" onClick={() => { setTab("act"); setComplaintTripId(selected.id); }}>{tr("dossier.buildComplaint")}</button>
                  </>
                )}
                {selected.status === "VERIFIED" && (
                  <>
                    <div className="verified-note">{tr("chain.caption.verified", { receipt: selected.receiptId ?? "—", at: fmtDateTime(selected.verifiedAt) })}</div>
                    <Link className="btn wide" href={`/certificate/${selected.id}`}>{tr("dossier.openCertificate")}</Link>
                  </>
                )}
                {(selected.status === "EN_ROUTE" || selected.status === "AT_PLANT") && (
                  <div className="flag-block">
                    <label htmlFor={`flag-${selected.id}`}>{tr("dossier.flagLabel")}</label>
                    <input
                      id={`flag-${selected.id}`}
                      placeholder={tr("dossier.flagPlaceholder")}
                      value={flagReason[selected.id] || ""}
                      onChange={(e) => setFlagReason({ ...flagReason, [selected.id]: e.target.value })}
                    />
                    <button type="button" className="btn wide danger" disabled={busy} onClick={() => advance(selected, "FLAGGED")}>{tr("dossier.flagAction")}</button>
                  </div>
                )}
              </div>

              <div className="gate-token">
                <span>{tr("dossier.gateToken")}</span>
                <code>SAFAI-TRACE:{selected.id}:OTP-{selected.plantOtp}</code>
                <button type="button" className="link-btn" onClick={() => copyText(`SAFAI-TRACE:${selected.id}:OTP-${selected.plantOtp}`, tr("dossier.gateToken"))}>{tr("common.copy")}</button>
              </div>

              <div className="osm-links">
                <a href={`https://www.openstreetmap.org/?mlat=${selected.householdLat}&mlon=${selected.householdLon}#map=15/${selected.householdLat}/${selected.householdLon}`} target="_blank" rel="noreferrer">{tr("dossier.pickupOsm")}</a>
                <a href={`https://www.openstreetmap.org/?mlat=${selected.plantLat}&mlon=${selected.plantLon}#map=15/${selected.plantLat}/${selected.plantLon}`} target="_blank" rel="noreferrer">{tr("dossier.plantOsm")}</a>
              </div>
            </>
          )}
        </aside>
      </main>

      <nav className="desk-tabs" aria-label={tr("tabs.aria")}>
        {TABS.map((tabItem) => (
          <button type="button" key={tabItem.id} className={tab === tabItem.id ? "active" : ""} onClick={() => setTab(tabItem.id)}>
            {tr(tabItem.labelKey)}
          </button>
        ))}
      </nav>

      <section className="desk">
        {tab === "book" && (
          <div className="book-grid">
            <div className="field-col">
              <div className="section-head">
                <h2>{tr("book.title")}</h2>
                <p>{tr("book.lead")}</p>
              </div>

              <label htmlFor="hh-label">{tr("book.householdLabel")} <span className="opt">{tr("common.optional")}</span></label>
              <input id="hh-label" value={hhLabel} onChange={(e) => setHhLabel(e.target.value)} placeholder={tr("book.householdPlaceholder")} />

              <label htmlFor="hh-address">{tr("book.pickupAddress")} <span className="req">{tr("book.geocodedLive")}</span></label>
              <div className="input-row">
                <input id="hh-address" value={hhAddress} onChange={(e) => setHhAddress(e.target.value)} placeholder={tr("book.pickupPlaceholder")} />
                <button type="button" className="btn ghost" disabled={busy} onClick={geocodeHousehold}>{tr("book.findPickup")}</button>
              </div>
              {hhCoords ? (
                <p className="readout ok">{tr("book.nominatimReadout", { lat: hhCoords.lat.toFixed(5), lon: hhCoords.lon.toFixed(5) })}<br /><span>{hhCoords.displayName}</span></p>
              ) : (
                <p className="readout">{tr("book.noCoords")}</p>
              )}

              <label htmlFor="pincode">{tr("book.pincode")} <span className="req">India Post</span></label>
              <div className="input-row">
                <input id="pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="110001" inputMode="numeric" maxLength={6} />
                <button type="button" className="btn ghost" disabled={busy} onClick={checkPincode}>{tr("book.validate")}</button>
              </div>
              {pinInfo && <p className="readout ok">{pinInfo}</p>}

              <div className="section-head sub">
                <h3>{tr("book.tankTitle")}</h3>
                <p>{tr("book.tankLead")}</p>
              </div>
              <div className="two-up">
                <div>
                  <label htmlFor="persons">{tr("book.people")}</label>
                  <input id="persons" type="number" min={1} max={50} value={persons} onChange={(e) => setPersons(Number(e.target.value))} />
                </div>
                <div>
                  <label htmlFor="tank">{tr("book.tankCapacity")}</label>
                  <input id="tank" type="number" min={100} step={100} value={tankLitres} onChange={(e) => setTankLitres(Number(e.target.value))} />
                </div>
              </div>
              <p className="readout">
                {tr("book.cpheeo", { headline: norm.headline, litres: norm.annualSludgeL.toLocaleString("en-IN") })} <button type="button" className="link-btn" onClick={() => setTab("norms")}>{tr("book.seeFormula")}</button>
              </p>
            </div>

            <div className="field-col">
              <div className="section-head">
                <h2>{tr("book.plantTitle")}</h2>
                <p>{tr("book.plantLead")}</p>
              </div>

              <label htmlFor="plant">{tr("book.plantRecord")}</label>
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
                  <option key={p.id} value={p.id}>{tr("plant.option", { name: plantDisplayName(p, tr), lat: p.lat.toFixed(4), lon: p.lon.toFixed(4) })}</option>
                ))}
                <option value="__custom__">{tr("book.otherPlant")}</option>
              </select>
              {plantMode === "osm" && selectedPlant && (
                <p className="readout ok">
                  {selectedPlant.operator || tr("book.osmRecord")} · {selectedPlant.id}<br />
                  <a href={selectedPlant.osmUrl} target="_blank" rel="noreferrer">{tr("book.openRecord")}</a>
                </p>
              )}
              {plantMode === "custom" && (
                <>
                  <label htmlFor="custom-plant">{tr("book.customPlant")}</label>
                  <div className="input-row">
                    <input id="custom-plant" value={customPlant} onChange={(e) => setCustomPlant(e.target.value)} placeholder={tr("book.customPlantPlaceholder")} />
                    <button type="button" className="btn ghost" disabled={busy} onClick={geocodeCustomPlant}>{tr("book.geocode")}</button>
                  </div>
                  {plantCoords ? (
                    <p className="readout ok">{tr("book.nominatimReadout", { lat: plantCoords.lat.toFixed(5), lon: plantCoords.lon.toFixed(5) })}<br /><span>{plantCoords.displayName}</span></p>
                  ) : (
                    <p className="readout">{tr("book.notGeocoded")}</p>
                  )}
                </>
              )}

              <div className="two-up">
                <div>
                  <label htmlFor="operator">{tr("book.operator")}</label>
                  <input id="operator" value={operator} onChange={(e) => setOperator(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="vehicle">{tr("book.vehicle")}</label>
                  <input id="vehicle" value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
                </div>
              </div>

              <label htmlFor="quote">{tr("book.quote")} <span className="req">{tr("book.sanityCheck")}</span></label>
              <input id="quote" type="number" min={0} step={100} value={quote} onChange={(e) => setQuote(e.target.value)} />
              {price && (
                <p className={`readout price-${price.status}`}>
                  <strong>{price.headline}.</strong> {price.detail}
                </p>
              )}

              <button type="button" className="btn wide book-btn" disabled={busy || !hhCoords || (plantMode === "osm" ? !selectedPlant : !plantCoords)} onClick={book}>
                {busy ? tr("common.working") : tr("book.bookButton")}
              </button>
              <p className="fine">{tr("book.noFake")}</p>

              {lastTrip && (
                <div className="proof-box">
                  <div className="proof-head">
                    <strong>{tr("book.gateProof", { id: lastTrip.id })}</strong>
                    <span className="pilot-tag">{tr("common.pilot")}</span>
                  </div>
                  <p>{tr("book.otpLine", { otp: lastTrip.plantOtp, km: lastTrip.distanceKm ?? "—", min: lastTrip.durationMin ?? "—" })}</p>
                  <code>SAFAI-TRACE:{lastTrip.id}:OTP-{lastTrip.plantOtp}</code>
                  <button type="button" className="link-btn" onClick={() => copyText(`SAFAI-TRACE:${lastTrip.id}:OTP-${lastTrip.plantOtp}`, tr("dossier.gateToken"))}>{tr("book.copyToken")}</button>
                  <p className="fine">{tr("book.proofFine")}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "norms" && (
          <div className="norms-grid">
            <div className="field-col">
              <div className="section-head">
                <h2>{tr("norms.title")}</h2>
                <p>{tr("norms.lead")}</p>
              </div>
              <div className="two-up">
                <div>
                  <label htmlFor="n-persons">{tr("book.people")}</label>
                  <input id="n-persons" type="number" min={1} max={50} value={persons} onChange={(e) => setPersons(Number(e.target.value))} />
                </div>
                <div>
                  <label htmlFor="n-tank">{tr("book.tankCapacity")}</label>
                  <input id="n-tank" type="number" min={100} step={100} value={tankLitres} onChange={(e) => setTankLitres(Number(e.target.value))} />
                </div>
              </div>
              <div className="preset-row">
                {[1000, 1500, 2000, 3000].map((v) => (
                  <button type="button" key={v} className={`chip ${tankLitres === v ? "on" : ""}`} onClick={() => setTankLitres(v)}>{v.toLocaleString("en-IN")} L</button>
                ))}
              </div>
              <div className={`norm-result ${norm.status}`}>
                <span className="norm-big">{norm.recommendedYears}<small>{norm.recommendedYears === 1 ? tr("norms.unit.year") : tr("norms.unit.years")}</small></span>
                <div>
                  <strong>{norm.headline}</strong>
                  <p>{norm.detail}</p>
                </div>
              </div>
              <div className="formula">
                <span>{tr("norms.formulaLabel")}</span>
                <code>V = N × 0.067 m³/person/yr × T</code>
                <p>{tr("norms.formulaDetail", {
                  persons: norm.persons,
                  annual: norm.annualSludgeL.toLocaleString("en-IN"),
                  required: norm.required3yL.toLocaleString("en-IN"),
                  years: norm.yearsToFill,
                })}</p>
              </div>
            </div>

            <div className="field-col">
              <div className="section-head">
                <h2>{tr("norms.quickTitle")}</h2>
                <p>{tr("norms.quickLead")}</p>
              </div>
              <table className="matrix">
                <thead>
                  <tr>
                    <th>{tr("norms.peopleCol")}</th>
                    {[1000, 1500, 2000, 3000].map((v) => <th key={v}>{v.toLocaleString("en-IN")} L</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[3, 5, 7, 9].map((p) => (
                    <tr key={p}>
                      <th>{p}</th>
                      {[1000, 1500, 2000, 3000].map((v) => {
                        const r = calculateDesludging(p, v, tr);
                        return <td key={v} className={r.status}>{tr("norms.yearsValue", { years: r.recommendedYears })}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="section-head" style={{ marginTop: 22 }}>
                <h2>{tr("norms.septageTitle")}</h2>
                <p>{tr("norms.septageLead")}</p>
              </div>
              <label htmlFor="septage-state" className="sr-only">{tr("norms.septageStateLabel")}</label>
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
                {septageLoading && <p>{tr("norms.querying")}</p>}
                {!septageLoading && septage?.ok && (
                  <>
                    <p className="septage-total">
                      <strong>{septage.total}</strong> {septage.total === 1 ? tr("norms.septageTotalOne", { count: septage.total, state: septage.state }) : tr("norms.septageTotal", { count: septage.total, state: septage.state })}
                    </p>
                    <p className="fine">
                      {tr("norms.septagePhases", {
                        saap1: septage.phases.saap1 ?? "—",
                        saap2: septage.phases.saap2 ?? "—",
                        saap3: septage.phases.saap3 ?? "—",
                        date: new Date(septage.fetchedAt).toLocaleString("en-IN"),
                      })}
                    </p>
                  </>
                )}
                {!septageLoading && septage && !septage.ok && (
                  <p className="fine">
                    {septage.reason === "unconfigured"
                      ? tr("septage.unconfigured")
                      : septage.reason === "no-row"
                        ? tr("septage.noRow", { state: septageState })
                        : tr("septage.error")}
                  </p>
                )}
                <p className="fine">
                  {tr("common.source")}{" "}
                  <a href={AMRUT_RESOURCE_URL} target="_blank" rel="noreferrer">
                    {AMRUT_DATASET_TITLE}
                  </a>
                  .
                </p>
              </div>

              <div className="source-block">
                <p><strong>{tr("norms.normLabel")}</strong> {tr("norms.source.interval")}</p>
                <p><strong>{tr("norms.accumulationLabel")}</strong> {tr("norms.source.accumulation")}</p>
                <p><strong>{tr("norms.tankSizeLabel")}</strong> {tr("norms.source.tank")}</p>
                <p className="fine">{tr("norms.source.caveat")}</p>
                <div className="source-links">
                  <a href={CPHEEO.intervalUrl} target="_blank" rel="noreferrer">{tr("norms.link.advisory")}</a>
                  <a href={CPHEEO.accumulationUrl} target="_blank" rel="noreferrer">{tr("norms.link.manual")}</a>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "price" && (
          <div className="price-grid">
            <div className="field-col">
              <div className="section-head">
                <h2>{tr("price.title")}</h2>
                <p>{tr("price.lead")}</p>
              </div>
              <label htmlFor="p-quote">{tr("book.quote")}</label>
              <input id="p-quote" type="number" min={0} step={100} value={quote} onChange={(e) => setQuote(e.target.value)} />
              <div className={`price-verdict ${price?.status || "empty"}`}>
                <span className="price-big">{price ? `₹${price.quote.toLocaleString("en-IN")}` : "—"}</span>
                <div>
                  <strong>{price?.headline || tr("price.enterQuote")}</strong>
                  <p>{price?.detail || tr("price.benchmarkFallback", { min: PRICE_BENCHMARK.min.toLocaleString("en-IN"), max: PRICE_BENCHMARK.max.toLocaleString("en-IN") })}</p>
                </div>
              </div>
              <div className="price-track" aria-hidden="true">
                <span className="price-band" />
                {price && <span className="price-marker" style={{ left: `${Math.min(100, Math.max(0, (price.quote / 4000) * 100))}%` }} />}
                <span className="price-tick" style={{ left: "37.5%" }}>₹1,500</span>
                <span className="price-tick" style={{ left: "62.5%" }}>₹2,500</span>
              </div>
              <p className="fine">{tr("price.scaleNote")}</p>
            </div>
            <div className="field-col">
              <div className="section-head">
                <h2>{tr("price.coversTitle")}</h2>
                <p>{tr("price.coversLead")}</p>
              </div>
              <div className="source-block">
                <p><strong>{tr("price.primaryLabel")}</strong> {tr("price.primarySource")}</p>
                <p><strong>{tr("price.crossCheckLabel")}</strong> {tr("price.secondarySource")}</p>
                <p className="fine">{tr("price.caveat")}</p>
                <div className="source-links">
                  <a href={PRICE_BENCHMARK.primaryUrl} target="_blank" rel="noreferrer">{tr("price.linkPrimary")}</a>
                  <a href={PRICE_BENCHMARK.secondaryUrl} target="_blank" rel="noreferrer">{tr("price.linkSecondary")}</a>
                </div>
              </div>
              <div className="advice">
                <h3>{tr("price.adviceTitle")}</h3>
                <ol>
                  <li>{tr("price.advice1")}</li>
                  <li>{tr("price.advice2")}</li>
                  <li>{tr("price.advice3")}</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {tab === "act" && (
          <div className="act-grid">
            <div className="field-col">
              <div className="section-head">
                <h2>{tr("act.title")}</h2>
                <p>{tr("act.lead")}</p>
              </div>
              <label htmlFor="c-trip">{tr("common.trip")}</label>
              <select id="c-trip" value={complaintTripId} onChange={(e) => setComplaintTripId(e.target.value)}>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>{t.id} · {tripStatusLabel(tr, t.status)} · {t.vehicleNo}</option>
                ))}
              </select>
              <label htmlFor="c-area">{tr("act.area")} <span className="opt">{tr("act.areaHint")}</span></label>
              <input id="c-area" value={complaintArea} onChange={(e) => setComplaintArea(e.target.value)} placeholder={tr("act.areaPlaceholder")} />
              <button type="button" className="btn wide" disabled={complaintBusy} onClick={generateComplaint}>
                {complaintBusy ? tr("act.building") : tr("act.buildButton")}
              </button>
              {complaintText && (
                <>
                  <p className="fine">{tr("doc.englishOnly")}</p>
                  <textarea className="complaint-text" lang="en" dir="ltr" value={complaintText} onChange={(e) => setComplaintText(e.target.value)} rows={16} />
                  <div className="row wrap">
                    <button type="button" className="btn ghost" onClick={() => copyText(complaintText, tr("act.copyLabel"))}>{tr("common.copy")}</button>
                    <button type="button" className="btn ghost" onClick={() => downloadText(`safai-complaint-${complaintTripId}.txt`, complaintText)}>{tr("act.download")}</button>
                    <a className="btn ghost" href={`https://wa.me/?text=${encodeURIComponent(complaintText.slice(0, 1800))}`} target="_blank" rel="noreferrer">{tr("act.whatsapp")}</a>
                  </div>
                  <p className="fine">{tr("act.whatsappFine")}</p>
                </>
              )}
            </div>

            <div className="field-col">
              <div className="section-head">
                <h2>{tr("act.routesTitle")}</h2>
                <p>{tr("act.routesLead", { date: HELP_VERIFIED_ON })}</p>
              </div>
              <ul className="help-list">
                {HELP_ROUTES.map((h) => (
                  <li key={h.name}>
                    <div className="help-main">
                      <strong>{h.name}</strong>
                      <span className="help-note">{tr(h.noteKey)}</span>
                      <a className="help-source" href={h.sourceUrl} target="_blank" rel="noreferrer">{h.sourceLabel}</a>
                    </div>
                    <div className="help-action">
                      {h.number && <a className="help-number" href={`tel:${h.number}`}>{h.number}</a>}
                      {h.alt && <span className="help-alt">{h.alt}</span>}
                      <a className="help-open" href={h.url} target="_blank" rel="noreferrer">{tr(h.channelKey)}</a>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="fine">{tr("act.routesFine")}</p>
            </div>
          </div>
        )}

        {tab === "oversight" && (
          <div className="oversight">
            <div className="kpi-strip">
              <div><span className="kpi-num">{stats?.total ?? "—"}</span><span className="kpi-label">{tr("oversight.kpiTrips")}</span><span className="kpi-sub">{tr("oversight.kpiTripsSub")}</span></div>
              <div><span className="kpi-num ok">{stats?.pctSafe ?? 0}%</span><span className="kpi-label">{tr("oversight.kpiSafe")}</span><span className="kpi-sub">{tr("oversight.kpiSafeSub")}</span></div>
              <div><span className="kpi-num bad">{stats?.flagged ?? 0}</span><span className="kpi-label">{tr("oversight.kpiFlagged")}</span><span className="kpi-sub">{tr("oversight.kpiFlaggedSub")}</span></div>
              <div><span className="kpi-num">{stats?.inFlight ?? 0}</span><span className="kpi-label">{tr("oversight.kpiInFlight")}</span><span className="kpi-sub">{tr("oversight.kpiInFlightSub")}</span></div>
              <div><span className="kpi-num">{stats?.avgKm ?? 0} km</span><span className="kpi-label">{tr("oversight.kpiAvg")}</span><span className="kpi-sub">{tr("oversight.kpiAvgSub")}</span></div>
            </div>

            <div className="oversight-grid">
              <div className="oversight-col">
                <div className="section-head">
                  <h2>{tr("oversight.hotspotsTitle")}</h2>
                  <p>{tr("oversight.hotspotsLead")}</p>
                </div>
                {hotspots.length === 0 && <p className="empty">{tr("oversight.hotspotsEmpty")}</p>}
                {hotspots.map((t) => (
                  <div className="hotspot" key={t.id}>
                    <div className="hotspot-head">
                      <span className="mono">{t.id}</span>
                      <span className="pilot-tag">{tr("common.pilot")}</span>
                      <span className="bad">{t.vehicleNo}</span>
                    </div>
                    <p>{t.householdAddress}</p>
                    <p className="dim">{t.flaggedReason}</p>
                    <div className="row wrap">
                      <button type="button" className="link-btn" onClick={() => { setSelectedId(t.id); setTab("act"); setComplaintTripId(t.id); }}>{tr("oversight.buildComplaint")}</button>
                      <a className="link-btn" href={`https://www.openstreetmap.org/?mlat=${t.householdLat}&mlon=${t.householdLon}#map=15/${t.householdLat}/${t.householdLon}`} target="_blank" rel="noreferrer">{tr("dossier.pickupOsm")}</a>
                    </div>
                  </div>
                ))}

                <div className="section-head sub">
                  <h2>{tr("oversight.logTitle")}</h2>
                  <p>{tr("oversight.logLead")}</p>
                </div>
                <div className="table-wrap">
                  <table className="log-table">
                    <thead><tr><th>{tr("common.trip")}</th><th>{tr("oversight.status")}</th><th>{tr("common.plant")}</th><th>{tr("oversight.receipt")}</th><th>{tr("oversight.payment")}</th></tr></thead>
                    <tbody>
                      {trips.map((t) => (
                        <tr key={t.id}>
                          <td className="mono">{t.id}</td>
                          <td><span className={`status-chip ${t.status}`}>{tripStatusLabel(tr, t.status)}</span></td>
                          <td>{t.plantName}</td>
                          <td>{t.receiptId || "—"}</td>
                          <td>{t.paymentReleased ? tr("oversight.released") : tr("oversight.held")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="row wrap">
                  <button type="button" className="btn ghost" onClick={exportCsv}>{tr("oversight.exportCsv")}</button>
                  <a className="btn ghost" href="/api/stats" target="_blank" rel="noreferrer">{tr("oversight.openStats")}</a>
                </div>
              </div>

              <div className="oversight-col">
                <div className="section-head">
                  <h2>{tr("oversight.callsTitle")}</h2>
                  <p>{tr("oversight.callsLead")}</p>
                </div>
                <div className="table-wrap call-table">
                  <table className="log-table">
                    <thead><tr><th>{tr("oversight.time")}</th><th>{tr("oversight.call")}</th><th>{tr("oversight.status")}</th><th>{tr("oversight.note")}</th></tr></thead>
                    <tbody>
                      {callLog.map((c) => (
                        <tr key={c.id}>
                          <td className="mono">{c.at}</td>
                          <td className="mono call-label">{c.label}</td>
                          <td className={c.status && c.status < 400 ? "ok" : "bad"}>{c.status ?? "ERR"}</td>
                          <td>{c.note}</td>
                        </tr>
                      ))}
                      {!callLog.length && <tr><td colSpan={4}>{tr("oversight.noCalls")}</td></tr>}
                    </tbody>
                  </table>
                </div>

                <details className="ai-box">
                  <summary>{tr("oversight.aiSummary")}</summary>
                  <p>{tr("oversight.aiLead")}</p>
                  <div className="row wrap">
                    <select value={aiTripId} onChange={(e) => setAiTripId(e.target.value)}>
                      {trips.map((t) => <option key={t.id} value={t.id}>{t.id} · {t.plantName}</option>)}
                    </select>
                    <button type="button" className="btn ghost" disabled={aiBusy} onClick={runAi}>{aiBusy ? tr("oversight.calling") : tr("oversight.generate")}</button>
                  </div>
                  {aiText && <pre className="ai-text" lang="en" dir="ltr">{aiText}</pre>}
                  {aiSource && <p className="fine">{tr("oversight.aiSource", { source: aiSource })}</p>}
                </details>
              </div>
            </div>
          </div>
        )}
      </section>

      <footer className="foot">
        <div className="foot-grid">
          <div>
            <h2>{tr("footer.provesTitle")}</h2>
            <p>{tr("footer.provesBody")}</p>
            <p className="fine">{tr("footer.builtFor")}</p>
          </div>
          <div>
            <h2>{tr("footer.normsTitle")}</h2>
            <ul>
              <li><a href={CPHEEO.intervalUrl} target="_blank" rel="noreferrer">{tr("footer.linkAdvisory")}</a> — {tr("footer.linkAdvisoryNote")}</li>
              <li><a href={CPHEEO.accumulationUrl} target="_blank" rel="noreferrer">{tr("footer.linkManual")}</a> — {tr("footer.linkManualNote")}</li>
              <li><a href={PRICE_BENCHMARK.primaryUrl} target="_blank" rel="noreferrer">{tr("footer.linkRates")}</a> — {tr("footer.linkRatesNote")}</li>
              <li><a href={PRICE_BENCHMARK.secondaryUrl} target="_blank" rel="noreferrer">{tr("footer.linkGuide")}</a> — {tr("footer.linkGuideNote")}</li>
            </ul>
          </div>
          <div>
            <h2>{tr("footer.dataTitle")}</h2>
            <ul>
              <li><a href="https://www.ndtv.com/india-news/nearly-500-died-while-cleaning-sewers-or-septic-tanks-since-2019-centre-11866683" target="_blank" rel="noreferrer">{tr("footer.linkDeaths")}</a> — {tr("footer.linkDeathsNote")}</li>
              <li><a href="https://sbmurban.org/storage/app/media/pdf/swachh-bharat-2.pdf" target="_blank" rel="noreferrer">SBM (Urban) 2.0</a> — {tr("footer.linkSbmNote")}</li>
              <li><a href="https://censusindia.gov.in/" target="_blank" rel="noreferrer">{tr("footer.linkCensus")}</a> — {tr("footer.linkCensusNote")}</li>
              <li><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> (ODbL) · Overpass · OSRM · India Post · Nominatim</li>
            </ul>
          </div>
        </div>
        <div className="foot-base">
          <span>{tr("footer.baseBrand")}</span>
          <span>{tr("footer.baseNote")}</span>
        </div>
      </footer>
    </div>
  );
}

function buildChain(
  trip: Trip | null,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
) {
  const stations: string[] = ["pending", "pending", "pending", "pending"];
  const links: string[] = ["pending", "pending", "pending"];
  if (!trip) {
    return {
      stations,
      links,
      caption: t("chain.caption.none"),
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
      caption: t("chain.caption.flagged", {
        reason: trip.flaggedReason || t("chain.noReceiptReason"),
      }),
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
    BOOKED: t("chain.caption.booked"),
    EN_ROUTE: t("chain.caption.enRoute"),
    AT_PLANT: t("chain.caption.atPlant"),
    VERIFIED: t("chain.caption.verified", {
      receipt: trip.receiptId ?? "—",
      at: fmtDateTime(trip.verifiedAt),
    }),
  };
  return { stations, links, caption: captions[trip.status] || t("chain.caption.unknown") };
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
