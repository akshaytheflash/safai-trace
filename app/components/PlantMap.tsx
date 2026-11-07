"use client";

import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import type { Plant } from "@/lib/plants";

export type MapTrip = {
  id: string;
  status: string;
  householdLabel: string;
  householdAddress: string;
  householdLat: number;
  householdLon: number;
  plantName: string;
  plantAddress: string;
  plantLat: number;
  plantLon: number;
  routeGeometry: string | null;
  distanceKm: number | null;
};

type Props = {
  plants: Plant[];
  trip: MapTrip | null;
  selectedPlantId?: string | null;
  onSelectPlant?: (plant: Plant) => void;
};

const STATUS_COLOR: Record<string, string> = {
  BOOKED: "#C9C6BE",
  EN_ROUTE: "#F2C230",
  AT_PLANT: "#F2C230",
  VERIFIED: "#2C6E63",
  FLAGGED: "#C44536",
};

function displayName(p: Plant) {
  if (!p.name) return "Unnamed wastewater plant";
  if (/^\d+(\.\d+)?\s*MGD$/i.test(p.name)) return `Unnamed plant · ${p.name}`;
  return p.name;
}

export default function PlantMap({ plants, trip, selectedPlantId, onSelectPlant }: Props) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const plantLayerRef = useRef<LayerGroup | null>(null);
  const tripLayerRef = useRef<LayerGroup | null>(null);
  const focusRef = useRef<string>("");
  const [ready, setReady] = useState(false);
  const [tileError, setTileError] = useState(false);
  const tileErrorsRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !elRef.current || mapRef.current) return;
      const map = L.map(elRef.current, {
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: true,
        minZoom: 9,
        maxZoom: 18,
      }).setView([28.63, 77.21], 11);

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        className: "map-tiles-dark",
      })
        .on("tileerror", () => {
          tileErrorsRef.current += 1;
          if (tileErrorsRef.current >= 6) setTileError(true);
        })
        .addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.control.scale({ position: "bottomleft", imperial: false }).addTo(map);

      plantLayerRef.current = L.layerGroup().addTo(map);
      tripLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      plantLayerRef.current = null;
      tripLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const el = elRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled) return;
      const map = mapRef.current;
      const layer = plantLayerRef.current;
      if (!map || !layer) return;
      layer.clearLayers();

      for (const p of plants) {
        const selected = p.id === selectedPlantId;
        const marker = L.circleMarker([p.lat, p.lon], {
          radius: selected ? 7 : 3.4,
          color: selected ? "#2C6E63" : "#F2C230",
          weight: selected ? 2 : 1,
          fillColor: selected ? "#2C6E63" : "#F2C230",
          fillOpacity: selected ? 0.95 : 0.42,
        });
        const operator = p.operator ? `<br/><span>${escapeHtml(p.operator)}</span>` : "";
        marker.bindPopup(
          `<div class="map-pop"><strong>${escapeHtml(displayName(p))}</strong>${operator}<br/><span>OSM ${escapeHtml(p.id)}</span><br/><a href="${p.osmUrl}" target="_blank" rel="noreferrer">Open on OSM</a></div>`,
          { closeButton: false },
        );
        marker.on("click", () => onSelectPlant?.(p));
        marker.addTo(layer);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plants, selectedPlantId, onSelectPlant, ready]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled) return;
      const map = mapRef.current;
      const layer = tripLayerRef.current;
      if (!map || !layer) return;
      layer.clearLayers();
      if (!trip) return;

      const color = STATUS_COLOR[trip.status] || "#F2C230";
      const flagged = trip.status === "FLAGGED";

      let geometry: [number, number][] = [];
      if (trip.routeGeometry) {
        try {
          const parsed = JSON.parse(trip.routeGeometry);
          if (Array.isArray(parsed)) geometry = parsed;
        } catch {
          geometry = [];
        }
      }

      if (geometry.length > 1) {
        L.polyline(geometry, { color, weight: 3.5, opacity: 0.9, lineJoin: "round" }).addTo(layer);
      } else {
        L.polyline(
          [
            [trip.householdLat, trip.householdLon],
            [trip.plantLat, trip.plantLon],
          ],
          { color, weight: 2, opacity: 0.75, dashArray: "5 7" },
        )
          .bindTooltip("Straight line between endpoints — road geometry was not stored for this seeded pilot row.", {
            sticky: true,
            className: "map-tip",
          })
          .addTo(layer);
      }

      const pickup = L.circleMarker([trip.householdLat, trip.householdLon], {
        radius: 6,
        color: flagged ? "#C44536" : "#C9C6BE",
        weight: 2,
        fillColor: flagged ? "#C44536" : "#C9C6BE",
        fillOpacity: 1,
      })
        .bindTooltip("PICKUP", { permanent: true, direction: "top", className: "map-label" })
        .addTo(layer);
      pickup.on("click", () => map.openPopup(`<div class="map-pop"><strong>${escapeHtml(trip.householdLabel)}</strong><br/>${escapeHtml(trip.householdAddress)}</div>`, [trip.householdLat, trip.householdLon]));

      L.circleMarker([trip.plantLat, trip.plantLon], {
        radius: 8,
        color: "#2C6E63",
        weight: 3,
        fillColor: "#2C6E63",
        fillOpacity: 0.85,
      })
        .bindTooltip("PLANT", { permanent: true, direction: "right", className: "map-label" })
        .bindPopup(`<div class="map-pop"><strong>${escapeHtml(trip.plantName)}</strong><br/>${escapeHtml(trip.plantAddress)}</div>`)
        .addTo(layer);

      const key = `${trip.id}:${geometry.length > 1 ? "route" : "endpoints"}`;
      if (focusRef.current !== key) {
        focusRef.current = key;
        map.fitBounds(
          L.latLngBounds([
            [trip.householdLat, trip.householdLon],
            [trip.plantLat, trip.plantLon],
          ]).pad(0.35),
          { maxZoom: 13, animate: true, duration: 0.6 },
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trip, ready]);

  return (
    <div className="map-shell">
      <div ref={elRef} className="map-canvas" role="application" aria-label="Map of wastewater treatment plants and the selected trip" />
      {tileError && (
        <div className="map-tile-error">
          Basemap tiles did not load. Plant coordinates and the trip line are still real OSM/OSRM data.
        </div>
      )}
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
