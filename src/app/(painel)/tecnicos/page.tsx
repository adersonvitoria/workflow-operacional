import { TecnicosView } from "@/components/views/TecnicosView";

export default function TecnicosPage() {
  return (
    <TecnicosView
      tipo="TECNICO"
      titulo="Cadastro de técnicos"
      subtitulo="Técnicos disponíveis para vincular aos cards (não acessam a plataforma)."
      rotuloSingular="técnico"
    />
  );
}
