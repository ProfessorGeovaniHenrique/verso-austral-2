-- ============================================================================
-- FASE 1: LIMPEZA TOTAL DO BACKEND - RESET COMPLETO DO SISTEMA DE DICIONÁRIOS
-- ============================================================================

-- 🔧 1. REMOVER CONSTRAINT DUPLICADO (CRÍTICO - RESOLVE O BUG)
-- Remove índice único simples que está causando conflito de duplicatas
-- Mantém apenas a constraint composta (verbete_normalizado, origem_primaria)
DROP INDEX IF EXISTS public.idx_dialectal_lexicon_verbete_normalizado;

-- 🧹 2. LIMPAR TODOS OS DADOS DOS DICIONÁRIOS
-- Ordem de exclusão respeita foreign keys e dependências

-- Limpar validações humanas (dependências de tagsets)
DELETE FROM public.human_validations;

-- Limpar jobs de importação (não tem foreign keys)
DELETE FROM public.dictionary_import_jobs;

-- Limpar dicionários principais
DELETE FROM public.dialectal_lexicon;
DELETE FROM public.gutenberg_lexicon;
DELETE FROM public.lexical_synonyms;
DELETE FROM public.lexical_definitions;

-- 🔍 3. VERIFICAR CONSTRAINTS REMANESCENTES
-- Apenas para log - confirmar que só a constraint composta existe
DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO constraint_count
  FROM pg_indexes 
  WHERE tablename = 'dialectal_lexicon' 
    AND schemaname = 'public'
    AND indexdef LIKE '%UNIQUE%'
    AND indexname != 'dialectal_lexicon_pkey';
  
  RAISE NOTICE '✅ Constraints únicas na dialectal_lexicon (exceto PK): %', constraint_count;
  RAISE NOTICE '   Esperado: 1 (apenas idx_dialectal_unique com verbete_normalizado + origem_primaria)';
END $$;

-- 📊 4. ATUALIZAR ESTATÍSTICAS DAS TABELAS
-- Otimiza query planner após limpeza massiva
ANALYZE public.dialectal_lexicon;
ANALYZE public.gutenberg_lexicon;
ANALYZE public.lexical_synonyms;
ANALYZE public.lexical_definitions;
ANALYZE public.dictionary_import_jobs;
ANALYZE public.human_validations;

-- ✅ 5. LOG DE CONCLUSÃO
DO $$
BEGIN
  RAISE NOTICE '=============================================================';
  RAISE NOTICE '✅ FASE 1 CONCLUÍDA: Backend limpo e pronto para nova importação';
  RAISE NOTICE '=============================================================';
  RAISE NOTICE '🔧 Constraint duplicado removido';
  RAISE NOTICE '🧹 Todos os dados de dicionários excluídos';
  RAISE NOTICE '📊 Estatísticas atualizadas';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Próximos passos:';
  RAISE NOTICE '   1. Edge functions atualizadas com novos URLs';
  RAISE NOTICE '   2. Parsers validados para novos formatos';
  RAISE NOTICE '   3. Interface refatorada';
  RAISE NOTICE '=============================================================';
END $$;