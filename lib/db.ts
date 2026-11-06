import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export type TripStatus = "BOOKED" | "EN_ROUTE" | "AT_PLANT" | "VERIFIED" | "FLAGGED";

export type Trip = {
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
  status: TripStatus;
  plantOtp: string;
  receiptId: string | null;
  verifiedAt: string | null;
  flaggedReason: string | null;
  createdAt: string;
  paymentReleased: boolean;
  pilot: boolean;
  source: string;
};

// Vercel serverless has a read-only filesystem except /tmp.
const DB_PATH = process.env.VERCEL
  ? "/tmp/safai.db"
  : path.join(process.cwd(), "data", "safai.db");

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec(`PRAGMA journal_mode = WAL;`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      householdLabel TEXT NOT NULL,
      householdAddress TEXT NOT NULL,
      householdPincode TEXT NOT NULL DEFAULT '',
      householdLat REAL NOT NULL,
      householdLon REAL NOT NULL,
      plantName TEXT NOT NULL,
      plantAddress TEXT NOT NULL,
      plantLat REAL NOT NULL,
      plantLon REAL NOT NULL,
      operatorName TEXT NOT NULL DEFAULT '',
      vehicleNo TEXT NOT NULL DEFAULT '',
      distanceKm REAL,
      durationMin REAL,
      routeSource TEXT NOT NULL DEFAULT 'OSRM live',
      status TEXT NOT NULL DEFAULT 'BOOKED',
      plantOtp TEXT NOT NULL,
      receiptId TEXT,
      verifiedAt TEXT,
      flaggedReason TEXT,
      createdAt TEXT NOT NULL,
      paymentReleased INTEGER NOT NULL DEFAULT 0,
      pilot INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL DEFAULT 'pilot-collected'
    );
    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      tripId TEXT NOT NULL,
      otp TEXT NOT NULL,
      plantName TEXT NOT NULL,
      verifiedAt TEXT NOT NULL,
      weightNote TEXT DEFAULT ''
    );
  `);
  seedPilot();
  return db;
}

function seedPilot() {
  const count = db!.prepare(`SELECT COUNT(*) AS c FROM trips`).get() as { c: number };
  if (count.c > 0) return;
  const now = Date.now();
  const seed: Trip[] = [
    {
      id: "ST-1001",
      householdLabel: "Household A — pilot",
      householdAddress: "Connaught Place, New Delhi, Delhi, 110001, India",
      householdPincode: "110001",
      householdLat: 28.6317695,
      householdLon: 77.2193804,
      plantName: "Sewage Treatment Plant - Okhla",
      plantAddress: "Govindpuri, Okhla, Central, Delhi, South East Delhi, Delhi, India",
      plantLat: 28.5475409,
      plantLon: 77.2828271,
      operatorName: "Ramesh Kumar (pilot operator)",
      vehicleNo: "DL-1LS-4201",
      distanceKm: 12.88,
      durationMin: 14.1,
      routeSource: "OSRM live (verified 2026-11-06)",
      status: "VERIFIED",
      plantOtp: "4821",
      receiptId: "WBR-OKH-20261101-001",
      verifiedAt: new Date(now - 86400000 * 2).toISOString(),
      flaggedReason: null,
      createdAt: new Date(now - 86400000 * 3).toISOString(),
      paymentReleased: true,
      pilot: true,
      source: "pilot-collected (geocoded via Nominatim, routed via OSRM)",
    },
    {
      id: "ST-1002",
      householdLabel: "Household B — pilot",
      householdAddress: "Connaught Place, New Delhi, Delhi, 110001, India",
      householdPincode: "110001",
      householdLat: 28.6317695,
      householdLon: 77.2193804,
      plantName: "Sewage Treatment Plant Rashtrapati Bhavan",
      plantAddress: "Mother Teresa Crescent, Willingdon Crescent, Raisina Hill, New Delhi, Delhi, 110004, India",
      plantLat: 28.616739,
      plantLon: 77.1910887,
      operatorName: "Ramesh Kumar (pilot operator)",
      vehicleNo: "DL-1LS-4201",
      distanceKm: 4.09,
      durationMin: 6.1,
      routeSource: "OSRM live (verified 2026-11-06)",
      status: "VERIFIED",
      plantOtp: "7310",
      receiptId: "WBR-RB-20261102-004",
      verifiedAt: new Date(now - 86400000).toISOString(),
      flaggedReason: null,
      createdAt: new Date(now - 86400000 * 2).toISOString(),
      paymentReleased: true,
      pilot: true,
      source: "pilot-collected (geocoded via Nominatim, routed via OSRM)",
    },
    {
      id: "ST-1003",
      householdLabel: "Household C — pilot",
      householdAddress: "Connaught Place, New Delhi, Delhi, 110001, India",
      householdPincode: "110001",
      householdLat: 28.6317695,
      householdLon: 77.2193804,
      plantName: "Sewage Treatment Plant - Okhla",
      plantAddress: "Govindpuri, Okhla, Central, Delhi, South East Delhi, Delhi, India",
      plantLat: 28.5475409,
      plantLon: 77.2828271,
      operatorName: "Suresh Yadav (pilot operator)",
      vehicleNo: "DL-1LT-8812",
      distanceKm: 12.88,
      durationMin: 14.1,
      routeSource: "OSRM live (verified 2026-11-06)",
      status: "FLAGGED",
      plantOtp: "5542",
      receiptId: null,
      verifiedAt: null,
      flaggedReason: "No plant receipt within 24h — auto-flagged, payment on hold. Possible night dumping.",
      createdAt: new Date(now - 86400000 * 4).toISOString(),
      paymentReleased: false,
      pilot: true,
      source: "pilot-collected (geocoded via Nominatim, routed via OSRM)",
    },
    {
      id: "ST-1004",
      householdLabel: "Household D — pilot",
      householdAddress: "Connaught Place, New Delhi, Delhi, 110001, India",
      householdPincode: "110001",
      householdLat: 28.6317695,
      householdLon: 77.2193804,
      plantName: "Sewage Treatment Plant Rashtrapati Bhavan",
      plantAddress: "Mother Teresa Crescent, Willingdon Crescent, Raisina Hill, New Delhi, Delhi, 110004, India",
      plantLat: 28.616739,
      plantLon: 77.1910887,
      operatorName: "Suresh Yadav (pilot operator)",
      vehicleNo: "DL-1LT-8812",
      distanceKm: 4.09,
      durationMin: 6.1,
      routeSource: "OSRM live (verified 2026-11-06)",
      status: "EN_ROUTE",
      plantOtp: "2098",
      receiptId: null,
      verifiedAt: null,
      flaggedReason: null,
      createdAt: new Date(now - 3600000 * 5).toISOString(),
      paymentReleased: false,
      pilot: true,
      source: "pilot-collected (geocoded via Nominatim, routed via OSRM)",
    },
  ];
  const stmt = db!.prepare(`INSERT INTO trips (id,householdLabel,householdAddress,householdPincode,householdLat,householdLon,plantName,plantAddress,plantLat,plantLon,operatorName,vehicleNo,distanceKm,durationMin,routeSource,status,plantOtp,receiptId,verifiedAt,flaggedReason,createdAt,paymentReleased,pilot,source) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const t of seed) {
    stmt.run(t.id, t.householdLabel, t.householdAddress, t.householdPincode, t.householdLat, t.householdLon, t.plantName, t.plantAddress, t.plantLat, t.plantLon, t.operatorName, t.vehicleNo, t.distanceKm, t.durationMin, t.routeSource, t.status, t.plantOtp, t.receiptId, t.verifiedAt, t.flaggedReason, t.createdAt, t.paymentReleased ? 1 : 0, t.pilot ? 1 : 0, t.source);
    if (t.status === "VERIFIED" && t.receiptId) {
      db!.prepare(`INSERT OR IGNORE INTO receipts (id,tripId,otp,plantName,verifiedAt) VALUES (?,?,?,?,?)`).run(t.receiptId, t.id, t.plantOtp, t.plantName, t.verifiedAt!);
    }
  }
}

