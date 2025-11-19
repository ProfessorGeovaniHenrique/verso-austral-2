-- ✅ SPRINT 1: Advisory Locks + Transações Atômicas para Cancelamento de Jobs
-- Implementa pattern de lock distribuído para prevenir race conditions

-- Função atômica de cancelamento com advisory lock
CREATE OR REPLACE FUNCTION cancel_job_atomic(
  p_job_id UUID,
  p_user_id UUID,
  p_reason TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  job_status TEXT,
  forced BOOLEAN,
  message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_forced BOOLEAN := false;
  v_lock_id BIGINT;
BEGIN
  -- Gerar lock_id único baseado no job_id (hash do UUID)
  -- Advisory lock garante serialização de operações no mesmo job
  v_lock_id := ('x' || substr(md5(p_job_id::text), 1, 15))::bit(60)::bigint;
  
  -- 🔒 ADVISORY LOCK: Garante que apenas UMA transação processa este job por vez
  -- pg_advisory_xact_lock é liberado automaticamente ao fim da transação
  PERFORM pg_advisory_xact_lock(v_lock_id);
  
  -- 1️⃣ Buscar e validar job (dentro da transação)
  SELECT * INTO v_job
  FROM dictionary_import_jobs
  WHERE id = p_job_id
  FOR UPDATE; -- Lock pessimista na linha
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, false, 'Job não encontrado'::TEXT;
    RETURN;
  END IF;
  
  -- Validar se pode ser cancelado
  IF v_job.status NOT IN ('iniciado', 'processando', 'pendente') THEN
    RETURN QUERY SELECT false, v_job.status, false, 
      format('Job não pode ser cancelado (status: %s)', v_job.status)::TEXT;
    RETURN;
  END IF;
  
  -- 2️⃣ Marcar como cancelando
  UPDATE dictionary_import_jobs
  SET 
    is_cancelling = true,
    cancellation_reason = p_reason,
    cancelled_by = p_user_id,
    atualizado_em = now()
  WHERE id = p_job_id;
  
  -- 3️⃣ Aguardar edge function detectar (com timeout curto)
  -- Polling com lock mantido - até 10 segundos
  FOR i IN 1..20 LOOP
    PERFORM pg_sleep(0.5);
    
    SELECT status INTO v_job.status
    FROM dictionary_import_jobs
    WHERE id = p_job_id;
    
    IF v_job.status = 'cancelado' THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- 4️⃣ Forçar cancelamento se edge function não respondeu
  IF v_job.status != 'cancelado' THEN
    UPDATE dictionary_import_jobs
    SET 
      status = 'cancelado',
      cancelled_at = now(),
      tempo_fim = now(),
      erro_mensagem = 'Job cancelado manualmente pelo usuário'
    WHERE id = p_job_id;
    
    v_forced := true;
  END IF;
  
  -- ✅ Retornar resultado
  RETURN QUERY SELECT 
    true,
    'cancelado'::TEXT,
    v_forced,
    CASE 
      WHEN v_forced THEN 'Job cancelado com sucesso (forçado após timeout)'
      ELSE 'Job cancelado gracefully pela edge function'
    END::TEXT;
  
  -- Lock é automaticamente liberado ao fim da transação
END;
$$;

-- Adicionar índice composto para otimizar verificação de jobs canceláveis
CREATE INDEX IF NOT EXISTS idx_dict_jobs_cancellable 
  ON dictionary_import_jobs(id, status) 
  WHERE status IN ('iniciado', 'processando', 'pendente');

-- Adicionar índice para queries de cancelamento
CREATE INDEX IF NOT EXISTS idx_dict_jobs_cancelled 
  ON dictionary_import_jobs(cancelled_at DESC) 
  WHERE status = 'cancelado';

-- Comentários para documentação
COMMENT ON FUNCTION cancel_job_atomic IS 
  'Cancela job de importação de dicionário com advisory lock para prevenir race conditions. 
   Usa pg_advisory_xact_lock para garantir que apenas uma transação processa cada job.
   Lock é automaticamente liberado ao fim da transação (commit/rollback).
   Aguarda até 10s para edge function detectar e parar gracefully, depois força cancelamento.';
