-- ========================================
-- FASE 1: BACKUP E LIMPEZA COMPLETA
-- ========================================

-- Backup preventivo de todos os tagsets com código 05%
CREATE TEMP TABLE backup_sentimentos_tagsets AS
SELECT * FROM semantic_tagset WHERE codigo LIKE '05%';

-- Remover TODOS os tagsets com código começando em 05 (incluindo 05, 05.01, 05.03, etc.)
DELETE FROM semantic_tagset WHERE codigo LIKE '05%';

-- ========================================
-- FASE 2: INSERIR N1 - SENTIMENTOS
-- ========================================

INSERT INTO semantic_tagset (
  codigo, nome, descricao, categoria_pai, tagset_pai, 
  nivel_profundidade, status, exemplos, aprovado_em, aprovado_por
) VALUES (
  '05',
  'Sentimentos',
  'Agrupa termos que descrevem estados emocionais, afetivos e de humor do ser humano, abrangendo desde reações primárias e instintivas até sentimentos sociais e cognitivos complexos.',
  NULL,
  NULL,
  1,
  'ativo',
  ARRAY['alegria', 'tristeza', 'raiva', 'medo', 'amor', 'saudade', 'orgulho', 'vergonha'],
  NOW(),
  NULL
);

-- ========================================
-- FASE 3: INSERIR N2 - 6 CATEGORIAS
-- ========================================

INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.01', 'Alegria e Bem-Estar', 'Sentimentos positivos relacionados à satisfação, prazer e contentamento.', '05', 2, 'ativo', ARRAY['alegria', 'felicidade', 'contentamento', 'prazer', 'paz'], NOW(), NULL),
('05.02', 'Tristeza e Desamparo', 'Sentimentos negativos associados à perda, dor, desapontamento e solidão.', '05', 2, 'ativo', ARRAY['tristeza', 'saudade', 'melancolia', 'dor', 'desespero'], NOW(), NULL),
('05.03', 'Raiva e Hostilidade', 'Sentimentos de antagonismo, irritação e agressividade em resposta a uma ofensa, ameaça ou frustração.', '05', 2, 'ativo', ARRAY['raiva', 'fúria', 'irritação', 'ódio', 'ressentimento'], NOW(), NULL),
('05.04', 'Medo e Ansiedade', 'Sentimentos de apreensão e agitação em resposta a uma ameaça percebida, seja ela real ou imaginária.', '05', 2, 'ativo', ARRAY['medo', 'ansiedade', 'pavor', 'receio', 'preocupação'], NOW(), NULL),
('05.05', 'Amor e Afeição', 'Sentimentos positivos direcionados a outros seres, relacionados à conexão, cuidado e apreciação.', '05', 2, 'ativo', ARRAY['amor', 'carinho', 'paixão', 'ternura', 'gratidão'], NOW(), NULL),
('05.06', 'Estados Cognitivos e Sociais', 'Sentimentos complexos que emergem da autoavaliação, da interação social e da reação ao inesperado.', '05', 2, 'ativo', ARRAY['confiança', 'vergonha', 'surpresa', 'curiosidade', 'desprezo'], NOW(), NULL);

-- ========================================
-- FASE 4: INSERIR N3 - 16 CATEGORIAS
-- ========================================

-- N3 sob 05.01 (Alegria e Bem-Estar)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.01.01', 'Euforia e Excitação', 'Estados de alegria intensa, de alta energia e celebração.', '05.01', 3, 'ativo', ARRAY['euforia', 'júbilo', 'entusiasmo', 'exaltação'], NOW(), NULL),
('05.01.02', 'Contentamento e Serenidade', 'Estados de bem-estar calmo, paz interior e satisfação tranquila.', '05.01', 3, 'ativo', ARRAY['paz', 'serenidade', 'calma', 'tranquilidade', 'sossego'], NOW(), NULL),
('05.01.03', 'Diversão e Prazer', 'Sentimentos ligados ao entretenimento, humor e deleite.', '05.01', 3, 'ativo', ARRAY['graça', 'humor', 'diversão', 'riso', 'prazer'], NOW(), NULL);

-- N3 sob 05.02 (Tristeza e Desamparo)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.02.01', 'Melancolia e Desânimo', 'Estados de tristeza de baixa intensidade, falta de energia e motivação.', '05.02', 3, 'ativo', ARRAY['melancolia', 'desânimo', 'abatimento', 'desalento'], NOW(), NULL),
('05.02.02', 'Sofrimento e Dor Emocional', 'Estados de tristeza profunda, aguda e muitas vezes avassaladora.', '05.02', 3, 'ativo', ARRAY['dor', 'sofrimento', 'angústia', 'desespero', 'amargura'], NOW(), NULL),
('05.02.03', 'Nostalgia e Saudade', 'Tristeza relacionada à ausência ou à lembrança do passado.', '05.02', 3, 'ativo', ARRAY['saudade', 'nostalgia', 'falta', 'ausência', 'lembrança'], NOW(), NULL);

