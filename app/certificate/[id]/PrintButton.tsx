"use client";

export default function PrintButton() {
  return (
    <button className="cert-print no-print" onClick={() => window.print()} type="button">
      Print / save as PDF
    </button>
  );
}
