-- Adicionar colunas de validação linguística expandida à semantic_disambiguation_cache
ALTER TABLE semantic_disambiguation_cache
ADD COLUMN IF NOT EXISTS is_mwe BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mwe_text TEXT,
ADD COLUMN IF NOT EXISTS forma_padrao TEXT,
ADD COLUMN IF NOT EXISTS is_spelling_deviation BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN semantic_disambiguation_cache.is_mwe IS 'Indica se a palavra faz parte de uma Multi-Word Expression';
COMMENT ON COLUMN semantic_disambiguation_cache.mwe_text IS 'Texto completo da MWE (ex: "mate amargo")';
COMMENT ON COLUMN semantic_disambiguation_cache.forma_padrao IS 'Forma ortográfica padrão quando há desvio (ex: "velho" para "véio")';
COMMENT ON COLUMN semantic_disambiguation_cache.is_spelling_deviation IS 'Indica se há desvio de escrita padrão';

-- Adicionar colunas de auditoria expandida à human_validations
ALTER TABLE human_validations
ADD COLUMN IF NOT EXISTS pos_original TEXT,
ADD COLUMN IF NOT EXISTS pos_corrigido TEXT,
ADD COLUMN IF NOT EXISTS lema_original TEXT,
ADD COLUMN IF NOT EXISTS lema_corrigido TEXT,
ADD COLUMN IF NOT EXISTS is_mwe BOOLEAN,
ADD COLUMN IF NOT EXISTS mwe_text TEXT,
ADD COLUMN IF NOT EXISTS forma_padrao TEXT,
ADD COLUMN IF NOT EXISTS is_spelling_deviation BOOLEAN;

COMMENT ON COLUMN human_validations.pos_original IS 'POS tag original da palavra';
COMMENT ON COLUMN human_validations.pos_corrigido IS 'POS tag corrigido pelo validador';
COMMENT ON COLUMN human_validations.lema_original IS 'Lema original da palavra';
COMMENT ON COLUMN human_validations.lema_corrigido IS 'Lema corrigido pelo validador';
COMMENT ON COLUMN human_validations.is_mwe IS 'Indica se a palavra foi marcada como parte de MWE';
COMMENT ON COLUMN human_validations.mwe_text IS 'Texto completo da MWE validada';
COMMENT ON COLUMN human_validations.forma_padrao IS 'Forma padrão quando há desvio ortográfico';
COMMENT ON COLUMN human_validations.is_spelling_deviation IS 'Indica se foi identificado desvio ortográfico';