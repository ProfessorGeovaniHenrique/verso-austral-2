-- FASE 1: Migration - Análise Comparativa de Corpus com Marcadores Culturais

-- Adicionar colunas de análise comparativa em annotated_corpus
ALTER TABLE public.annotated_corpus
ADD COLUMN IF NOT EXISTS freq_study_corpus integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS freq_reference_corpus integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ll_score numeric(10,4),
ADD COLUMN IF NOT EXISTS mi_score numeric(10,4),
ADD COLUMN IF NOT EXISTS is_cultural_marker boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS significance_level text;

-- Adicionar metadados de corpus de referência em annotation_jobs
ALTER TABLE public.annotation_jobs
ADD COLUMN IF NOT EXISTS reference_corpus_type text,
ADD COLUMN IF NOT EXISTS reference_artist_filter text,
ADD COLUMN IF NOT EXISTS reference_corpus_size integer,
ADD COLUMN IF NOT EXISTS study_corpus_size integer,
ADD COLUMN IF NOT EXISTS size_ratio numeric(4,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS cultural_markers_found integer DEFAULT 0;

-- Criar índices para otimizar queries de marcadores culturais
CREATE INDEX IF NOT EXISTS idx_annotated_corpus_cultural_markers 
ON public.annotated_corpus(is_cultural_marker) 
WHERE is_cultural_marker = true;

CREATE INDEX IF NOT EXISTS idx_annotated_corpus_significance 
ON public.annotated_corpus(significance_level) 
WHERE significance_level IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_annotated_corpus_ll_score 
ON public.annotated_corpus(ll_score DESC) 
WHERE ll_score IS NOT NULL;

COMMENT ON COLUMN public.annotated_corpus.freq_study_corpus IS 'Frequência da palavra no corpus de estudo';
COMMENT ON COLUMN public.annotated_corpus.freq_reference_corpus IS 'Frequência da palavra no corpus de referência';
COMMENT ON COLUMN public.annotated_corpus.ll_score IS 'Log-Likelihood score (análise estatística)';
COMMENT ON COLUMN public.annotated_corpus.mi_score IS 'Mutual Information score (força de associação)';
COMMENT ON COLUMN public.annotated_corpus.is_cultural_marker IS 'Marcador cultural identificado (LL > 6.63 AND MI > 1.0 AND freq_CE > freq_CR)';
COMMENT ON COLUMN public.annotated_corpus.significance_level IS 'Nível de significância estatística (Alta/Média/Baixa)';
COMMENT ON COLUMN public.annotation_jobs.reference_corpus_type IS 'Tipo do corpus de referência usado';
COMMENT ON COLUMN public.annotation_jobs.reference_artist_filter IS 'Filtro de artista no corpus de referência';
COMMENT ON COLUMN public.annotation_jobs.size_ratio IS 'Ratio de balanceamento entre CE e CR (ex: 1.0 = tamanhos iguais)';
COMMENT ON COLUMN public.annotation_jobs.cultural_markers_found IS 'Quantidade de marcadores culturais identificados';