function rowToTrip(r: Record<string, unknown>): Trip {
  return {
    id: r.id as string,
    householdLabel: r.householdLabel as string,
    householdAddress: r.householdAddress as string,
    householdPincode: r.householdPincode as string,
    householdLat: r.householdLat as number,
    householdLon: r.householdLon as number,
    plantName: r.plantName as string,
    plantAddress: r.plantAddress as string,
    plantLat: r.plantLat as number,
    plantLon: r.plantLon as number,
    operatorName: r.operatorName as string,
    vehicleNo: r.vehicleNo as string,
    distanceKm: r.distanceKm as number | null,
    durationMin: r.durationMin as number | null,
    routeSource: r.routeSource as string,
    status: r.status as TripStatus,
    plantOtp: r.plantOtp as string,
    receiptId: r.receiptId as string | null,
    verifiedAt: r.verifiedAt as string | null,
    flaggedReason: r.flaggedReason as string | null,
    createdAt: r.createdAt as string,
    paymentReleased: Boolean(r.paymentReleased),
    pilot: Boolean(r.pilot),
    source: r.source as string,
  };
}

export function listTrips(): Trip[] {
  const rows = getDb().prepare(`SELECT * FROM trips ORDER BY createdAt DESC`).all() as Record<string, unknown>[];
  return rows.map(rowToTrip);
}

