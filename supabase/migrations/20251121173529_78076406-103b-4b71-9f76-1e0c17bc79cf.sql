-- Tabela para armazenar overrides editáveis do Developer History
CREATE TABLE IF NOT EXISTS public.dev_history_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id TEXT NOT NULL,
  field_path TEXT NOT NULL,
  original_value TEXT,
  override_value TEXT NOT NULL,
  edited_by UUID REFERENCES auth.users(id),
  edited_at TIMESTAMPTZ DEFAULT now(),
  version INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_dev_history_overrides_phase_id ON public.dev_history_overrides(phase_id);
CREATE INDEX IF NOT EXISTS idx_dev_history_overrides_active ON public.dev_history_overrides(active);
CREATE INDEX IF NOT EXISTS idx_dev_history_overrides_edited_by ON public.dev_history_overrides(edited_by);

-- RLS Policies
ALTER TABLE public.dev_history_overrides ENABLE ROW LEVEL SECURITY;

-- Admins podem ver tudo
CREATE POLICY "Admins can view all overrides"
  ON public.dev_history_overrides
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins podem inserir overrides
CREATE POLICY "Admins can insert overrides"
  ON public.dev_history_overrides
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins podem atualizar overrides
CREATE POLICY "Admins can update overrides"
  ON public.dev_history_overrides
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins podem deletar overrides (restaurar original)
CREATE POLICY "Admins can delete overrides"
  ON public.dev_history_overrides
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_dev_history_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dev_history_overrides_timestamp
  BEFORE UPDATE ON public.dev_history_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_dev_history_overrides_updated_at();