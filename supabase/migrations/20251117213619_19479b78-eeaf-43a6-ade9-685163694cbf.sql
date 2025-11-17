-- Tabela para armazenar logs de chamadas às edge functions
CREATE TABLE IF NOT EXISTS public.edge_function_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação da função
  function_name TEXT NOT NULL,
  
  -- Informações da requisição
  request_method TEXT NOT NULL,
  request_path TEXT,
  request_ip TEXT,
  user_id UUID,
  user_role TEXT,
  
  -- Status da resposta
  status_code INT NOT NULL,
  response_time_ms INT,
  
  -- Payload (limitado)
  request_payload JSONB,
  response_payload JSONB,
  
  -- Rate limiting
  rate_limited BOOLEAN DEFAULT false,
  rate_limit_remaining INT,
  
  -- Erro (se houver)
  error_message TEXT,
  error_stack TEXT,
  
  -- Metadados
  user_agent TEXT,
  referer TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_edge_function_logs_function_name ON public.edge_function_logs(function_name);
CREATE INDEX idx_edge_function_logs_user_id ON public.edge_function_logs(user_id);
CREATE INDEX idx_edge_function_logs_status_code ON public.edge_function_logs(status_code);
CREATE INDEX idx_edge_function_logs_created_at ON public.edge_function_logs(created_at DESC);
CREATE INDEX idx_edge_function_logs_rate_limited ON public.edge_function_logs(rate_limited) WHERE rate_limited = true;

-- RLS: Apenas admins podem visualizar logs
ALTER TABLE public.edge_function_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view edge function logs"
ON public.edge_function_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Comentário
COMMENT ON TABLE public.edge_function_logs IS 'Logs de chamadas às Edge Functions para monitoramento e auditoria';

-- Tabela para armazenar métricas agregadas (para performance)
CREATE TABLE IF NOT EXISTS public.edge_function_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  
  -- Período da métrica
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  period_type TEXT NOT NULL,
  
  -- Métricas de uso
  total_requests INT DEFAULT 0,
  successful_requests INT DEFAULT 0,
  failed_requests INT DEFAULT 0,
  rate_limited_requests INT DEFAULT 0,
  
  -- Métricas de performance
  avg_response_time_ms INT,
  min_response_time_ms INT,
  max_response_time_ms INT,
  p50_response_time_ms INT,
  p95_response_time_ms INT,
  p99_response_time_ms INT,
  
  -- Status codes
  status_2xx INT DEFAULT 0,
  status_4xx INT DEFAULT 0,
  status_5xx INT DEFAULT 0,
  
  -- Usuários únicos
  unique_users INT DEFAULT 0,
  unique_ips INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(function_name, period_start, period_type)
);

CREATE INDEX idx_edge_function_metrics_function_period ON public.edge_function_metrics(function_name, period_start DESC);

ALTER TABLE public.edge_function_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view edge function metrics"
ON public.edge_function_metrics
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));