import Link from "next/link";
import { notFound } from "next/navigation";
import { getTrip } from "../../../lib/db";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" });
}

export default function Certificate({ params }: { params: { id: string } }) {
  const trip = getTrip(params.id);
  if (!trip) notFound();
  const verified = trip.status === "VERIFIED" && Boolean(trip.receiptId);

  return (
    <main className="cert-page">
      <div className="cert-actions no-print">
        <Link href="/">← Back to the console</Link>
        {verified && <PrintButton />}
      </div>

      {!verified ? (
        <section className="sheet withheld">
          <p className="cert-kicker">Safai Trace · disposal certificate</p>
          <h1>Certificate withheld</h1>
          <p className="cert-lead">
            Trip {trip.id} has no verified plant receipt. A disposal certificate is only issued when the plant OTP matches
            and a weighbridge receipt is recorded. Printing this page would create a false proof of safe disposal.
          </p>
          <dl className="cert-grid">
            <div><dt>Status</dt><dd className="bad">{trip.status}</dd></div>
            <div><dt>Plant</dt><dd>{trip.plantName}</dd></div>
            <div><dt>Receipt</dt><dd>{trip.receiptId || "none on file"}</dd></div>
            <div><dt>Payment</dt><dd>{trip.paymentReleased ? "released" : "held"}</dd></div>
          </dl>
          <p className="cert-note">
            {trip.flaggedReason || "The trip has not completed plant verification. No certificate can be issued."}
          </p>
        </section>
      ) : (
        <section className="sheet">
          <div className="cert-watermark" aria-hidden="true">PILOT</div>
          <header className="cert-head">
            <div>
              <p className="cert-kicker">Safai Trace · faecal sludge chain of custody</p>
              <h1>Disposal certificate</h1>
              <p className="cert-sub">Proof that this tanker load reached a treatment plant and was recorded at the gate.</p>
            </div>
            <div className="cert-seal">
              <span className="seal-word">VERIFIED</span>
              <span className="seal-small">plant OTP + receipt</span>
            </div>
          </header>

          <div className="cert-id">
            <span className="cert-id-label">Trip</span>
            <strong>{trip.id}</strong>
            <span className={`cert-pill ${trip.status}`}>{trip.status}</span>
          </div>

          <dl className="cert-grid">
            <div><dt>Household</dt><dd>{trip.householdAddress}</dd></div>
            <div><dt>Pincode</dt><dd>{trip.householdPincode || "not recorded"}</dd></div>
            <div><dt>Treatment plant</dt><dd>{trip.plantName}<br /><span className="dim">{trip.plantAddress}</span></dd></div>
            <div><dt>Plant coordinates</dt><dd>{trip.plantLat.toFixed(5)}, {trip.plantLon.toFixed(5)} <span className="dim">(from the booking record)</span></dd></div>
            <div><dt>Operator / vehicle</dt><dd>{trip.operatorName}<br /><span className="dim">{trip.vehicleNo}</span></dd></div>
            <div><dt>Road distance</dt><dd>{trip.distanceKm != null ? `${trip.distanceKm} km · ${trip.durationMin} min` : "not recorded"} <span className="dim">(OSRM live at booking)</span></dd></div>
            <div><dt>Plant OTP verified</dt><dd>{fmt(trip.verifiedAt)}</dd></div>
            <div><dt>Weighbridge receipt</dt><dd>{trip.receiptId}</dd></div>
            <div><dt>Booked at</dt><dd>{fmt(trip.createdAt)}</dd></div>
            <div><dt>Payment</dt><dd>{trip.paymentReleased ? "Released on verification" : "Held"}</dd></div>
          </dl>

          <div className="cert-chain">
            <h2>Chain of custody</h2>
            <ol>
              <li><span>01</span><strong>Booked</strong><em>{fmt(trip.createdAt)}</em></li>
              <li><span>02</span><strong>En route</strong><em>operator advanced</em></li>
              <li><span>03</span><strong>At plant</strong><em>gate arrival</em></li>
              <li><span>04</span><strong>Verified</strong><em>{fmt(trip.verifiedAt)}</em></li>
            </ol>
          </div>

          <div className="cert-sign">
            <div><span>Plant weighbridge operator</span><i /></div>
            <div><span>ULB sanitation officer</span><i /></div>
          </div>

          <footer className="cert-foot">
            <p><strong>Pilot record.</strong> This is not a statutory certificate. It records a pilot trip on Safai Trace and the evidence held at the time of printing. Plant identity comes from OpenStreetMap; distance from OSRM; verification from the plant OTP + receipt entered at the gate.</p>
            <p>Printed {new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })} · safai-trace.vercel.app/certificate/{trip.id}</p>
          </footer>
        </section>
      )}
    </main>
  );
}
