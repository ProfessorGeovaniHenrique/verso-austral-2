-- FASE 1: Migração de Schema para Polissemia e Insígnias Culturais

-- Adicionar suporte a múltiplos DSs (polissemia)
ALTER TABLE semantic_disambiguation_cache 
ADD COLUMN IF NOT EXISTS tagsets_alternativos text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_polysemous boolean DEFAULT false;

-- Adicionar suporte a insígnias culturais
ALTER TABLE semantic_disambiguation_cache 
ADD COLUMN IF NOT EXISTS insignias_culturais text[] DEFAULT '{}';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cache_polysemous 
ON semantic_disambiguation_cache(is_polysemous) 
WHERE is_polysemous = true;

CREATE INDEX IF NOT EXISTS idx_cache_insignias 
ON semantic_disambiguation_cache USING GIN(insignias_culturais) 
WHERE insignias_culturais <> '{}';

-- Comentários para documentação
COMMENT ON COLUMN semantic_disambiguation_cache.tagsets_alternativos IS 
'DSs secundários quando palavra é polissêmica (ex: banco → OA, AP, NA)';

COMMENT ON COLUMN semantic_disambiguation_cache.is_polysemous IS 
'Indica se palavra tem múltiplos sentidos (polissemia)';

COMMENT ON COLUMN semantic_disambiguation_cache.insignias_culturais IS 
'Marcadores culturais: Gaúcho, Platino, Nordestino, etc.';