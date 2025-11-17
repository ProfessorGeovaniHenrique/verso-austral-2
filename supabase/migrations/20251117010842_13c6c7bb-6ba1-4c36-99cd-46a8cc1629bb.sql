-- ============================================
-- FASE 2: CONSTRUCTION LOG MANAGER
-- Tabelas para gerenciar fases de construção
-- ============================================

-- Tabela principal de fases
CREATE TABLE construction_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Dados da fase
  phase_number INTEGER NOT NULL UNIQUE,
  phase_name TEXT NOT NULL,
  date_start DATE NOT NULL,
  date_end DATE,
  status TEXT CHECK (status IN ('completed', 'in-progress', 'planned')) DEFAULT 'planned',
  objective TEXT NOT NULL,
  
  -- Dados estruturados
  decisions JSONB DEFAULT '[]',
  artifacts JSONB DEFAULT '[]',
  metrics JSONB DEFAULT '{}',
  scientific_basis JSONB DEFAULT '[]',
  challenges JSONB DEFAULT '[]',
  next_steps JSONB DEFAULT '[]',
  
  -- Metadata
  created_by UUID,
  is_synced_to_static BOOLEAN DEFAULT false
);

-- Tabela de decisões técnicas
CREATE TABLE technical_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID REFERENCES construction_phases(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  rationale TEXT NOT NULL,
  alternatives JSONB DEFAULT '[]',
  chosen_because TEXT NOT NULL,
  impact TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de métricas por fase
CREATE TABLE phase_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID REFERENCES construction_phases(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  value_before NUMERIC,
  value_after NUMERIC,
  unit TEXT,
  improvement_percentage NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_construction_phases_status ON construction_phases(status);
CREATE INDEX idx_construction_phases_phase_number ON construction_phases(phase_number);
CREATE INDEX idx_technical_decisions_phase_id ON technical_decisions(phase_id);
CREATE INDEX idx_phase_metrics_phase_id ON phase_metrics(phase_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_construction_phase_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_construction_phases_updated_at
  BEFORE UPDATE ON construction_phases
  FOR EACH ROW
  EXECUTE FUNCTION update_construction_phase_timestamp();

-- RLS Policies
ALTER TABLE construction_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fases são públicas para leitura"
  ON construction_phases FOR SELECT
  USING (true);

CREATE POLICY "Permitir criação de fases"
  ON construction_phases FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de fases"
  ON construction_phases FOR UPDATE
  USING (true);

CREATE POLICY "Decisões são públicas para leitura"
  ON technical_decisions FOR SELECT
  USING (true);

CREATE POLICY "Permitir criação de decisões"
  ON technical_decisions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Métricas são públicas para leitura"
  ON phase_metrics FOR SELECT
  USING (true);

CREATE POLICY "Permitir criação de métricas"
  ON phase_metrics FOR INSERT
  WITH CHECK (true);