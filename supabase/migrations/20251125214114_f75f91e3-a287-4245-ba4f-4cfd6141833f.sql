-- Implementação da Hierarquia Completa de Natureza e Paisagem (NA)
-- Total: 47 categorias (1 N1 atualizado + 5 N2 + 13 N3 + 28 N4)

-- ============================================================
-- FASE 1: Atualizar N1 existente (NA)
-- ============================================================
UPDATE semantic_tagset
SET 
  descricao = 'Agrupa todos os termos relacionados ao mundo natural, seus componentes, fenômenos e seres vivos (excluindo o ser humano e suas criações diretas).',
  exemplos = ARRAY['sol', 'chuva', 'árvore', 'rio', 'montanha', 'vento', 'cavalo', 'flor']
WHERE codigo = 'NA';

-- ============================================================
-- FASE 2: Inserir 5 domínios N2
-- ============================================================
INSERT INTO semantic_tagset (codigo, nome, nivel_profundidade, categoria_pai, descricao, exemplos, status) VALUES
('NA.FA', 'Fauna (Vida Animal)', 2, 'NA', 'Termos relacionados a animais, suas características, comportamentos e classificações.', ARRAY['cavalo', 'boi', 'quero-quero', 'peixe', 'formiga'], 'ativo'),
('NA.FL', 'Flora (Vida Vegetal)', 2, 'NA', 'Termos relacionados a plantas, árvores, suas partes e formações vegetais.', ARRAY['araucária', 'capim', 'flor', 'pinhão', 'mata'], 'ativo'),
('NA.GE', 'Geografia e Relevo', 2, 'NA', 'Termos relacionados às formas da terra e aos corpos d''água.', ARRAY['coxilha', 'várzea', 'rio', 'arroio', 'serra'], 'ativo'),
('NA.FN', 'Fenômenos Naturais e Atmosféricos', 2, 'NA', 'Termos relacionados ao clima, tempo e eventos da natureza.', ARRAY['chuva', 'vento', 'minuano', 'geada', 'tempestade'], 'ativo'),
('NA.EC', 'Elementos e Cosmos', 2, 'NA', 'Termos para os componentes fundamentais da natureza e o céu.', ARRAY['sol', 'lua', 'estrela', 'terra', 'fogo'], 'ativo')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  exemplos = EXCLUDED.exemplos;

-- ============================================================
-- FASE 3: Inserir 13 domínios N3
-- ============================================================
-- Fauna (3 N3s)
INSERT INTO semantic_tagset (codigo, nome, nivel_profundidade, categoria_pai, descricao, exemplos, status) VALUES
('NA.FA.CL', 'Classificação de Animais', 3, 'NA.FA', 'Categorias e tipos de animais.', ARRAY['mamífero', 'ave', 'réptil', 'peixe', 'inseto'], 'ativo'),
('NA.FA.AN', 'Anatomia e Características Animais', 3, 'NA.FA', 'Partes do corpo, pelagem e sons de animais.', ARRAY['casco', 'crina', 'relincho', 'guampa', 'focinho'], 'ativo'),
('NA.FA.CO', 'Comportamento e Coletivos', 3, 'NA.FA', 'Ações, hábitos e agrupamentos de animais.', ARRAY['rebanho', 'manada', 'pastar', 'ninho', 'tropilha'], 'ativo')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  exemplos = EXCLUDED.exemplos;

-- Flora (3 N3s)
INSERT INTO semantic_tagset (codigo, nome, nivel_profundidade, categoria_pai, descricao, exemplos, status) VALUES
('NA.FL.TP', 'Tipos de Plantas e Vegetação', 3, 'NA.FL', 'Categorias de plantas, flores e frutos.', ARRAY['árvore', 'erva', 'flor', 'fruto', 'capim'], 'ativo'),
('NA.FL.AV', 'Anatomia Vegetal', 3, 'NA.FL', 'Partes que compõem uma planta.', ARRAY['raiz', 'caule', 'folha', 'flor', 'semente'], 'ativo'),
('NA.FL.FV', 'Formações Vegetais (Biomas)', 3, 'NA.FL', 'Grandes áreas de vegetação.', ARRAY['floresta', 'mata', 'campo', 'pampa', 'pastagem'], 'ativo')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  exemplos = EXCLUDED.exemplos;

-- Geografia (3 N3s)
INSERT INTO semantic_tagset (codigo, nome, nivel_profundidade, categoria_pai, descricao, exemplos, status) VALUES
('NA.GE.FR', 'Formas de Relevo', 3, 'NA.GE', 'Configurações da superfície terrestre.', ARRAY['montanha', 'coxilha', 'vale', 'serra', 'planície'], 'ativo'),
('NA.GE.HI', 'Corpos d''Água (Hidrografia)', 3, 'NA.GE', 'Termos para rios, lagos e outras formas de água.', ARRAY['rio', 'arroio', 'lagoa', 'banhado', 'mar'], 'ativo'),
('NA.GE.ME', 'Medidas e Espaço', 3, 'NA.GE', 'Conceitos de dimensão no ambiente natural.', ARRAY['distância', 'extensão', 'profundidade', 'altitude', 'légua'], 'ativo')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  exemplos = EXCLUDED.exemplos;

