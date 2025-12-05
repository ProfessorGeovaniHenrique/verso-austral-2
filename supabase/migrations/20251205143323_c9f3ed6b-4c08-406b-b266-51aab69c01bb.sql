-- Tabela para jobs de anotação de corpus inteiro
CREATE TABLE public.corpus_annotation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corpus_id UUID REFERENCES corpora(id),
  corpus_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'pausado', 'concluido', 'erro', 'cancelado')),
  
  -- Progresso por artistas
  total_artists INTEGER DEFAULT 0,
  processed_artists INTEGER DEFAULT 0,
  current_artist_id UUID REFERENCES artists(id),
  current_artist_name TEXT,
  current_artist_job_id UUID REFERENCES annotation_jobs(id),
  
  -- Progresso agregado
  total_songs INTEGER DEFAULT 0,
  processed_songs INTEGER DEFAULT 0,
  total_words_estimated BIGINT DEFAULT 0,
  processed_words BIGINT DEFAULT 0,
  
  -- Controle
  last_artist_at TIMESTAMPTZ,
  is_cancelling BOOLEAN DEFAULT false,
  tempo_inicio TIMESTAMPTZ DEFAULT NOW(),
  tempo_fim TIMESTAMPTZ,
  erro_mensagem TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_corpus_annotation_jobs_corpus ON corpus_annotation_jobs(corpus_id);
CREATE INDEX idx_corpus_annotation_jobs_status ON corpus_annotation_jobs(status);

-- RLS
ALTER TABLE corpus_annotation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Corpus annotation jobs são públicos para leitura"
ON corpus_annotation_jobs FOR SELECT USING (true);

CREATE POLICY "Sistema pode criar corpus annotation jobs"
ON corpus_annotation_jobs FOR INSERT WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar corpus annotation jobs"
ON corpus_annotation_jobs FOR UPDATE USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_corpus_annotation_jobs_updated_at
BEFORE UPDATE ON corpus_annotation_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();