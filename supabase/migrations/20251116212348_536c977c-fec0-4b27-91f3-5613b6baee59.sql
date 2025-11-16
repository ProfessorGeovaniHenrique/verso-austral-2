-- Tabela para rastrear jobs de importação de dicionários
CREATE TABLE IF NOT EXISTS public.dictionary_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_dicionario TEXT NOT NULL, -- 'dialectal_I', 'dialectal_II', 'gutenberg', 'houaiss', 'unesp'
  status TEXT NOT NULL DEFAULT 'iniciado', -- 'iniciado', 'processando', 'concluido', 'erro'
  total_verbetes INTEGER DEFAULT 0,
  verbetes_processados INTEGER DEFAULT 0,
  verbetes_inseridos INTEGER DEFAULT 0,
  erros INTEGER DEFAULT 0,
  erro_mensagem TEXT,
  progresso DECIMAL(5,2) DEFAULT 0.0,
  tempo_inicio TIMESTAMP WITH TIME ZONE DEFAULT now(),
  tempo_fim TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_dictionary_jobs_status ON public.dictionary_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_dictionary_jobs_tipo ON public.dictionary_import_jobs(tipo_dicionario);
CREATE INDEX IF NOT EXISTS idx_dictionary_jobs_criado ON public.dictionary_import_jobs(criado_em DESC);

-- Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION update_dictionary_job_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  
  -- Calcular progresso automaticamente
  IF NEW.total_verbetes > 0 THEN
    NEW.progresso = ROUND((NEW.verbetes_processados::DECIMAL / NEW.total_verbetes::DECIMAL) * 100, 2);
  END IF;
  
  -- Atualizar tempo_fim se concluído ou erro
  IF NEW.status IN ('concluido', 'erro') AND NEW.tempo_fim IS NULL THEN
    NEW.tempo_fim = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dictionary_job_timestamp_trigger
BEFORE UPDATE ON public.dictionary_import_jobs
FOR EACH ROW
EXECUTE FUNCTION update_dictionary_job_timestamp();

-- RLS Policies (permitir leitura pública para monitoramento)
ALTER TABLE public.dictionary_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de jobs" ON public.dictionary_import_jobs
FOR SELECT USING (true);

CREATE POLICY "Sistema pode inserir jobs" ON public.dictionary_import_jobs
FOR INSERT WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar jobs" ON public.dictionary_import_jobs
FOR UPDATE USING (true);