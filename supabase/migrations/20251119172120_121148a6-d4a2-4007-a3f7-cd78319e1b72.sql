-- ============================================
-- FASE 3 - BLOCO 2: Habilitar Realtime na tabela dictionary_import_jobs
-- ============================================

-- Configurar REPLICA IDENTITY para capturar dados completos em updates
ALTER TABLE dictionary_import_jobs REPLICA IDENTITY FULL;

-- Adicionar tabela à publicação de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE dictionary_import_jobs;