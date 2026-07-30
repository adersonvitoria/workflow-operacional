-- Compras: esteira de origem do card (MANUTENCAO ou IMPLANTACAO) — define a
-- volta ao concluir a Entrega (Agendamento ou Monitoramento).
ALTER TABLE "Card" ADD COLUMN "origemCompras" TEXT;
