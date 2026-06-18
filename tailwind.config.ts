import type { Config } from "tailwindcss";

/**
 * Paleta corporativa — Tecnologia em Segurança Eletrônica.
 * Foco inicial em Light mode de alto contraste; Dark mode habilitado via classe.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Identidade: azul marinho (segurança) + cobalto (ação)
        brand: {
          navy: "#0f172a", // slate-900 — sidebar, cabeçalhos
          DEFAULT: "#2563eb", // blue-600 — botões primários
          600: "#2563eb",
          700: "#1d4ed8",
        },
        // Superfícies
        surface: {
          app: "#f9fafb", // gray-50 — fundo da tela
          board: "#f1f5f9", // slate-100 — fundo das colunas
          card: "#ffffff", // white — cards e quadros
        },
        // Status / feedback (tags dos cards)
        status: {
          ok: "#64748b", // slate-500   — no prazo
          aguardando: "#f59e0b", // amber-500 — aguardando cliente/compras
          concluido: "#10b981", // emerald-500 — concluído/medição
          travado: "#f43f5e", // rose-500   — problema/travado
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "Roboto",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "0.75rem", // 12px — cantos dos cards
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.06), 0 1px 1px 0 rgb(15 23 42 / 0.04)",
        "card-drag": "0 12px 24px -6px rgb(15 23 42 / 0.18)",
        slideover: "-8px 0 24px -8px rgb(15 23 42 / 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
