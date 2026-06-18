import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Workflow Operacional — Segurança Eletrônica",
  description:
    "Esteira de produção (Kanban) integrando Comercial, Compras, Almoxarifado, Monitoramento, Técnica e Faturamento.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
