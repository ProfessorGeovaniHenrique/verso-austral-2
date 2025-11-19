-- ============================================
-- TABELA: metric_alerts
-- Armazena alertas baseados em thresholds de métricas
-- ============================================
CREATE TABLE IF NOT EXISTS public.metric_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  function_name TEXT,
  threshold NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'error', 'critical')),
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_triggered ON public.metric_alerts(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_function ON public.metric_alerts(function_name);
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON public.metric_alerts(resolved_at) WHERE resolved_at IS NULL;

ALTER TABLE public.metric_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all alerts"
  ON public.metric_alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.metric_alerts IS 'Alertas automáticos baseados em thresholds de métricas';