-- N3 sob 05.03 (Raiva e Hostilidade)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.03.01', 'Irritação e Frustração', 'Estados de raiva de baixa a média intensidade, impaciência e aborrecimento.', '05.03', 3, 'ativo', ARRAY['irritação', 'chateação', 'aborrecimento', 'impaciência', 'frustração'], NOW(), NULL),
('05.03.02', 'Fúria e Ódio', 'Estados de raiva extrema, intensa e muitas vezes incontrolável.', '05.03', 3, 'ativo', ARRAY['raiva', 'fúria', 'ira', 'ódio', 'cólera', 'indignação'], NOW(), NULL),
('05.03.03', 'Ressentimento e Mágoa', 'Raiva internalizada e duradoura, relacionada a uma ofensa passada.', '05.03', 3, 'ativo', ARRAY['ressentimento', 'mágoa', 'rancor', 'despeito', 'amargura'], NOW(), NULL);

-- N3 sob 05.04 (Medo e Ansiedade)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.04.01', 'Pavor e Terror', 'Medo agudo e intenso diante de um perigo imediato e concreto.', '05.04', 3, 'ativo', ARRAY['medo', 'pavor', 'terror', 'pânico', 'susto', 'horror'], NOW(), NULL),
('05.04.02', 'Preocupação e Ansiedade', 'Medo difuso e persistente, geralmente focado em ameaças futuras ou incertas.', '05.04', 3, 'ativo', ARRAY['ansiedade', 'preocupação', 'apreensão', 'nervosismo', 'aflição'], NOW(), NULL),
('05.04.03', 'Insegurança e Receio', 'Medo de baixa intensidade, hesitação diante do desconhecido ou da possibilidade de falha.', '05.04', 3, 'ativo', ARRAY['receio', 'insegurança', 'cautela', 'timidez', 'hesitação'], NOW(), NULL);

-- N3 sob 05.05 (Amor e Afeição)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.05.01', 'Carinho e Ternura', 'Afeto gentil, cuidado e apreço por familiares e amigos.', '05.05', 3, 'ativo', ARRAY['carinho', 'afeto', 'ternura', 'amizade', 'apreço'], NOW(), NULL),
('05.05.02', 'Paixão e Desejo', 'Amor romântico e intenso, atração e desejo.', '05.05', 3, 'ativo', ARRAY['amor', 'paixão', 'desejo', 'atração', 'adoração'], NOW(), NULL),
('05.05.03', 'Empatia e Compaixão', 'Sentimentos de conexão com o estado emocional de outra pessoa, especialmente o sofrimento.', '05.05', 3, 'ativo', ARRAY['empatia', 'compaixão', 'piedade', 'solidariedade'], NOW(), NULL),
('05.05.04', 'Admiração e Gratidão', 'Sentimentos positivos em reconhecimento às qualidades ou ações de alguém.', '05.05', 3, 'ativo', ARRAY['admiração', 'respeito', 'gratidão', 'apreço', 'reverência'], NOW(), NULL);

-- N3 sob 05.06 (Estados Cognitivos e Sociais)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.06.01', 'Confiança e Otimismo', 'Sentimentos relacionados à crença positiva em si mesmo, nos outros ou no futuro.', '05.06', 3, 'ativo', ARRAY['confiança', 'fé', 'esperança', 'otimismo', 'segurança'], NOW(), NULL),
('05.06.02', 'Vergonha e Culpa', 'Sentimentos negativos decorrentes da percepção de uma falha pessoal ou transgressão social.', '05.06', 3, 'ativo', ARRAY['vergonha', 'culpa', 'remorso', 'constrangimento', 'humilhação'], NOW(), NULL),
('05.06.03', 'Surpresa e Curiosidade', 'Reações a eventos inesperados ou ao desconhecido.', '05.06', 3, 'ativo', ARRAY['surpresa', 'espanto', 'assombro', 'choque', 'curiosidade'], NOW(), NULL),
('05.06.04', 'Desprezo e Aversão', 'Sentimentos de repulsa ou superioridade moral em relação a algo ou alguém.', '05.06', 3, 'ativo', ARRAY['nojo', 'aversão', 'repulsa', 'desprezo', 'desdém'], NOW(), NULL);

-- ========================================
-- FASE 5: INSERIR N4 - 27 CATEGORIAS
-- ========================================

