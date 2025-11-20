-- ============================================
-- FASE 1 & 4: Tabelas para Performance, Recovery e Monitoramento
-- ============================================

-- Tabela para rastrear qualidade de parsing por batch
CREATE TABLE IF NOT EXISTS public.dictionary_import_quality (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES dictionary_import_jobs(id) ON DELETE CASCADE,
  batch_number INTEGER NOT NULL,
  lines_processed INTEGER NOT NULL,
  lines_success INTEGER NOT NULL,
  lines_failed INTEGER NOT NULL,
  success_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN lines_processed > 0 THEN (lines_success::DECIMAL / lines_processed::DECIMAL) * 100
      ELSE 0
    END
  ) STORED,
  parsing_strategy TEXT, -- 'main', 'simple', 'keyword-only', 'recovery'
  sample_failures JSONB, -- Exemplos de linhas que falharam
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dict_quality_job_id ON dictionary_import_quality(job_id);
CREATE INDEX IF NOT EXISTS idx_dict_quality_created_at ON dictionary_import_quality(created_at DESC);

-- Tabela para rastrear tentativas de recuperação de jobs travados
CREATE TABLE IF NOT EXISTS public.dictionary_job_recovery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES dictionary_import_jobs(id) ON DELETE CASCADE,
  recovery_attempt INTEGER NOT NULL DEFAULT 1,
  strategy TEXT NOT NULL, -- 'auto-retry', 'manual-resume', 'cleanup', 'force-complete'
  success BOOLEAN NOT NULL,
  error_message TEXT,
  metadata JSONB, -- Informações adicionais sobre a tentativa
  recovered_by UUID, -- NULL para auto-recovery
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_log_job_id ON dictionary_job_recovery_log(job_id);
CREATE INDEX IF NOT EXISTS idx_recovery_log_created_at ON dictionary_job_recovery_log(created_at DESC);

-- Tabela para cachear status de health checks (server-side)
CREATE TABLE IF NOT EXISTS public.lexicon_health_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL UNIQUE, -- 'dialectal', 'gutenberg', 'houaiss', 'system-overall'
  status TEXT NOT NULL, -- 'healthy', 'warning', 'critical'
  message TEXT,
  details JSONB, -- Detalhes específicos do health check
  metrics JSONB, -- Métricas numéricas (totais, médias, etc)
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 minutes'), -- Cache de 5 minutos
  checked_by TEXT DEFAULT 'system', -- 'system' ou user_id
  CONSTRAINT valid_status CHECK (status IN ('healthy', 'warning', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_health_status_check_type ON lexicon_health_status(check_type);
CREATE INDEX IF NOT EXISTS idx_health_status_expires_at ON lexicon_health_status(expires_at);

-- Tabela para logging estruturado do sistema
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL, -- 'debug', 'info', 'warn', 'error', 'critical'
  category TEXT NOT NULL, -- 'import', 'health', 'performance', 'security', 'user-action'
  message TEXT NOT NULL,
  metadata JSONB, -- Dados estruturados do log
  user_id UUID, -- NULL para logs do sistema
  source TEXT, -- 'frontend', 'edge-function', 'database-trigger'
  trace_id TEXT, -- Para rastrear operações relacionadas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_level CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_system_logs_trace_id ON system_logs(trace_id) WHERE trace_id IS NOT NULL;

-- Função para limpar health checks expirados automaticamente
CREATE OR REPLACE FUNCTION clean_expired_health_checks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM lexicon_health_status
  WHERE expires_at < NOW();
END;
$$;

-- Função para limpar logs antigos (> 30 dias)
CREATE OR REPLACE FUNCTION clean_old_system_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM system_logs
  WHERE created_at < (NOW() - INTERVAL '30 days');
END;
$$;

-- ============================================
-- RLS Policies para as novas tabelas
-- ============================================

ALTER TABLE public.dictionary_import_quality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dictionary_job_recovery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lexicon_health_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Apenas admins podem visualizar
CREATE POLICY "Admins can view quality metrics"
  ON public.dictionary_import_quality
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view recovery logs"
  ON public.dictionary_job_recovery_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Anyone can view health status"
  ON public.lexicon_health_status
  FOR SELECT
  USING (true);

CREATE POLICY "System can insert health status"
  ON public.lexicon_health_status
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update health status"
  ON public.lexicon_health_status
  FOR UPDATE
  USING (true);

CREATE POLICY "Admins can view system logs"
  ON public.system_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert logs"
  ON public.system_logs
  FOR INSERT
  WITH CHECK (true);