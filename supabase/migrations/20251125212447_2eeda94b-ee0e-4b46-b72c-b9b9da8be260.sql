-- Criar 4 novos superdomínios N1
INSERT INTO semantic_tagset (codigo, nome, descricao, nivel_profundidade, categoria_pai, tagset_pai, status)
VALUES 
  ('AP', 'Atividades e Práticas Sociais', 'Trabalho, alimentação, vestuário, lazer, transporte.', 1, NULL, NULL, 'ativo'),
  ('CC', 'Cultura e Conhecimento', 'Arte, ciência, educação, comunicação, religiosidade.', 1, NULL, NULL, 'ativo'),
  ('SP', 'Sociedade e Organização Política', 'Poder, leis, governo, organização social.', 1, NULL, NULL, 'ativo'),
  ('SB', 'Saúde e Bem-Estar', 'Medicina, psicologia, bem-estar físico/mental.', 1, NULL, NULL, 'ativo')
ON CONFLICT (codigo) DO NOTHING;

-- Atualizar descrições dos N1s existentes
UPDATE semantic_tagset SET descricao = 'Mundo natural, seres vivos, geografia, fenômenos atmosféricos, cosmos.' WHERE codigo = 'NA';
UPDATE semantic_tagset SET descricao = 'Indivíduo biológico, ciclos de vida, anatomia, relações interpessoais.' WHERE codigo = 'SH';
UPDATE semantic_tagset SET descricao = 'Construções, infraestruturas, lugares definidos pela ação humana.' WHERE codigo = 'EL';
UPDATE semantic_tagset SET descricao = 'Ideias, princípios, valores, conceitos filosóficos sem forma física.' WHERE codigo = 'AB';

-- Marcar N1s numéricos obsoletos
UPDATE semantic_tagset SET status = 'descontinuado' WHERE codigo IN ('01','02','03','06','07','08','10');