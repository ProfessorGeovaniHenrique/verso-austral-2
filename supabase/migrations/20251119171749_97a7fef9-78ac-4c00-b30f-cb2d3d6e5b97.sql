-- ============================================
-- FASE 3 - BLOCO 1: Infraestrutura de Cancelamento
-- ============================================

-- Adicionar campos para tracking de cancelamento
ALTER TABLE dictionary_import_jobs 
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_cancelling BOOLEAN DEFAULT FALSE;

-- Criar índice para otimizar queries de jobs canceláveis
CREATE INDEX IF NOT EXISTS idx_jobs_cancellable 
  ON dictionary_import_jobs(status, is_cancelling) 
  WHERE status IN ('iniciado', 'processando', 'pendente');

-- Adicionar comentários para documentação
COMMENT ON COLUMN dictionary_import_jobs.cancelled_at IS 'Timestamp do cancelamento do job';
COMMENT ON COLUMN dictionary_import_jobs.cancelled_by IS 'ID do usuário que cancelou o job';
COMMENT ON COLUMN dictionary_import_jobs.cancellation_reason IS 'Motivo fornecido pelo usuário para o cancelamento';
COMMENT ON COLUMN dictionary_import_jobs.is_cancelling IS 'Flag sinalizando que o job está em processo de cancelamento';

-- Atualizar RLS policy para permitir cancelamento
CREATE POLICY "Users can cancel jobs"
  ON dictionary_import_jobs
  FOR UPDATE
  USING (
    is_cancelling = false AND 
    status IN ('iniciado', 'processando', 'pendente')
  )
  WITH CHECK (
    is_cancelling = true
  );