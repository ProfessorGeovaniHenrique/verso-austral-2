-- ============================================================================
-- MIGRATION: Correção Hierarquia com Desabilitação Temporária de FK
-- Data: 2025-01-16
-- Descrição: Desabilita FKs, normaliza códigos, reabilita FKs e adiciona constraint
-- ============================================================================

-- ETAPA 1: Backup Completo
CREATE TEMP TABLE backup_orphaned_tagsets AS
SELECT * FROM semantic_tagset
WHERE categoria_pai IS NULL 
  AND nivel_profundidade > 1;

-- ETAPA 2: Desabilitar Foreign Key Constraints Temporariamente
ALTER TABLE semantic_lexicon DROP CONSTRAINT IF EXISTS semantic_lexicon_tagset_codigo_fkey;
ALTER TABLE annotated_corpus DROP CONSTRAINT IF EXISTS annotated_corpus_tagset_codigo_fkey;
ALTER TABLE human_validations DROP CONSTRAINT IF EXISTS human_validations_tagset_original_fkey;
ALTER TABLE human_validations DROP CONSTRAINT IF EXISTS human_validations_tagset_corrigido_fkey;

-- ETAPA 3: Normalizar Códigos em semantic_tagset (Primeiro!)
UPDATE semantic_tagset
SET codigo = SUBSTRING(codigo FROM 1 FOR POSITION('.' IN codigo) - 1)
WHERE categoria_pai IS NULL 
  AND nivel_profundidade > 1
  AND codigo LIKE '%.01';

-- ETAPA 4: Atualizar Referências em Tabelas Dependentes
UPDATE semantic_lexicon
SET tagset_codigo = SUBSTRING(tagset_codigo FROM 1 FOR POSITION('.' IN tagset_codigo) - 1)
WHERE tagset_codigo LIKE '%.01'
  AND EXISTS (
    SELECT 1 FROM backup_orphaned_tagsets b
    WHERE b.codigo = semantic_lexicon.tagset_codigo
  );

UPDATE semantic_lexicon
SET tagset_primario = SUBSTRING(tagset_primario FROM 1 FOR POSITION('.' IN tagset_primario) - 1)
WHERE tagset_primario LIKE '%.01'
  AND EXISTS (
    SELECT 1 FROM backup_orphaned_tagsets b
    WHERE b.codigo = semantic_lexicon.tagset_primario
  );

UPDATE annotated_corpus
SET tagset_codigo = SUBSTRING(tagset_codigo FROM 1 FOR POSITION('.' IN tagset_codigo) - 1)
WHERE tagset_codigo LIKE '%.01'
  AND EXISTS (
    SELECT 1 FROM backup_orphaned_tagsets b
    WHERE b.codigo = annotated_corpus.tagset_codigo
  );

UPDATE annotated_corpus
SET tagset_primario = SUBSTRING(tagset_primario FROM 1 FOR POSITION('.' IN tagset_primario) - 1)
WHERE tagset_primario LIKE '%.01'
  AND EXISTS (
    SELECT 1 FROM backup_orphaned_tagsets b
    WHERE b.codigo = annotated_corpus.tagset_primario
  );

UPDATE human_validations
SET tagset_original = SUBSTRING(tagset_original FROM 1 FOR POSITION('.' IN tagset_original) - 1)
WHERE tagset_original LIKE '%.01'
  AND EXISTS (
    SELECT 1 FROM backup_orphaned_tagsets b
    WHERE b.codigo = human_validations.tagset_original
  );

UPDATE human_validations
SET tagset_corrigido = SUBSTRING(tagset_corrigido FROM 1 FOR POSITION('.' IN tagset_corrigido) - 1)
WHERE tagset_corrigido LIKE '%.01'
  AND EXISTS (
    SELECT 1 FROM backup_orphaned_tagsets b
    WHERE b.codigo = human_validations.tagset_corrigido
  );

-- ETAPA 5: Recriar Foreign Key Constraints
ALTER TABLE semantic_lexicon 
ADD CONSTRAINT semantic_lexicon_tagset_codigo_fkey 
FOREIGN KEY (tagset_codigo) 
REFERENCES semantic_tagset(codigo) 
ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE annotated_corpus 
ADD CONSTRAINT annotated_corpus_tagset_codigo_fkey 
FOREIGN KEY (tagset_codigo) 
REFERENCES semantic_tagset(codigo) 
ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE human_validations 
ADD CONSTRAINT human_validations_tagset_original_fkey 
FOREIGN KEY (tagset_original) 
REFERENCES semantic_tagset(codigo) 
ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE human_validations 
ADD CONSTRAINT human_validations_tagset_corrigido_fkey 
FOREIGN KEY (tagset_corrigido) 
REFERENCES semantic_tagset(codigo) 
ON UPDATE CASCADE ON DELETE SET NULL;

-- ETAPA 6: Adicionar Constraint de Validação Hierárquica
ALTER TABLE semantic_tagset 
ADD CONSTRAINT check_nivel_pai 
CHECK (
  (nivel_profundidade = 1 AND categoria_pai IS NULL) 
  OR 
  (nivel_profundidade > 1 AND categoria_pai IS NOT NULL)
);

-- ETAPA 7: Relatório Final
DO $$
DECLARE
  inconsistent_count INTEGER;
  total_level_1 INTEGER;
  total_level_2_plus INTEGER;
BEGIN
  SELECT COUNT(*) INTO inconsistent_count
  FROM semantic_tagset
  WHERE categoria_pai IS NULL AND nivel_profundidade > 1;
  
  SELECT COUNT(*) INTO total_level_1
  FROM semantic_tagset
  WHERE nivel_profundidade = 1;
  
  SELECT COUNT(*) INTO total_level_2_plus
  FROM semantic_tagset
  WHERE nivel_profundidade > 1;
  
  RAISE NOTICE '=== ✅ MIGRATION COMPLETA ===';
  RAISE NOTICE 'Registros inconsistentes restantes: %', inconsistent_count;
  RAISE NOTICE 'Total domínios nível 1: %', total_level_1;
  RAISE NOTICE 'Total domínios nível 2+: %', total_level_2_plus;
  
  IF inconsistent_count = 0 THEN
    RAISE NOTICE '✅ SUCESSO: Hierarquia 100%% consistente';
  ELSE
    RAISE EXCEPTION 'FALHA CRÍTICA: % inconsistências restantes', inconsistent_count;
  END IF;
END $$;