-- N4 sob 05.01.01 (Euforia e Excitação)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.01.01.01', 'Felicidade e Entusiasmo', 'Sentimentos de alegria intensa, energia positiva e celebração.', '05.01.01', 4, 'ativo', ARRAY['alegria', 'felicidade', 'euforia', 'júbilo', 'entusiasmo', 'exaltação'], NOW(), NULL);

-- N4 sob 05.01.02 (Contentamento e Serenidade)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.01.02.01', 'Paz e Tranquilidade', 'Estados de bem-estar calmo e paz interior.', '05.01.02', 4, 'ativo', ARRAY['paz', 'serenidade', 'calma', 'tranquilidade', 'sossego', 'quietude'], NOW(), NULL),
('05.01.02.02', 'Satisfação e Realização', 'Sentimentos de contentamento e orgulho por conquistas.', '05.01.02', 4, 'ativo', ARRAY['satisfação', 'contentamento', 'orgulho', 'realização', 'plenitude'], NOW(), NULL);

-- N4 sob 05.01.03 (Diversão e Prazer)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.01.03.01', 'Humor e Riso', 'Sentimentos ligados ao entretenimento e ao cômico.', '05.01.03', 4, 'ativo', ARRAY['graça', 'humor', 'diversão', 'riso', 'gargalhada', 'alegria'], NOW(), NULL);

-- N4 sob 05.02.01 (Melancolia e Desânimo)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.02.01.01', 'Tristeza e Abatimento', 'Estados de tristeza de baixa intensidade e falta de motivação.', '05.02.01', 4, 'ativo', ARRAY['tristeza', 'desânimo', 'melancolia', 'abatimento', 'desalento', 'desencanto'], NOW(), NULL);

-- N4 sob 05.02.02 (Sofrimento e Dor Emocional)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.02.02.01', 'Angústia e Desespero', 'Estados de tristeza profunda e avassaladora.', '05.02.02', 4, 'ativo', ARRAY['dor', 'sofrimento', 'angústia', 'desespero', 'amargura', 'tormento'], NOW(), NULL);

-- N4 sob 05.02.03 (Nostalgia e Saudade)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.02.03.01', 'Saudade e Falta', 'Tristeza pela ausência ou lembrança do passado.', '05.02.03', 4, 'ativo', ARRAY['saudade', 'nostalgia', 'falta', 'ausência', 'lembrança', 'saudosismo'], NOW(), NULL);

-- N4 sob 05.03.01 (Irritação e Frustração)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.03.01.01', 'Aborrecimento e Impaciência', 'Estados de raiva leve e impaciência.', '05.03.01', 4, 'ativo', ARRAY['irritação', 'chateação', 'aborrecimento', 'impaciência', 'frustração'], NOW(), NULL);

-- N4 sob 05.03.02 (Fúria e Ódio)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.03.02.01', 'Ira e Cólera', 'Estados de raiva extrema e incontrolável.', '05.03.02', 4, 'ativo', ARRAY['raiva', 'fúria', 'ira', 'ódio', 'cólera', 'indignação', 'revolta'], NOW(), NULL);

-- N4 sob 05.03.03 (Ressentimento e Mágoa)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.03.03.01', 'Rancor e Amargura', 'Raiva internalizada e duradoura por ofensas passadas.', '05.03.03', 4, 'ativo', ARRAY['ressentimento', 'mágoa', 'rancor', 'despeito', 'amargura', 'vingança'], NOW(), NULL);

-- N4 sob 05.04.01 (Pavor e Terror)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.04.01.01', 'Pânico e Susto', 'Medo agudo e intenso diante de perigo imediato.', '05.04.01', 4, 'ativo', ARRAY['medo', 'pavor', 'terror', 'pânico', 'susto', 'horror', 'espanto'], NOW(), NULL);

-- N4 sob 05.04.02 (Preocupação e Ansiedade)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.04.02.01', 'Apreensão e Nervosismo', 'Medo difuso focado em ameaças futuras ou incertas.', '05.04.02', 4, 'ativo', ARRAY['ansiedade', 'preocupação', 'apreensão', 'nervosismo', 'aflição', 'inquietação'], NOW(), NULL);

-- N4 sob 05.04.03 (Insegurança e Receio)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.04.03.01', 'Hesitação e Cautela', 'Medo de baixa intensidade, hesitação diante do desconhecido.', '05.04.03', 4, 'ativo', ARRAY['receio', 'insegurança', 'cautela', 'timidez', 'hesitação', 'dúvida'], NOW(), NULL);

-- N4 sob 05.05.01 (Carinho e Ternura)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.05.01.01', 'Afeto e Cuidado', 'Afeto gentil e cuidado por familiares e amigos.', '05.05.01', 4, 'ativo', ARRAY['carinho', 'afeto', 'ternura', 'amizade', 'apreço', 'cuidado'], NOW(), NULL);

