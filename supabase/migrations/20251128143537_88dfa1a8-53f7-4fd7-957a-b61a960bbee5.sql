-- Criar tabela batch_seeding_jobs para persistência de jobs
CREATE TABLE batch_seeding_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'pausado', 'concluido', 'erro', 'cancelado')),
  source TEXT NOT NULL DEFAULT 'all',
  
  -- Progresso
  total_candidates INTEGER DEFAULT 0,
  processed_words INTEGER DEFAULT 0,
  current_offset INTEGER DEFAULT 0,
  
  -- Métricas de classificação
  morfologico_count INTEGER DEFAULT 0,
  heranca_count INTEGER DEFAULT 0,
  gemini_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  -- Timestamps
  tempo_inicio TIMESTAMPTZ DEFAULT NOW(),
  tempo_fim TIMESTAMPTZ,
  last_chunk_at TIMESTAMPTZ,
  
  -- Erro
  erro_mensagem TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_batch_seeding_status ON batch_seeding_jobs(status);
CREATE INDEX idx_batch_seeding_created ON batch_seeding_jobs(created_at DESC);

-- RLS policies
ALTER TABLE batch_seeding_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ler batch seeding jobs"
  ON batch_seeding_jobs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sistema pode criar batch seeding jobs"
  ON batch_seeding_jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar batch seeding jobs"
  ON batch_seeding_jobs FOR UPDATE
  USING (true);

-- Habilitar Realtime para notificações
ALTER PUBLICATION supabase_realtime ADD TABLE batch_seeding_jobs;

-- Trigger para updated_at
CREATE TRIGGER update_batch_seeding_jobs_updated_at
  BEFORE UPDATE ON batch_seeding_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();