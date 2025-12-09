-- Sprint 4: Adicionar campos de métricas de qualidade do refinamento
ALTER TABLE semantic_refinement_jobs
ADD COLUMN IF NOT EXISTS n2_refined INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS n3_refined INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS n4_refined INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sample_refinements JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS priority_mode TEXT DEFAULT 'impact';

-- Comentário documentando
COMMENT ON COLUMN semantic_refinement_jobs.n2_refined IS 'Contador de palavras refinadas para nível N2';
COMMENT ON COLUMN semantic_refinement_jobs.n3_refined IS 'Contador de palavras refinadas para nível N3';
COMMENT ON COLUMN semantic_refinement_jobs.n4_refined IS 'Contador de palavras refinadas para nível N4';
COMMENT ON COLUMN semantic_refinement_jobs.sample_refinements IS 'Exemplos de refinamentos bem-sucedidos (últimos 10)';
COMMENT ON COLUMN semantic_refinement_jobs.priority_mode IS 'Modo de priorização: impact, alphabetical, random';