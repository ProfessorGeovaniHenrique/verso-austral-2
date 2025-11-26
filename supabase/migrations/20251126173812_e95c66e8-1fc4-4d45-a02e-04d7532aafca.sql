-- Criar tabela de jobs de anotação semântica
CREATE TABLE IF NOT EXISTS public.semantic_annotation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL,
  artist_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'iniciado' CHECK (status IN ('iniciado', 'processando', 'concluido', 'erro', 'cancelado')),
  
  -- Progress tracking
  total_songs INTEGER NOT NULL DEFAULT 0,
  total_words INTEGER NOT NULL DEFAULT 0,
  processed_words INTEGER NOT NULL DEFAULT 0,
  cached_words INTEGER NOT NULL DEFAULT 0,
  new_words INTEGER NOT NULL DEFAULT 0,
  
  -- Timing
  tempo_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tempo_fim TIMESTAMPTZ,
  
  -- Error handling
  erro_mensagem TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index para buscar jobs por artista e status
CREATE INDEX idx_semantic_jobs_artist ON public.semantic_annotation_jobs(artist_id, status);
CREATE INDEX idx_semantic_jobs_status ON public.semantic_annotation_jobs(status);
CREATE INDEX idx_semantic_jobs_created ON public.semantic_annotation_jobs(created_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_semantic_job_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER semantic_job_updated_at
  BEFORE UPDATE ON public.semantic_annotation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_semantic_job_timestamp();

-- RLS policies
ALTER TABLE public.semantic_annotation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view semantic jobs"
  ON public.semantic_annotation_jobs
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert semantic jobs"
  ON public.semantic_annotation_jobs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update semantic jobs"
  ON public.semantic_annotation_jobs
  FOR UPDATE
  USING (true);