-- Migration: Replace Houaiss with Rocha Pombo (ABL)
-- Atualiza entradas existentes do Houaiss para Rocha Pombo

-- 1. Atualizar entradas existentes
UPDATE lexical_synonyms 
SET fonte = 'rocha_pombo'
WHERE fonte = 'houaiss';

-- 2. Atualizar constraint de fonte válida (se existir)
ALTER TABLE lexical_synonyms
DROP CONSTRAINT IF EXISTS lexical_synonyms_fonte_check;

ALTER TABLE lexical_synonyms
ADD CONSTRAINT lexical_synonyms_fonte_check
CHECK (fonte IN ('rocha_pombo', 'gutenberg', 'dialectal', 'unesp'));

-- 3. Criar índice para melhor performance nas queries de sinônimos
CREATE INDEX IF NOT EXISTS idx_lexical_synonyms_fonte_rocha_pombo 
ON lexical_synonyms(fonte) WHERE fonte = 'rocha_pombo';

-- 4. Adicionar comentário na tabela
COMMENT ON COLUMN lexical_synonyms.fonte IS 'Fonte do sinônimo: rocha_pombo (ABL 2ª ed. 2011), gutenberg, dialectal, unesp';