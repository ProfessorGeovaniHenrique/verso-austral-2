-- FASE 1: Criar tabela enrichment_jobs para tracking de jobs batch

CREATE TABLE public.enrichment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corpus_type TEXT NOT NULL CHECK (corpus_type IN ('gaucho', 'nordestino')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  total_songs INTEGER DEFAULT 0,
  processed_songs INTEGER DEFAULT 0,
  auto_validated INTEGER DEFAULT 0,
  needs_review INTEGER DEFAULT 0,
  errors TEXT[] DEFAULT '{}',
  review_csv_url TEXT,
  updated_corpus_url TEXT,
  backup_url TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes para performance
CREATE INDEX idx_enrichment_jobs_user_id ON public.enrichment_jobs(user_id);
CREATE INDEX idx_enrichment_jobs_status ON public.enrichment_jobs(status);
CREATE INDEX idx_enrichment_jobs_corpus_type ON public.enrichment_jobs(corpus_type);
CREATE INDEX idx_enrichment_jobs_created_at ON public.enrichment_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE public.enrichment_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins podem gerenciar todos os jobs
CREATE POLICY "Admins can manage all enrichment jobs"
  ON public.enrichment_jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_enrichment_jobs_updated_at
  BEFORE UPDATE ON public.enrichment_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();