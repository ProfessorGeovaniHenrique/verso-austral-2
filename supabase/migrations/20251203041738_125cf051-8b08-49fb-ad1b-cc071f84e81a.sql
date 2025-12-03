-- Criar tabela de jobs de scraping para processamento assíncrono
CREATE TABLE IF NOT EXISTS public.scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Configuração
  corpus_type VARCHAR(50) NOT NULL DEFAULT 'sertanejo',
  total_artists INTEGER NOT NULL DEFAULT 0,
  songs_per_artist INTEGER NOT NULL DEFAULT 15,
  
  -- Progresso
  status VARCHAR(20) NOT NULL DEFAULT 'iniciado',
  current_artist_index INTEGER NOT NULL DEFAULT 0,
  artists_processed INTEGER NOT NULL DEFAULT 0,
  artists_skipped INTEGER NOT NULL DEFAULT 0,
  songs_created INTEGER NOT NULL DEFAULT 0,
  songs_with_lyrics INTEGER NOT NULL DEFAULT 0,
  
  -- Controle de execução
  last_chunk_at TIMESTAMP WITH TIME ZONE,
  chunks_processed INTEGER NOT NULL DEFAULT 0,
  is_cancelling BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Metadados
  erro_mensagem TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  config JSONB DEFAULT '{}'::jsonb
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_corpus ON scraping_jobs(corpus_type);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_created ON scraping_jobs(created_at DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_scraping_job_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS scraping_job_updated_at ON scraping_jobs;
CREATE TRIGGER scraping_job_updated_at
  BEFORE UPDATE ON scraping_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_scraping_job_timestamp();

-- RLS Policies
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view scraping jobs" ON scraping_jobs;
CREATE POLICY "Anyone can view scraping jobs"
  ON scraping_jobs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage scraping jobs" ON scraping_jobs;
CREATE POLICY "Service role can manage scraping jobs"
  ON scraping_jobs FOR ALL USING (true);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE scraping_jobs;