-- Tabela para histórico de scans de código
CREATE TABLE public.code_scan_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scan_type TEXT NOT NULL CHECK (scan_type IN ('full', 'edge-functions', 'components', 'hooks')),
  files_analyzed INTEGER NOT NULL DEFAULT 0,
  total_issues INTEGER NOT NULL DEFAULT 0,
  resolved_issues INTEGER NOT NULL DEFAULT 0,
  new_issues INTEGER NOT NULL DEFAULT 0,
  pending_issues INTEGER NOT NULL DEFAULT 0,
  scan_data JSONB NOT NULL DEFAULT '{}',
  comparison_baseline TEXT DEFAULT 'audit-report-2024-11',
  improvement_percentage NUMERIC(5,2) DEFAULT 0.00,
  scanned_by UUID,
  scan_duration_ms INTEGER
);

-- Enable RLS
ALTER TABLE public.code_scan_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Scans são públicos para leitura"
  ON public.code_scan_history
  FOR SELECT
  USING (true);

CREATE POLICY "Sistema pode inserir scans"
  ON public.code_scan_history
  FOR INSERT
  WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_code_scan_history_created_at ON public.code_scan_history(created_at DESC);
CREATE INDEX idx_code_scan_history_scan_type ON public.code_scan_history(scan_type);

-- Comentários
COMMENT ON TABLE public.code_scan_history IS 'Histórico de scans de código automatizados para detecção de bugs e regressões';
COMMENT ON COLUMN public.code_scan_history.scan_data IS 'Resultado completo do scan incluindo arrays de bugs resolved/new/pending';
COMMENT ON COLUMN public.code_scan_history.improvement_percentage IS 'Percentual de melhoria desde o baseline (negativo = regressão)';