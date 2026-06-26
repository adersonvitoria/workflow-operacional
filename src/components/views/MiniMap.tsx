"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "pk.demo";

type Props = {
  lat: number;
  lng: number;
  color: string; // cor do pin
  zoom?: number;
  pitch?: number;
};

/**
 * Mini-mapa não-interativo (sem zoom/pan/rotate). Renderiza um único pin no
 * ponto, com glow estático. Portado do projeto campanha-conectada.
 */
export function MiniMap({ lat, lng, color, zoom = 13, pitch = 30 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!TOKEN || TOKEN === "pk.demo") return;

    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [lng, lat],
      zoom,
      pitch,
      bearing: -10,
      interactive: false,
      attributionControl: false,
      antialias: true,
    });
    mapRef.current = map;

    const el = document.createElement("div");
    el.className = "mini-pin";
    el.style.setProperty("--c", color);
    el.innerHTML = `<span class="ring"></span><span class="dot"></span>`;

    map.on("load", () => {
      map.resize();
      requestAnimationFrame(() => map.resize());

      map.addSource("halo", {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: {} },
      });
      map.addLayer({
        id: "halo-glow",
        type: "circle",
        source: "halo",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 30, 18, 220],
          "circle-color": color,
          "circle-opacity": 0.15,
          "circle-blur": 1,
        },
      });

      new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
    });

    const ro = new ResizeObserver(() => { try { map.resize(); } catch {} });
    ro.observe(containerRef.current);
    const t = setTimeout(() => map.resize(), 120);

    return () => { ro.disconnect(); clearTimeout(t); map.remove(); };
  }, [lat, lng, color, zoom, pitch]);

  const tokenMissing = !TOKEN || TOKEN === "pk.demo";

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0 overflow-hidden rounded-lg" />
      {tokenMissing && (
        <div className="absolute inset-0 grid place-items-center rounded-lg bg-slate-100 text-[11px] text-slate-500 dark:bg-slate-800">
          Defina NEXT_PUBLIC_MAPBOX_TOKEN
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 rounded-lg shadow-inner ring-1 ring-black/5" />
      <style jsx global>{`
        .mini-pin { position: relative; width: 14px; height: 14px; pointer-events: none; }
        .mini-pin .dot { position: absolute; inset: 0; border-radius: 999px; background: var(--c); box-shadow: 0 0 14px var(--c), 0 0 0 3px rgba(255,255,255,0.22); }
        .mini-pin .ring { position: absolute; inset: -10px; border-radius: 999px; border: 2px solid var(--c); opacity: 0.45; }
      `}</style>
    </div>
  );
}
