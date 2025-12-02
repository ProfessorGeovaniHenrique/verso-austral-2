-- Corrigir constraint do semantic_lexicon para aceitar gemini_flash, gpt5, e rule_based
ALTER TABLE semantic_lexicon DROP CONSTRAINT IF EXISTS semantic_lexicon_fonte_check;

ALTER TABLE semantic_lexicon ADD CONSTRAINT semantic_lexicon_fonte_check 
CHECK (fonte = ANY (ARRAY['gemini', 'gemini_flash', 'gpt5', 'morfologico', 'manual', 'heranca', 'rule_based']));

-- Verificar e corrigir constraint em semantic_disambiguation_cache também
ALTER TABLE semantic_disambiguation_cache DROP CONSTRAINT IF EXISTS semantic_disambiguation_cache_fonte_check;

ALTER TABLE semantic_disambiguation_cache ADD CONSTRAINT semantic_disambiguation_cache_fonte_check 
CHECK (fonte = ANY (ARRAY['gemini', 'gemini_flash', 'gemini_pro', 'gpt5', 'rule_based', 'manual']));

-- Adicionar coluna gpt5_count na tabela batch_seeding_jobs se não existir
ALTER TABLE batch_seeding_jobs ADD COLUMN IF NOT EXISTS gpt5_count INTEGER DEFAULT 0;