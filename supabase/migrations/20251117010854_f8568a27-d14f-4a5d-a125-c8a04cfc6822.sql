-- Corrigir search_path das funções para segurança
ALTER FUNCTION update_construction_phase_timestamp() SET search_path = 'public';