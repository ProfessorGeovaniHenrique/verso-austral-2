-- Adicionar coluna needs_correction na tabela semantic_disambiguation_cache
ALTER TABLE semantic_disambiguation_cache 
ADD COLUMN IF NOT EXISTS needs_correction BOOLEAN DEFAULT false;

-- Índice parcial para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_semantic_cache_needs_correction 
ON semantic_disambiguation_cache(needs_correction) 
WHERE needs_correction = true;