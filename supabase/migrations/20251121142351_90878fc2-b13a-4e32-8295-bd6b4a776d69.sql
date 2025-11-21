-- Corrigir função para adicionar search_path e evitar warning de segurança
CREATE OR REPLACE FUNCTION update_lexical_synonyms_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path TO 'public';