"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Tema = "light" | "dark";
const STORAGE_KEY = "workflow-operacional:tema";

interface ThemeContextValue {
  tema: Tema;
  alternar: () => void;
  definir: (t: Tema) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<Tema>("light");

  useEffect(() => {
    let inicial: Tema = "light";
    try {
      const salvo = window.localStorage.getItem(STORAGE_KEY) as Tema | null;
      if (salvo === "light" || salvo === "dark") inicial = salvo;
      else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) inicial = "dark";
    } catch {
      /* ignore */
    }
    aplicar(inicial);
    setTema(inicial);
  }, []);

  function aplicar(t: Tema) {
    const root = document.documentElement;
    root.classList.toggle("dark", t === "dark");
  }

  function definir(t: Tema) {
    aplicar(t);
    setTema(t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }

  function alternar() {
    definir(tema === "dark" ? "light" : "dark");
  }

  return (
    <ThemeContext.Provider value={{ tema, alternar, definir }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve ser usado dentro de <ThemeProvider>");
  return ctx;
}
