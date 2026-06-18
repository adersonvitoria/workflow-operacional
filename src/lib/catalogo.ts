/**
 * Seed do catálogo de itens (segurança eletrônica). Em runtime o catálogo é
 * gerenciável pelo Comercial via /itens (tabela Item no banco); esta lista
 * apenas popula o banco no primeiro seed.
 */
export interface ItemCatalogoSeed {
  descricao: string;
  unidade: string;
  preco: number;
}

export const CATALOGO_SEED: ItemCatalogoSeed[] = [
  { descricao: "CENTRAL DE ALARME VIA WEB 16z", unidade: "un", preco: 480 },
  { descricao: "TECLADO LCD", unidade: "un", preco: 220 },
  { descricao: "SENSOR INFRAVERMELHO (IVP)", unidade: "un", preco: 60 },
  { descricao: "SENSOR MAGNÉTICO", unidade: "un", preco: 25 },
  { descricao: "SENSOR DE QUEBRA DE VIDRO", unidade: "un", preco: 90 },
  { descricao: "SIRENE 12V", unidade: "un", preco: 45 },
  { descricao: "FONTE 12V 3A", unidade: "un", preco: 70 },
  { descricao: "BATERIA 12V 7Ah", unidade: "un", preco: 80 },
  { descricao: "MÓDULO GPRS", unidade: "un", preco: 260 },
  { descricao: "CONTROLE REMOTO", unidade: "un", preco: 35 },
  { descricao: "CÂMERA DOME HD", unidade: "un", preco: 130 },
  { descricao: "CÂMERA BULLET HD", unidade: "un", preco: 150 },
  { descricao: "DVR 4 CANAIS", unidade: "un", preco: 350 },
  { descricao: "DVR 8 CANAIS", unidade: "un", preco: 600 },
  { descricao: "DVR 16 CANAIS", unidade: "un", preco: 1100 },
  { descricao: "HD 1TB (CFTV)", unidade: "un", preco: 320 },
  { descricao: "CABO UTP CAT5 (metro)", unidade: "m", preco: 2.5 },
  { descricao: "CABO MANGA (metro)", unidade: "m", preco: 3.5 },
  { descricao: "CAIXA VBOX", unidade: "un", preco: 40 },
  { descricao: "FECHADURA ELETROÍMÃ", unidade: "un", preco: 280 },
  { descricao: "LEITOR FACIAL", unidade: "un", preco: 900 },
  { descricao: "BOTÃO DE PÂNICO", unidade: "un", preco: 55 },
  { descricao: "NOBREAK", unidade: "un", preco: 450 },
  { descricao: "CHIP GPRS", unidade: "un", preco: 30 },
];