-- Fenômenos (2 N3s)
INSERT INTO semantic_tagset (codigo, nome, nivel_profundidade, categoria_pai, descricao, exemplos, status) VALUES
('NA.FN.CC', 'Condições Climáticas e Tempo', 3, 'NA.FN', 'Eventos e estados da atmosfera.', ARRAY['chuva', 'vento', 'geada', 'tempestade', 'calor'], 'ativo'),
('NA.FN.CT', 'Ciclos Temporais Naturais', 3, 'NA.FN', 'Divisões de tempo baseadas na natureza.', ARRAY['manhã', 'tarde', 'noite', 'verão', 'inverno'], 'ativo')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  exemplos = EXCLUDED.exemplos;

-- Elementos (2 N3s)
INSERT INTO semantic_tagset (codigo, nome, nivel_profundidade, categoria_pai, descricao, exemplos, status) VALUES
('NA.EC.EF', 'Elementos Fundamentais', 3, 'NA.EC', 'Materiais básicos que compõem o ambiente.', ARRAY['terra', 'fogo', 'pedra', 'barro', 'areia'], 'ativo'),
('NA.EC.CC', 'Corpos Celestes e Céu', 3, 'NA.EC', 'Termos relacionados ao espaço sideral visível.', ARRAY['sol', 'lua', 'estrela', 'céu', 'horizonte'], 'ativo')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  exemplos = EXCLUDED.exemplos;

-- ============================================================
-- FASE 4: Inserir 28 domínios N4
-- ============================================================
-- Fauna > Classificação (5 N4s)
INSERT INTO semantic_tagset (codigo, nome, nivel_profundidade, categoria_pai, descricao, exemplos, status) VALUES
('NA.FA.CL.MA', 'Mamíferos', 4, 'NA.FA.CL', 'Animais mamíferos.', ARRAY['cavalo', 'boi', 'onça', 'capivara', 'ovelha'], 'ativo'),
('NA.FA.CL.AV', 'Aves', 4, 'NA.FA.CL', 'Aves e pássaros.', ARRAY['quero-quero', 'sabiá', 'ema', 'seriema', 'gaivota'], 'ativo'),
('NA.FA.CL.RE', 'Répteis e Anfíbios', 4, 'NA.FA.CL', 'Répteis e anfíbios.', ARRAY['jacaré', 'cobra', 'sapo', 'lagarto', 'rã'], 'ativo'),
('NA.FA.CL.PE', 'Peixes', 4, 'NA.FA.CL', 'Peixes e animais aquáticos.', ARRAY['dourado', 'lambari', 'traíra', 'bagre', 'jundiá'], 'ativo'),
('NA.FA.CL.IN', 'Insetos e Artrópodes', 4, 'NA.FA.CL', 'Insetos, aracnídeos e artrópodes.', ARRAY['formiga', 'borboleta', 'aranha', 'carrapato', 'abelha'], 'ativo')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  exemplos = EXCLUDED.exemplos;

-- Fauna > Anatomia (3 N4s)
INSERT INTO semantic_tagset (codigo, nome, nivel_profundidade, categoria_pai, descricao, exemplos, status) VALUES
('NA.FA.AN.PC', 'Partes do Corpo', 4, 'NA.FA.AN', 'Partes do corpo animal.', ARRAY['casco', 'chifre', 'cernelha', 'garupa', 'focinho', 'guampa'], 'ativo'),
('NA.FA.AN.PP', 'Pelagem e Plumagem', 4, 'NA.FA.AN', 'Características de pelagem e plumagem.', ARRAY['pelagem', 'crina', 'pelo', 'pena', 'plumagem', 'rosilho', 'zaino'], 'ativo'),
('NA.FA.AN.SV', 'Sons e Vocalizações', 4, 'NA.FA.AN', 'Sons emitidos por animais.', ARRAY['mugido', 'relincho', 'piado', 'zurro', 'uivo'], 'ativo')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  exemplos = EXCLUDED.exemplos;

