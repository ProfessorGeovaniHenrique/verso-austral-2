-- ========================================
-- FASE 4: REBAIXAR N1S OBSOLETOS PARA N2S
-- (Com ON UPDATE CASCADE configurado)
-- ========================================

-- CRIAR NOVOS N2s DE DESTINO
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, tagset_pai, nivel_profundidade, status)
VALUES
  ('AP.02', 'Alimentação e Culinária', 'Preparo, consumo e cultura alimentar.', 'AP', 'AP', 2, 'ativo'),
  ('AP.03', 'Vestuário e Moda', 'Roupas, acessórios, indumentária tradicional.', 'AP', 'AP', 2, 'ativo'),
  ('CC.05', 'Religiosidade e Espiritualidade', 'Crenças, rituais, fé e espiritualidade.', 'CC', 'CC', 2, 'ativo'),
  ('SP.01', 'Geopolítica e Território', 'Fronteiras, nações, conflitos territoriais.', 'SP', 'SP', 2, 'ativo'),
  ('SH.03', 'Relações Sociais', 'Família, amizade, vínculos interpessoais.', 'SH', 'SH', 2, 'ativo'),
  ('EQ.02', 'Tempo e Temporalidade', 'Períodos, durações, cronologia, épocas.', 'EQ', 'EQ', 2, 'ativo')
ON CONFLICT (codigo) DO NOTHING;

-- MIGRAR FILHOS PARA NOVOS N2s

-- ALIM → AP.02
UPDATE semantic_tagset 
SET codigo = REPLACE(codigo, 'ALIM.', 'AP.02.')
WHERE codigo LIKE 'ALIM.%';

-- VEST → AP.03
UPDATE semantic_tagset 
SET codigo = REPLACE(codigo, 'VEST.', 'AP.03.')
WHERE codigo LIKE 'VEST.%';

-- REL → CC.05
UPDATE semantic_tagset 
SET codigo = REPLACE(codigo, 'REL.', 'CC.05.')
WHERE codigo LIKE 'REL.%';

-- 08 → SP.01
UPDATE semantic_tagset 
SET codigo = REPLACE(codigo, '08.', 'SP.01.')
WHERE codigo LIKE '08.%';

-- 06 → SH.03
UPDATE semantic_tagset 
SET codigo = REPLACE(codigo, '06.', 'SH.03.')
WHERE codigo LIKE '06.%';

-- TE → EQ.02
UPDATE semantic_tagset 
SET codigo = REPLACE(codigo, 'TE.', 'EQ.02.')
WHERE codigo LIKE 'TE.%';

-- DELETAR N1s ANTIGOS (cascade remove referências)
DELETE FROM semantic_tagset WHERE codigo IN ('ALIM', 'VEST', 'REL', '08', '06', 'TE');

-- DELETAR 03 (Sentimentos duplicado)
DELETE FROM semantic_tagset WHERE codigo = '03';

-- RECALCULAR HIERARQUIAS
SELECT calculate_tagset_hierarchy();