export function getTrip(id: string): Trip | null {
  const r = getDb().prepare(`SELECT * FROM trips WHERE id=?`).get(id) as Record<string, unknown> | undefined;
  return r ? rowToTrip(r) : null;
}

export function createTrip(t: Trip): Trip {
  getDb().prepare(`INSERT INTO trips (id,householdLabel,householdAddress,householdPincode,householdLat,householdLon,plantName,plantAddress,plantLat,plantLon,operatorName,vehicleNo,distanceKm,durationMin,routeSource,status,plantOtp,receiptId,verifiedAt,flaggedReason,createdAt,paymentReleased,pilot,source) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(t.id, t.householdLabel, t.householdAddress, t.householdPincode, t.householdLat, t.householdLon, t.plantName, t.plantAddress, t.plantLat, t.plantLon, t.operatorName, t.vehicleNo, t.distanceKm, t.durationMin, t.routeSource, t.status, t.plantOtp, t.receiptId, t.verifiedAt, t.flaggedReason, t.createdAt, t.paymentReleased ? 1 : 0, t.pilot ? 1 : 0, t.source);
  return t;
}

export function updateTripStatus(id: string, status: TripStatus, extra: Partial<Trip> = {}): Trip | null {
  const trip = getTrip(id);
  if (!trip) return null;
  const merged = { ...trip, ...extra, status };
  getDb().prepare(`UPDATE trips SET status=?, receiptId=?, verifiedAt=?, flaggedReason=?, paymentReleased=? WHERE id=?`)
    .run(merged.status, merged.receiptId, merged.verifiedAt, merged.flaggedReason, merged.paymentReleased ? 1 : 0, id);
  return getTrip(id);
}

export function nextTripId(): string {
  const rows = getDb().prepare(`SELECT id FROM trips ORDER BY id DESC LIMIT 1`).all() as { id: string }[];
  if (!rows.length) return "ST-1001";
  const n = parseInt(rows[0].id.replace("ST-", ""), 10);
  return `ST-${(Number.isNaN(n) ? 1000 : n) + 1}`;
}

export function getStats() {
  const trips = listTrips();
  const total = trips.length;
  const verified = trips.filter((t) => t.status === "VERIFIED").length;
  const flagged = trips.filter((t) => t.status === "FLAGGED").length;
  const inFlight = trips.filter((t) => ["BOOKED", "EN_ROUTE", "AT_PLANT"].includes(t.status)).length;
  const pctSafe = total === 0 ? 0 : Math.round((verified / Math.max(1, verified + flagged)) * 100);
  const pctSafeOfAll = total === 0 ? 0 : Math.round((verified / total) * 100);
  const hotspots = trips.filter((t) => t.status === "FLAGGED");
  const avgKm = trips.filter((t) => t.distanceKm != null).reduce((s, t) => s + (t.distanceKm ?? 0), 0) / Math.max(1, trips.filter((t) => t.distanceKm != null).length);
  return { total, verified, flagged, inFlight, pctSafe, pctSafeOfAll, avgKm: Math.round(avgKm * 10) / 10, hotspots };
}