-- Fauna > Comportamento (3 N4s)
INSERT INTO semantic_tagset (codigo, nome, nivel_profundidade, categoria_pai, descricao, exemplos, status) VALUES
('NA.FA.CO.CT', 'Coletivos', 4, 'NA.FA.CO', 'Agrupamentos de animais.', ARRAY['rebanho', 'manada', 'cardume', 'bando', 'tropilha', 'boiada'], 'ativo'),
('NA.FA.CO.AH', 'Ações e Hábitos', 4, 'NA.FA.CO', 'Comportamentos e ações animais.', ARRAY['pastar', 'hibernar', 'migrar', 'ruminar', 'galopar'], 'ativo'),
('NA.FA.CO.HA', 'Habitats e Abrigos', 4, 'NA.FA.CO', 'Locais de moradia animal.', ARRAY['ninho', 'toca', 'colmeia', 'formigueiro', 'currais'], 'ativo')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  exemplos = EXCLUDED.exemplos;

-- Flora > Tipos (4 N4s)
INSERT INTO semantic_tagset (codigo, nome, nivel_profundidade, categoria_pai, descricao, exemplos, status) VALUES
('NA.FL.TP.AR', 'Árvores e Arbustos', 4, 'NA.FL.TP', 'Árvores e arbustos.', ARRAY['araucária', 'ipê', 'pitangueira', 'aroeira', 'tarumã'], 'ativo'),
('NA.FL.TP.EG', 'Ervas e Gramíneas', 4, 'NA.FL.TP', 'Plantas herbáceas e gramíneas.', ARRAY['capim', 'samambaia', 'trevo', 'grama', 'maçanilha'], 'ativo'),
('NA.FL.TP.FL', 'Flores', 4, 'NA.FL.TP', 'Flores ornamentais e silvestres.', ARRAY['orquídea', 'margarida', 'brinco-de-princesa', 'rosa', 'cravo'], 'ativo'),
('NA.FL.TP.FR', 'Frutos', 4, 'NA.FL.TP', 'Frutos comestíveis e silvestres.', ARRAY['maçã', 'pinhão', 'butiá', 'bergamota', 'araçá'], 'ativo')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  exemplos = EXCLUDED.exemplos;

-- Flora > Anatomia (2 N4s)
INSERT INTO semantic_tagset (codigo, nome, nivel_profundidade, categoria_pai, descricao, exemplos, status) VALUES
('NA.FL.AV.EP', 'Estruturas Principais', 4, 'NA.FL.AV', 'Partes principais de plantas.', ARRAY['raiz', 'caule', 'tronco', 'galho', 'copa'], 'ativo'),
('NA.FL.AV.PM', 'Partes Menores', 4, 'NA.FL.AV', 'Partes menores de plantas.', ARRAY['folha', 'flor', 'semente', 'espinho', 'casca'], 'ativo')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  exemplos = EXCLUDED.exemplos;

-- Flora > Formações (2 N4s)
INSERT INTO semantic_tagset (codigo, nome, nivel_profundidade, categoria_pai, descricao, exemplos, status) VALUES
('NA.FL.FV.TM', 'Tipos de Mata', 4, 'NA.FL.FV', 'Formações florestais.', ARRAY['floresta', 'mata', 'capoeira', 'bosque', 'selva'], 'ativo'),
('NA.FL.FV.CP', 'Campos e Planícies', 4, 'NA.FL.FV', 'Formações campestres.', ARRAY['campo', 'pampa', 'campina', 'pastagem', 'várzea'], 'ativo')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  exemplos = EXCLUDED.exemplos;

-- Geografia > Relevo (3 N4s)
INSERT INTO semantic_tagset (codigo, nome, nivel_profundidade, categoria_pai, descricao, exemplos, status) VALUES
('NA.GE.FR.EL', 'Elevações', 4, 'NA.GE.FR', 'Formas elevadas do relevo.', ARRAY['montanha', 'morro', 'serra', 'coxilha', 'colina'], 'ativo'),
('NA.GE.FR.PV', 'Planícies e Vales', 4, 'NA.GE.FR', 'Áreas planas e depressões.', ARRAY['planície', 'pampa', 'várzea', 'vale', 'baixada'], 'ativo'),
('NA.GE.FR.AG', 'Acidentes Geográficos', 4, 'NA.GE.FR', 'Formações geográficas especiais.', ARRAY['cânion', 'penhasco', 'grota', 'desfiladeiro', 'ravina'], 'ativo')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  exemplos = EXCLUDED.exemplos;

-- Geografia > Hidrografia (3 N4s)
INSERT INTO semantic_tagset (codigo, nome, nivel_profundidade, categoria_pai, descricao, exemplos, status) VALUES
('NA.GE.HI.AC', 'Água Corrente', 4, 'NA.GE.HI', 'Corpos d''água em movimento.', ARRAY['rio', 'riacho', 'arroio', 'sanga', 'córrego'], 'ativo'),
('NA.GE.HI.AP', 'Água Parada', 4, 'NA.GE.HI', 'Corpos d''água estagnada.', ARRAY['lago', 'lagoa', 'açude', 'banhado', 'pântano'], 'ativo'),
('NA.GE.HI.OM', 'Oceano e Mar', 4, 'NA.GE.HI', 'Massas de água marinha.', ARRAY['mar', 'oceano', 'costa', 'litoral', 'praia'], 'ativo')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  exemplos = EXCLUDED.exemplos;

