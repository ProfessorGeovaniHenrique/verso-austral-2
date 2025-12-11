-- FASE 1: Correção imediata do job travado
-- Job bc141479-f963-400e-966a-1be7aad068c3 está há 7+ horas sem progresso

UPDATE enrichment_jobs
SET 
  status = 'pausado',
  erro_mensagem = 'Pausado automaticamente: sem atividade por 7+ horas. Auto-invocação silenciosamente falhou. Clique "Retomar" para continuar.',
  updated_at = NOW()
WHERE id = 'bc141479-f963-400e-966a-1be7aad068c3'
  AND status = 'processando';