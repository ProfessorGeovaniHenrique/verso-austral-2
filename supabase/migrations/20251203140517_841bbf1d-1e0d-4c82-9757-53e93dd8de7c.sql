-- Cadastrar novos domínios semânticos EQ.QA.RP e EQ.QA.RP.PP

-- N3: Qualidades de Relação e Posse
INSERT INTO semantic_tagset (codigo, nome, descricao, nivel_profundidade, categoria_pai, exemplos, status)
VALUES (
  'EQ.QA.RP', 
  'Qualidades de Relação e Posse',
  'Atributos que descrevem a relação de pertencimento, propriedade ou associação de um ser ou objeto em relação a outro.',
  3, 
  'EQ.QA',
  ARRAY['alheio', 'próprio', 'comum'],
  'ativo'
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  exemplos = EXCLUDED.exemplos;

-- N4: Relação de Posse e Pertencimento
INSERT INTO semantic_tagset (codigo, nome, descricao, nivel_profundidade, categoria_pai, exemplos, status)
VALUES (
  'EQ.QA.RP.PP',
  'Relação de Posse e Pertencimento',
  'Descreve a quem algo pertence ou se é compartilhado.',
  4,
  'EQ.QA.RP',
  ARRAY['alheio', 'próprio', 'pessoal', 'privado', 'público', 'comum', 'coletivo'],
  'ativo'
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  exemplos = EXCLUDED.exemplos;

-- Recalcular hierarquia dos tagsets
SELECT calculate_tagset_hierarchy();