-- Geografia > Medidas (1 N4)
INSERT INTO semantic_tagset (codigo, nome, nivel_profundidade, categoria_pai, descricao, exemplos, status) VALUES
('NA.GE.ME.DI', 'Dimensões', 4, 'NA.GE.ME', 'Medidas espaciais naturais.', ARRAY['distância', 'extensão', 'profundidade', 'altitude', 'légua'], 'ativo')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  exemplos = EXCLUDED.exemplos;

-- Fenômenos > Climáticas (4 N4s)
INSERT INTO semantic_tagset (codigo, nome, nivel_profundidade, categoria_pai, descricao, exemplos, status) VALUES
('NA.FN.CC.PR', 'Precipitação', 4, 'NA.FN.CC', 'Formas de precipitação.', ARRAY['chuva', 'garoa', 'geada', 'neve', 'sereno', 'orvalho'], 'ativo'),
('NA.FN.CC.VT', 'Ventos e Tempestades', 4, 'NA.FN.CC', 'Ventos e eventos tempestuosos.', ARRAY['vento', 'brisa', 'minuano', 'tempestade', 'vendaval'], 'ativo'),
('NA.FN.CC.TS', 'Temperatura e Sensação', 4, 'NA.FN.CC', 'Sensações térmicas.', ARRAY['calor', 'frio', 'mormaço', 'aragem', 'quentura'], 'ativo'),
('NA.FN.CC.FO', 'Fenômenos Ópticos', 4, 'NA.FN.CC', 'Fenômenos visuais atmosféricos.', ARRAY['arco-íris', 'aurora', 'relâmpago', 'raio', 'trovão'], 'ativo')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  exemplos = EXCLUDED.exemplos;

-- Fenômenos > Ciclos (2 N4s)
INSERT INTO semantic_tagset (codigo, nome, nivel_profundidade, categoria_pai, descricao, exemplos, status) VALUES
('NA.FN.CT.PD', 'Partes do Dia', 4, 'NA.FN.CT', 'Divisões do dia.', ARRAY['manhã', 'tarde', 'noite', 'madrugada', 'crepúsculo', 'alvorada'], 'ativo'),
('NA.FN.CT.EA', 'Estações do Ano', 4, 'NA.FN.CT', 'Estações climáticas.', ARRAY['verão', 'outono', 'inverno', 'primavera'], 'ativo')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  exemplos = EXCLUDED.exemplos;

-- Elementos > Fundamentais (3 N4s)
INSERT INTO semantic_tagset (codigo, nome, nivel_profundidade, categoria_pai, descricao, exemplos, status) VALUES
('NA.EC.EF.TS', 'Terra e Solo', 4, 'NA.EC.EF', 'Terra, solo e materiais terrosos.', ARRAY['terra', 'chão', 'solo', 'poeira', 'barro', 'areia'], 'ativo'),
('NA.EC.EF.FO', 'Fogo', 4, 'NA.EC.EF', 'Fogo e elementos ígneos.', ARRAY['fogo', 'brasa', 'chama', 'labareda', 'incêndio'], 'ativo'),
('NA.EC.EF.PR', 'Pedra e Rocha', 4, 'NA.EC.EF', 'Materiais rochosos.', ARRAY['pedra', 'rocha', 'seixo', 'cascalho', 'granito'], 'ativo')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  exemplos = EXCLUDED.exemplos;

-- Elementos > Cosmos (2 N4s)
INSERT INTO semantic_tagset (codigo, nome, nivel_profundidade, categoria_pai, descricao, exemplos, status) VALUES
('NA.EC.CC.AS', 'Astros', 4, 'NA.EC.CC', 'Corpos celestes.', ARRAY['sol', 'lua', 'estrela', 'cometa', 'planeta'], 'ativo'),
('NA.EC.CC.EF', 'Espaço e Firmamento', 4, 'NA.EC.CC', 'Espaço sideral e céu.', ARRAY['céu', 'firmamento', 'universo', 'horizonte', 'galáxia'], 'ativo')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  exemplos = EXCLUDED.exemplos;

-- ============================================================
-- FASE 5: Recalcular hierarquia completa
-- ============================================================
SELECT calculate_tagset_hierarchy();

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
-- Contar categorias por nível
SELECT 
  nivel_profundidade,
  COUNT(*) as total,
  STRING_AGG(codigo, ', ' ORDER BY codigo) as codigos
FROM semantic_tagset
WHERE codigo LIKE 'NA%'
GROUP BY nivel_profundidade
ORDER BY nivel_profundidade;