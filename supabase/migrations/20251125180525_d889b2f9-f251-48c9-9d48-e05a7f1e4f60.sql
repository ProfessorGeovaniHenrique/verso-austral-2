-- Fase 1: Corrigir trigger e adicionar campo de justificativa

-- Corrigir trigger para respeitar nivel_profundidade manual
CREATE OR REPLACE FUNCTION public.validate_tagset_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  partes text[];
  codigo_nivel_calculado integer;
BEGIN
  -- Contar níveis no código
  partes := string_to_array(NEW.codigo, '.');
  codigo_nivel_calculado := array_length(partes, 1);
  
  IF codigo_nivel_calculado > 4 THEN
    RAISE EXCEPTION 'Hierarquia limitada a 4 níveis máximos';
  END IF;
  
  -- CORREÇÃO CRÍTICA: Só sobrescrever nivel_profundidade se:
  -- 1. Não foi definido manualmente (IS NULL) OU
  -- 2. O código é numérico (sistema antigo)
  IF NEW.nivel_profundidade IS NULL OR NEW.codigo ~ '^[0-9.]+$' THEN
    NEW.nivel_profundidade := codigo_nivel_calculado;
  END IF;
  
  -- Manter os campos codigo_nivel_X para compatibilidade
  NEW.codigo_nivel_1 := partes[1];
  NEW.codigo_nivel_2 := CASE WHEN codigo_nivel_calculado >= 2 THEN partes[1] || '.' || partes[2] ELSE NULL END;
  NEW.codigo_nivel_3 := CASE WHEN codigo_nivel_calculado >= 3 THEN partes[1] || '.' || partes[2] || '.' || partes[3] ELSE NULL END;
  NEW.codigo_nivel_4 := CASE WHEN codigo_nivel_calculado = 4 THEN partes[1] || '.' || partes[2] || '.' || partes[3] || '.' || partes[4] ELSE NULL END;
  
  RETURN NEW;
END;
$function$;

-- Adicionar campo rejection_reason para justificar rejeições
ALTER TABLE public.semantic_tagset 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.semantic_tagset.rejection_reason IS 'Justificativa fornecida pelo validador ao rejeitar um domínio semântico proposto';