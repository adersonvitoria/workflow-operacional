"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Perfil } from "@/lib/perfis";

const STORAGE_USERS = "workflow-operacional:usuarios:v1";
const STORAGE_SESSAO = "workflow-operacional:sessao:v1";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
}

export interface NovoUsuario {
  nome: string;
  email: string;
  perfil: Perfil;
  ativo?: boolean;
}

const SEED_USUARIOS: Usuario[] = [
  { id: "u-coord", nome: "Carla Coordenação", email: "coordenacao@empresa.com", perfil: "COORDENADOR", ativo: true },
  { id: "u-com", nome: "Daniela Zimiani", email: "comercial@empresa.com", perfil: "COMERCIAL", ativo: true },
  { id: "u-alm", nome: "Murilo Souza", email: "almoxarifado@empresa.com", perfil: "ALMOXARIFADO", ativo: true },
  { id: "u-mon", nome: "Felipe Saldanha", email: "monitoramento@empresa.com", perfil: "SUPERVISOR_MONITORAMENTO", ativo: true },
  { id: "u-tec", nome: "Jessi Diemes", email: "tecnica@empresa.com", perfil: "SUPERVISOR_TECNICO", ativo: true },
  { id: "u-adm", nome: "Samya Cruz", email: "admin@empresa.com", perfil: "ADMINISTRATIVO", ativo: true },
];

interface AuthContextValue {
  carregado: boolean;
  atual: Usuario | null;
  usuarios: Usuario[];
  entrar: (email: string) => { ok: boolean; motivo?: string };
  entrarComoPerfil: (perfil: Perfil) => void;
  sair: () => void;
  criarUsuario: (u: NovoUsuario) => void;
  atualizarUsuario: (id: string, patch: Partial<Usuario>) => void;
  removerUsuario: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>(SEED_USUARIOS);
  const [atualId, setAtualId] = useState<string | null>(null);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    try {
      const u = window.localStorage.getItem(STORAGE_USERS);
      if (u) setUsuarios(JSON.parse(u) as Usuario[]);
      const s = window.localStorage.getItem(STORAGE_SESSAO);
      if (s) setAtualId(s);
    } catch {
      /* ignore */
    }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    window.localStorage.setItem(STORAGE_USERS, JSON.stringify(usuarios));
  }, [usuarios, carregado]);

  useEffect(() => {
    if (!carregado) return;
    if (atualId) window.localStorage.setItem(STORAGE_SESSAO, atualId);
    else window.localStorage.removeItem(STORAGE_SESSAO);
  }, [atualId, carregado]);

  const atual = useMemo(() => usuarios.find((u) => u.id === atualId) ?? null, [usuarios, atualId]);

  const entrar = useCallback((email: string) => {
    const u = usuarios.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) return { ok: false, motivo: "E-mail não encontrado." };
    if (!u.ativo) return { ok: false, motivo: "Usuário inativo." };
    setAtualId(u.id);
    return { ok: true };
  }, [usuarios]);

  const entrarComoPerfil = useCallback((perfil: Perfil) => {
    const u = usuarios.find((x) => x.perfil === perfil && x.ativo);
    if (u) setAtualId(u.id);
  }, [usuarios]);

  const sair = useCallback(() => setAtualId(null), []);

  const criarUsuario = useCallback((u: NovoUsuario) => {
    const id = `u-${u.email.replace(/[^a-z0-9]/gi, "").slice(0, 10)}-${Math.abs(hash(u.email))}`;
    setUsuarios((prev) => [{ id, nome: u.nome, email: u.email, perfil: u.perfil, ativo: u.ativo ?? true }, ...prev]);
  }, []);

  const atualizarUsuario = useCallback((id: string, patch: Partial<Usuario>) => {
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  const removerUsuario = useCallback((id: string) => {
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
    setAtualId((cur) => (cur === id ? null : cur));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ carregado, atual, usuarios, entrar, entrarComoPerfil, sair, criarUsuario, atualizarUsuario, removerUsuario }),
    [carregado, atual, usuarios, entrar, entrarComoPerfil, sair, criarUsuario, atualizarUsuario, removerUsuario],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
