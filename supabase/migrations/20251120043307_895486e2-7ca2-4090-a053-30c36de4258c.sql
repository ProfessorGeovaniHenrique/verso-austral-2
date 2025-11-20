-- FASE 1: Limpeza Crítica de Dados Corrompidos e Jobs Travados
-- Migration: cleanup_corrupted_dictionary_data

-- 1️⃣ Cancelar jobs travados identificados
UPDATE dictionary_import_jobs
SET 
  status = 'cancelado',
  cancelled_at = now(),
  cancelled_by = '00000000-0000-0000-0000-000000000000'::uuid,
  cancellation_reason = 'Job travado - cancelado automaticamente durante refatoração do sistema',
  tempo_fim = now(),
  erro_mensagem = 'Job cancelado: sem progresso detectado por >24h'
WHERE 
  id IN (
    '6ada6f72-920e-4b3e-8bc2-f49338924089', -- Gutenberg travado
    'b573b2f8-f41e-4b43-9d63-17dda68c8eb5', -- UNESP iniciado sem progresso
    '54e4e8c0-7a25-4ba7-9a2e-3c6c46767d52'  -- UNESP iniciado sem progresso
  )
  AND status IN ('iniciado', 'processando');

-- 2️⃣ Deletar jobs antigos (>7 dias) que já foram concluídos/cancelados/erro
DELETE FROM dictionary_import_jobs
WHERE 
  criado_em < now() - interval '7 days'
  AND status IN ('concluido', 'erro', 'cancelado');

-- 3️⃣ Deletar verbetes Houaiss antigos (sistema agora usa Rocha Pombo)
DELETE FROM lexical_synonyms
WHERE fonte = 'houaiss';

-- 4️⃣ Limpar jobs de recovery antigos (>30 dias)
DELETE FROM dictionary_job_recovery_log
WHERE created_at < now() - interval '30 days';

-- 5️⃣ Criar índice para otimizar queries de jobs ativos
CREATE INDEX IF NOT EXISTS idx_dictionary_jobs_active 
ON dictionary_import_jobs(status, atualizado_em)
WHERE status IN ('iniciado', 'processando', 'pendente');

-- 6️⃣ Criar índice para otimizar queries por tipo de dicionário
CREATE INDEX IF NOT EXISTS idx_dictionary_jobs_tipo 
ON dictionary_import_jobs(tipo_dicionario, status);

-- 7️⃣ Limpar health checks expirados
DELETE FROM lexicon_health_status
WHERE expires_at < now();

COMMENT ON INDEX idx_dictionary_jobs_active IS 'Optimiza queries para jobs ativos no sistema';
COMMENT ON INDEX idx_dictionary_jobs_tipo IS 'Optimiza queries por tipo de dicionário';