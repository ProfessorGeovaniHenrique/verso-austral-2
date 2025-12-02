-- Atualizar constraint fonte para incluir novos valores de refinamento MG
ALTER TABLE semantic_disambiguation_cache
DROP CONSTRAINT IF EXISTS semantic_disambiguation_cache_fonte_check;

ALTER TABLE semantic_disambiguation_cache
ADD CONSTRAINT semantic_disambiguation_cache_fonte_check
CHECK ((fonte = ANY (ARRAY[
  'gemini'::text,
  'gemini_flash'::text,
  'gemini_pro'::text,
  'gpt5'::text,
  'rule_based'::text,
  'manual'::text,
  'gemini_flash_mg_refinement'::text,
  'gpt5_mg_refinement'::text
])));