-- Sprint 3: Pipeline Unificada
-- Adicionar campo quality_score à tabela songs
ALTER TABLE songs ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0;

-- Índice para ordenação e filtros por quality_score
CREATE INDEX IF NOT EXISTS idx_songs_quality_score ON songs(quality_score);

-- Comentário documentando a lógica
COMMENT ON COLUMN songs.quality_score IS 'Score 0-100: título(10) + compositor(20) + youtube(15) + letra(30) + ano(15) + semântico(10)';

-- Criar tabela processing_jobs para pipeline unificada
CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pendente',
  scope TEXT NOT NULL DEFAULT 'global',
  scope_filter TEXT,
  
  -- Contadores
  total_songs INTEGER DEFAULT 0,
  songs_processed INTEGER DEFAULT 0,
  songs_enriched INTEGER DEFAULT 0,
  songs_annotated INTEGER DEFAULT 0,
  songs_failed INTEGER DEFAULT 0,
  
  -- Métricas de qualidade
  avg_quality_score NUMERIC(5,2) DEFAULT 0,
  total_quality_points BIGINT DEFAULT 0,
  quality_distribution JSONB DEFAULT '{"0-25": 0, "26-50": 0, "51-75": 0, "76-100": 0}'::jsonb,
  
  -- Controle de chunks
  chunk_size INTEGER DEFAULT 30,
  chunks_processed INTEGER DEFAULT 0,
  current_song_index INTEGER DEFAULT 0,
  last_chunk_at TIMESTAMPTZ,
  is_cancelling BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Erros
  error_message TEXT,
  
  -- Metadados
  created_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- RLS
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read processing_jobs" ON processing_jobs FOR SELECT USING (true);
CREATE POLICY "Allow insert processing_jobs" ON processing_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update processing_jobs" ON processing_jobs FOR UPDATE USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_processing_jobs_updated_at
  BEFORE UPDATE ON processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_scope ON processing_jobs(scope, scope_filter);