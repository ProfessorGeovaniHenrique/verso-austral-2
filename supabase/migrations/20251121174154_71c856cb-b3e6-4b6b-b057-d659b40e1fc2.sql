-- Remover tabelas de enriquecimento de metadados
DROP TABLE IF EXISTS public.enrichment_jobs CASCADE;
DROP TABLE IF EXISTS public.enrichment_sessions CASCADE;

-- Remover também metadata_application_history e corpus_metadata_versions se existirem
DROP TABLE IF EXISTS public.metadata_application_history CASCADE;
DROP TABLE IF EXISTS public.corpus_metadata_versions CASCADE;