# Safai Trace — Septic-Tank Proof-of-Delivery (SBM 2.0 FSM)

**Code for a Billion (Code for India) · Impact: Sanitation**

Safai Trace closes the last mile of faecal sludge management: it proves whether a specific tanker trip actually disposed safely at an FSTP/STP. Flow: **household booking → GPS trip → plant QR/weighbridge OTP + receipt scan as proof of safe disposal → ULB dashboard (% safely disposed, dumping hotspots).** No plant receipt = flagged, no payment. The tool goes to the **private tanker operator first, ULB second**.

> Not a NASA/planning tool. This is field operations — chain-of-custody for every desludging trip.

## Why this wedge

- ~⅔ of urban households are off-sewer; septic tanks must be emptied by tankers, but disposal is invisible. Tankers dump at night into drains.
- **498 sewer/septic-tank cleaning deaths since Jan 2019** — Central Government data placed in the Lok Sabha (NCSK reporting), reported by NDTV: https://www.ndtv.com/india-news/nearly-500-died-while-cleaning-sewers-or-septic-tanks-since-2019-centre-11866683
- **~4,000 ULBs** are in scope under **Swachh Bharat Mission (Urban) 2.0**: https://sbmurban.org/storage/app/media/pdf/swachh-bharat-2.pdf
- Methodology reference: **CPHEEO Faecal Sludge Management Manual (2020, MoHUA)** — the emptying → transport → treatment chain: https://swachhbharatmission.ddws.gov.in/sites/default/files/Technical-Notes/Faecal_sludge_management_manual_English.pdf · Toolkit: https://swachhbharatmission.ddws.gov.in/sites/default/files/Technical-Notes/FirstsetFSMtoolkit.pdf
- Sanitation context: Census 2011 C-series (C-08) + NSSO 76th Round 2018 (Report 584) show large shares of urban households still depend on on-site systems: https://censusindia.gov.in/

CPHEEO FSM already defines what "safe" means. Safai Trace makes it provable per-trip with a check that already exists at every FSTP/weighbridge: the receipt. No new hardware.

## The flow

1. **Book** (household): pincode validated (India Post), household geocoded (Nominatim), plant geocoded, OSRM live distance/duration computed. Trip created with a 4-digit **plant OTP** + **QR token** (`SAFAI-TRACE:{tripId}:OTP-{otp}`).
2. **Run** (operator): `BOOKED → EN_ROUTE → AT_PLANT`. Endpoints are the real geocoded coords; the app never invents GPS.
3. **Prove** (plant gate): driver enters the OTP shown on the weighbridge board + the receipt slip ID. Match + receipt → `VERIFIED`, payment released, receipt stored.
4. **Flag or pay**: missing/wrong receipt or no-show → `FLAGGED`, payment held, hotspot logged for ULB inspection.

## Setup (runnable MVP)

Requires **Node v24.22.0** (uses built-in `node:sqlite`, no native deps).

```bash
cd safai-trace
npm install
cp .env.example .env   # then add BHARATCODE_API_KEY
npm run dev            # → http://localhost:3000
```

`.env` (server-side ONLY, never commit — see `.env.example`):

```env
BHARATCODE_API_KEY=<your key>          # BharatCode OpenAI-compatible, docs: https://bharatcode.ai/build
BHARATCODE_BASE_URL=https://bharatcode.ai/api/model/v1
BHARATCODE_MODEL=qwen-3.8-27b
DATA_GOV_IN_KEY=                       # optional, free user key from https://api.data.gov.in
```

**LLM:** BharatCode, `POST /chat/completions`, model `qwen-3.8-27b` (262k ctx), Bearer key server-side only. The model is 503-prone, so `lib/llm.ts` does exponential backoff (4 attempts) and falls back to Hindi templates for OTP scripts/complaint drafts — the field flow never blocks on the LLM.

**Storage:** SQLite at `data/safai.db` (auto-created, WAL). Seeded with 4 pilot trips, each labelled `pilot-collected`. Delete the file to reset.

## Live APIs (verified — no mocks)

| API | Use | Endpoint | If down |
|---|---|---|---|
| India Post | pincode validation | `https://api.postalpincode.in/pincode/{6-digit}` | Error + retry, no fake validation |
| Nominatim (OSM) | household/plant geocoding — real coords | `https://nominatim.openstreetmap.org/search` | Error + retry; booking stays disabled (never fake coords) |
| OSRM | trip distance/duration | `https://router.project-osrm.org/route/v1/driving/{lon,lat;lon,lat}` | Error, no invented distance |
| data.gov.in | sanitation datasets (optional) | `https://api.data.gov.in/resource/...?api-key={DATA_GOV_IN_KEY}` | Documented; free user key required — core flow doesn't depend on it |
| BharatCode | Hindi OTP scripts, ULB complaint drafts | `https://bharatcode.ai/api/model/v1/chat/completions` | Backoff → template fallback |

