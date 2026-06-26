import { TecnicosView } from "@/components/views/TecnicosView";

export default function PrestadoresPage() {
  return (
    <TecnicosView
      tipo="TERCEIRO"
      titulo="Prestadores de serviços"
      subtitulo="Terceiros disponíveis para vincular aos cards como técnico/auxiliar."
      rotuloSingular="prestador"
    />
  );
}
