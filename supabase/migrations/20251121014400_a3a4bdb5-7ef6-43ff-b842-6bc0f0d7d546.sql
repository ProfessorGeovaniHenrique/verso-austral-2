-- Criar função para TRUNCATE seguro da tabela gutenberg_lexicon
CREATE OR REPLACE FUNCTION truncate_gutenberg_table()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE gutenberg_lexicon RESTART IDENTITY CASCADE;
END;
$$;