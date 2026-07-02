-- Manutenção: a coluna "Execução" foi renomeada para "Agendamento".
-- Move os cards existentes que estavam em EXECUCAO para AGENDAMENTO.
UPDATE "Card" SET "etapa" = 'AGENDAMENTO' WHERE "etapa" = 'EXECUCAO' AND "fluxo" = 'MANUTENCAO';