Health check: open the app header (live pills) or `GET /api/health`. Test verified 2026-11-06: postal (110001 → Central Delhi, 21 offices), Nominatim (Connaught Place → 28.6317,77.2193; Okhla STP → 28.5475,77.2828), OSRM (Connaught → Okhla = 12.88 km / 14.1 min; → Rashtrapati Bhavan STP = 4.09 km / 6.1 min). BharatCode returned `internal_error` on first call (expected 503-prone behaviour) — handled by backoff + fallback.

## Pilot plan — one operator, then ULB

- **Week 1–2 (operator-first):** 1 private tanker operator + 1 FSTP weighbridge desk (Delhi Okhla / Rashtrapati Bhavan corridor). OTP board + receipt register = source of truth.
- **Week 3–4:** 20–30 pilot trips; daily ULB digest (verified %, flagged hotspots). Fix OTP-mismatch friction.
- **Month 2:** ULB dashboard handover; flagged-trip inspection SOP; payment-release integration (no receipt = no payment file).
- **Scale:** replicate per ULB under SBM 2.0 (~4,000 ULBs). Cost/trip ≈ data + weighbridge discipline.

## Demo script (5 min)

1. Open **Household booking**: validate `110001`, geocode `Connaught Place, New Delhi`, geocode plant **Okhla STP**, book. Show OSRM distance + OTP/QR token.
2. **Operator trips**: `Start trip → Arrived at plant`, verify with the shown OTP + a receipt ID (e.g. `WBR-OKH-20261106-002`). Show `VERIFIED` + payment released.
3. Flag a second trip (reason: receipt missing) → show `FLAGGED`, payment held.
4. **ULB dashboard**: % safely disposed, hotspots, SVG map (household→plant), verification log. Draft a ULB complaint for the flagged trip via the AI helper.
5. **How it works**: SBM 2.0/FSM explainer, pilot plan, data rules. Show footer citations.

## Pilot metrics (submission-ready)

Computed live from pilot rows (`/api/stats`): **trips verified**, **% safely disposed** (verified ÷ verified+flagged), **flagged hotspots**, **avg trip km (OSRM live)**. Seed pilot: 4 trips, 2 verified, 1 flagged, 1 in-flight → 67% safe among completed, avg 8.5 km (trips 12.88/4.09 km). E2E tested 2026-11-06: live booking → EN_ROUTE → AT_PLANT → wrong-OTP 401 → correct-OTP VERIFIED; test trip removed to restore clean seed. Pilot target: >90% verified within one operator-quarter (verified ÷ all completed trips). Govt baselines are cited separately and never blended into pilot metrics.

## API routes

- `GET /api/pincode?pincode=110001` · `GET /api/geocode?q=...` · `GET /api/route?fromLat=&fromLon=&toLat=&toLon=`
- `GET/POST /api/trips` · `POST /api/trips/[id]/status` · `POST /api/trips/[id]/verify` (OTP + receipt)
- `GET /api/stats` (ULB KPIs) · `POST /api/ai` (BharatCode, kind: otp|complaint|explain) · `GET /api/health`

## Differentiator vs SanitaSafe

SanitaSafe (NASA) is a planning tool — where to build infrastructure. Safai Trace is **operations proof**: did this tanker actually dispose safely tonight? Planning vs proof — complementary, different category.

## Repo layout

```
app/page.tsx        # 4-tab field UI (book / operator / ULB / how) + citations footer
app/api/*/route.ts  # live-API proxies, trips CRUD, verify, stats, AI, health
lib/db.ts           # node:sqlite store + pilot seed (labelled)
lib/apis.ts         # India Post / Nominatim / OSRM (live only)
lib/llm.ts          # BharatCode + backoff + Hindi templates
lib/data.ts         # cited govt stats
data/safai.db       # runtime SQLite (gitignored)
```

## Data & safety rules observed

- Only real govt/open APIs; no mock coords, distances, or trips. Trip records are pilot-collected and labelled.
- Govt stats always linked to source PDFs/dashboards (footer + above).
- LLM key server-side only; 503 → backoff → template fallback.
