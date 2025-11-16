-- Corrigir search_path das funções para segurança
ALTER FUNCTION public.update_dictionary_job_timestamp() SET search_path = public;
ALTER FUNCTION public.update_lexicon_timestamp() SET search_path = public;
ALTER FUNCTION public.validate_tagset_hierarchy() SET search_path = public;
ALTER FUNCTION public.update_dialectal_timestamp() SET search_path = public;
ALTER FUNCTION public.update_gutenberg_timestamp() SET search_path = public;