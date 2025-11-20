-- Adicionar coluna entry_type à tabela lexical_synonyms
ALTER TABLE public.lexical_synonyms 
ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'word' CHECK (entry_type IN ('word', 'mwe'));

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_lexical_synonyms_entry_type 
ON public.lexical_synonyms(entry_type);

-- Comentário da migração
COMMENT ON COLUMN public.lexical_synonyms.entry_type IS 'Tipo de entrada: word (palavra única) ou mwe (expressão multi-palavra)';