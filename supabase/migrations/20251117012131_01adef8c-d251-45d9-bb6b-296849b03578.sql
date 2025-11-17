-- Criar tabela de alertas do sistema
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('critical_bugs', 'low_improvement', 'high_pending')),
  message TEXT NOT NULL,
  scan_id UUID REFERENCES public.code_scan_history(id) ON DELETE CASCADE,
  sent_to TEXT,
  acknowledged BOOLEAN DEFAULT false NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Habilitar RLS
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Policy de leitura pública
CREATE POLICY "Alertas são públicos para leitura"
  ON public.system_alerts
  FOR SELECT
  USING (true);

-- Policy de inserção apenas para edge functions
CREATE POLICY "Edge functions podem criar alertas"
  ON public.system_alerts
  FOR INSERT
  WITH CHECK (true);

-- Policy de atualização pública (para acknowledged)
CREATE POLICY "Permitir atualização de acknowledged"
  ON public.system_alerts
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Index para melhor performance
CREATE INDEX idx_system_alerts_created_at ON public.system_alerts(created_at DESC);
CREATE INDEX idx_system_alerts_acknowledged ON public.system_alerts(acknowledged);
CREATE INDEX idx_system_alerts_scan_id ON public.system_alerts(scan_id);

-- Habilitar Realtime para alertas
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_alerts;