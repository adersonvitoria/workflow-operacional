-- Esteira de Compras: novo fluxo + itens do orçamento no card
ALTER TYPE "Fluxo" ADD VALUE IF NOT EXISTS 'COMPRAS';

ALTER TABLE "Card" ADD COLUMN "itensCompra" JSONB NOT NULL DEFAULT '[]';