-- N4 sob 05.05.02 (Paixão e Desejo)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.05.02.01', 'Amor Romântico', 'Amor romântico intenso, atração e desejo.', '05.05.02', 4, 'ativo', ARRAY['amor', 'paixão', 'desejo', 'atração', 'adoração', 'encantamento'], NOW(), NULL);

-- N4 sob 05.05.03 (Empatia e Compaixão)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.05.03.01', 'Solidariedade e Piedade', 'Conexão emocional com o sofrimento alheio.', '05.05.03', 4, 'ativo', ARRAY['empatia', 'compaixão', 'piedade', 'solidariedade', 'comiseração'], NOW(), NULL);

-- N4 sob 05.05.04 (Admiração e Gratidão)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.05.04.01', 'Respeito e Apreço', 'Reconhecimento das qualidades ou ações de alguém.', '05.05.04', 4, 'ativo', ARRAY['admiração', 'respeito', 'gratidão', 'apreço', 'reverência', 'reconhecimento'], NOW(), NULL);

-- N4 sob 05.06.01 (Confiança e Otimismo)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.06.01.01', 'Esperança e Fé', 'Crença positiva no futuro e em si mesmo.', '05.06.01', 4, 'ativo', ARRAY['confiança', 'fé', 'esperança', 'otimismo', 'segurança', 'certeza'], NOW(), NULL);

-- N4 sob 05.06.02 (Vergonha e Culpa)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.06.02.01', 'Remorso e Constrangimento', 'Sentimentos negativos por falha pessoal ou transgressão social.', '05.06.02', 4, 'ativo', ARRAY['vergonha', 'culpa', 'remorso', 'constrangimento', 'humilhação', 'arrependimento'], NOW(), NULL);

-- N4 sob 05.06.03 (Surpresa e Curiosidade)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.06.03.01', 'Espanto e Assombro', 'Reações a eventos inesperados ou surpreendentes.', '05.06.03', 4, 'ativo', ARRAY['surpresa', 'espanto', 'assombro', 'choque', 'perplexidade'], NOW(), NULL),
('05.06.03.02', 'Interesse e Fascínio', 'Curiosidade e atração pelo desconhecido.', '05.06.03', 4, 'ativo', ARRAY['curiosidade', 'interesse', 'fascínio', 'admiração', 'encantamento'], NOW(), NULL);

-- N4 sob 05.06.04 (Desprezo e Aversão)
INSERT INTO semantic_tagset (codigo, nome, descricao, categoria_pai, nivel_profundidade, status, exemplos, aprovado_em, aprovado_por) VALUES
('05.06.04.01', 'Nojo e Repulsa', 'Sentimentos de repulsa física ou emocional.', '05.06.04', 4, 'ativo', ARRAY['nojo', 'aversão', 'repulsa', 'asco', 'repugnância'], NOW(), NULL),
('05.06.04.02', 'Desdém e Desprezo', 'Sentimentos de superioridade moral ou desprezo por algo/alguém.', '05.06.04', 4, 'ativo', ARRAY['desprezo', 'desdém', 'escárnio', 'menosprezo', 'zombaria'], NOW(), NULL);

-- ========================================
-- FASE 6: RECALCULAR HIERARQUIA
-- ========================================

-- Executar função para atualizar campos derivados (tagset_pai, hierarquia_completa, codigo_nivel_X)
SELECT calculate_tagset_hierarchy();

-- ========================================
-- RELATÓRIO FINAL
-- ========================================

-- Contar registros inseridos por nível
DO $$
DECLARE
  count_n1 INTEGER;
  count_n2 INTEGER;
  count_n3 INTEGER;
  count_n4 INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_n1 FROM semantic_tagset WHERE codigo = '05';
  SELECT COUNT(*) INTO count_n2 FROM semantic_tagset WHERE codigo LIKE '05.__' AND codigo NOT LIKE '05.__.%';
  SELECT COUNT(*) INTO count_n3 FROM semantic_tagset WHERE codigo LIKE '05.__.%' AND codigo NOT LIKE '05.__.__.%';
  SELECT COUNT(*) INTO count_n4 FROM semantic_tagset WHERE codigo LIKE '05.__.__.%';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRAÇÃO DS SENTIMENTOS CONCLUÍDA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'N1 (Sentimentos): % categoria', count_n1;
  RAISE NOTICE 'N2 (6 domínios): % categorias', count_n2;
  RAISE NOTICE 'N3 (16 subcategorias): % categorias', count_n3;
  RAISE NOTICE 'N4 (27 categorias específicas): % categorias', count_n4;
  RAISE NOTICE 'TOTAL: % categorias inseridas', (count_n1 + count_n2 + count_n3 + count_n4);
  RAISE NOTICE '========================================';
END $$;