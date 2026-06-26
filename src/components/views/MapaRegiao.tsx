"use client";

/**
 * Mapa de geolocalização com um ponto (marcador vermelho do Google Maps) na
 * região informada. Usa o embed padrão do Google Maps (sem chave). Caso haja um
 * componente de mapa próprio, basta trocar a implementação aqui.
 */
export function MapaRegiao({ regiao }: { regiao?: string }) {
  const r = regiao?.trim();
  if (!r) {
    return (
      <div className="grid h-56 place-items-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-700">
        Região não informada
      </div>
    );
  }
  const q = encodeURIComponent(`${r}, Rio Grande do Sul, Brasil`);
  return (
    <iframe
      title={`Mapa: ${r}`}
      src={`https://www.google.com/maps?q=${q}&z=12&output=embed`}
      className="h-56 w-full rounded-lg border border-slate-200 dark:border-slate-700"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
