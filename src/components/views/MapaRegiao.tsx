"use client";

import { useEffect, useState } from "react";
import { MiniMap } from "./MiniMap";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const VERMELHO = "#ef4444"; // ponto vermelho

/**
 * Mapa de geolocalização com um ponto vermelho na região do card. Usa o
 * componente de mapa (Mapbox) portado do projeto campanha-conectada; geocodifica
 * o nome da região (cidade do RS) para as coordenadas via Mapbox Geocoding.
 */
export function MapaRegiao({ regiao }: { regiao?: string }) {
  const r = regiao?.trim();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [estado, setEstado] = useState<"idle" | "carregando" | "ok" | "erro">("idle");

  useEffect(() => {
    setCoords(null);
    if (!r || !TOKEN) { setEstado("idle"); return; }
    setEstado("carregando");
    let cancel = false;
    const q = encodeURIComponent(`${r}, Rio Grande do Sul, Brasil`);
    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${TOKEN}&country=br&limit=1`)
      .then((res) => res.json())
      .then((j) => {
        if (cancel) return;
        const c = j?.features?.[0]?.center;
        if (Array.isArray(c) && c.length === 2) { setCoords({ lng: c[0], lat: c[1] }); setEstado("ok"); }
        else setEstado("erro");
      })
      .catch(() => { if (!cancel) setEstado("erro"); });
    return () => { cancel = true; };
  }, [r]);

  if (!r) return <Box>Região não informada</Box>;
  if (!TOKEN) return <Box>Mapa indisponível (defina NEXT_PUBLIC_MAPBOX_TOKEN)</Box>;
  if (estado === "carregando") return <Box>Localizando a região…</Box>;
  if (estado === "erro" || !coords) return <Box>Não foi possível localizar “{r}”.</Box>;

  return (
    <div className="h-56 w-full">
      <MiniMap lat={coords.lat} lng={coords.lng} color={VERMELHO} />
    </div>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-56 place-items-center rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-400 dark:border-slate-700">
      {children}
    </div>
  );
}
