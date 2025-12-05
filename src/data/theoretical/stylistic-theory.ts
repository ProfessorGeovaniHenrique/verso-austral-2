/**
 * 📚 STYLISTIC THEORY FRAMEWORK
 * 
 * Estrutura de dados teóricos baseada em Leech & Short (2007)
 * "Style in Fiction: A Linguistic Introduction to English Fictional Prose"
 */

export interface TheoreticalFramework {
  toolId: string;
  title: string;
  icon: string;
  shortDescription: string;
  detailedTheory: {
    definition: string;
    theoreticalBasis: string;
    keyConceptsEN: string[];
    keyConceptsPT: string[];
    practicalRelevance: string;
  };
  analysisGuide: {
    whatToLookFor: string[];
    interpretationTips: string[];
    commonPatterns: string[];
  };
  exampleQuestions: string[];
  bibliographicReference: string;
}

// ============================================
// PERFIL LÉXICO
// ============================================
export const lexicalTheory: TheoreticalFramework = {
  toolId: 'lexical-profile',
  title: 'Perfil Léxico',
  icon: '📖',
  shortDescription: 'Analisa a riqueza e variedade vocabular através de métricas como Type-Token Ratio (TTR), hapax legomena e densidade lexical, revelando padrões de escolha vocabular característicos do estilo autoral.',
  detailedTheory: {
    definition: 'O perfil léxico examina as escolhas de vocabulário como indicadores de estilo. Segundo Leech & Short (2007), "vocabulary is the most obviously open domain of stylistic study" (p. 61). A análise léxica revela preferências autorais, campos semânticos dominantes e a textura linguística do texto.',
    theoreticalBasis: 'Baseado em Leech & Short (2007), Capítulo 3 "A method of analysis" e seções 2.2-2.10 sobre mensuração quantitativa de estilo. Os autores argumentam que "the lexical character of a text depends [...] on the text\'s semantic structure" (p. 63), estabelecendo a conexão entre vocabulário e significado.',
    keyConceptsEN: ['Type-Token Ratio (TTR)', 'Hapax Legomena', 'Lexical Density', 'Word Frequency', 'Semantic Fields', 'Vocabulary Richness'],
    keyConceptsPT: ['Razão Tipo-Ocorrência', 'Hapax Legomena', 'Densidade Lexical', 'Frequência de Palavras', 'Campos Semânticos', 'Riqueza Vocabular'],
    practicalRelevance: 'Um TTR alto indica maior riqueza vocabular e menor repetição. Alta proporção de hapax (palavras únicas) sugere criatividade lexical ou registro especializado. Densidade lexical alta indica texto mais informativo, enquanto baixa densidade pode indicar oralidade ou informalidade.'
  },
  analysisGuide: {
    whatToLookFor: [
      'TTR > 0.5 indica vocabulário variado e não repetitivo',
      'Alta proporção de hapax legomena sugere inovação lexical',
      'Densidade lexical alta (>50%) = texto mais informativo/formal',
      'Campos semânticos dominantes revelam temas centrais',
      'Palavras concretas vs. abstratas indicam estilo descritivo vs. reflexivo',
      'Repetição intencional pode indicar ênfase ou foregrounding'
    ],
    interpretationTips: [
      'Compare TTR com corpora de referência do mesmo gênero',
      'Hapax frequentes em textos curtos podem ser artefato estatístico',
      'Observe agrupamentos semânticos para identificar isotopias',
      'Verifique se palavras raras são regionalismos ou neologismos'
    ],
    commonPatterns: [
      'Música gaúcha: alto uso de léxico regionalista (coxilha, galpão, rincão)',
      'Abundância de termos de natureza e paisagem pampeana',
      'Vocábulos de lida campeira e tradição (peão, tropeiro, chimarrão)',
      'Empréstimos do espanhol platino (pago, china, querência)'
    ]
  },
  exampleQuestions: [
    'O que a alta frequência de palavras como "coxilha" e "galpão" revela sobre a identidade cultural gaúcha?',
    'Como interpretar a presença de muitos hapax neste corpus?',
    'Quais campos semânticos são mais representativos neste artista?',
    'A densidade lexical sugere um registro mais formal ou informal?'
  ],
  bibliographicReference: 'LEECH, Geoffrey; SHORT, Mick. Style in Fiction: A Linguistic Introduction to English Fictional Prose. 2nd ed. London: Pearson Longman, 2007. Cap. 2-3.'
};

// ============================================
// PERFIL SINTÁTICO
// ============================================
export const syntacticTheory: TheoreticalFramework = {
  toolId: 'syntactic-profile',
  title: 'Perfil Sintático',
  icon: '📊',
  shortDescription: 'Examina estruturas gramaticais, comprimento de sentenças e distribuição de classes de palavras (POS), identificando padrões de complexidade sintática e preferências estruturais do autor.',
  detailedTheory: {
    definition: 'O perfil sintático analisa a estrutura gramatical como elemento de estilo. Leech & Short (2007) afirmam que "sentence structure is [...] a crucial dimension of style" (p. 76). A análise inclui comprimento de sentenças, tipos de orações, voz verbal e densidade de modificadores.',
    theoreticalBasis: 'Fundamentado no Capítulo 4 de Leech & Short (2007), "Grammar and Style", especialmente seções sobre "sentence complexity" (p. 77-82) e "the noun phrase" (p. 82-89). Os autores distinguem complexidade por subordinação vs. coordenação.',
    keyConceptsEN: ['Sentence Length', 'Syntactic Complexity', 'Part-of-Speech Distribution', 'Noun/Verb Ratio', 'Modifier Density', 'Voice (Active/Passive)'],
    keyConceptsPT: ['Comprimento de Sentença', 'Complexidade Sintática', 'Distribuição de POS', 'Razão Substantivo/Verbo', 'Densidade de Modificadores', 'Voz (Ativa/Passiva)'],
    practicalRelevance: 'Sentenças curtas criam ritmo rápido e impacto; sentenças longas permitem elaboração. Alta razão adjetivo/substantivo indica estilo descritivo. Predominância de verbos sugere narrativa orientada à ação.'
  },
  analysisGuide: {
    whatToLookFor: [
      'Comprimento médio de verso: 5-8 palavras típico em música',
      'Alta variação (desvio padrão) indica alternância rítmica',
      'Proporção de substantivos: textos nominais vs. verbais',
      'Densidade de adjetivos: estilo descritivo vs. narrativo',
      'Uso de advérbios: intensificação e modalização',
      'Complexidade sintática: simples vs. elaborada'
    ],
    interpretationTips: [
      'Em letras de música, versos funcionam como "sentenças"',
      'Compare distribuição POS com outros gêneros textuais',
      'Alta razão Adj/Noun pode indicar estilo ornamentado',
      'Verbos no imperativo sugerem interpelação ao ouvinte'
    ],
    commonPatterns: [
      'Música gaúcha: preferência por estruturas nominais descritivas',
      'Versos curtos alternando com refrões mais longos',
      'Abundância de adjetivos qualificativos da paisagem',
      'Estruturas de enumeração em descrições do pampa'
    ]
  },
  exampleQuestions: [
    'O comprimento médio dos versos reflete um estilo mais conciso ou elaborado?',
    'A alta proporção de substantivos indica um foco em descrição?',
    'Como a complexidade sintática varia entre diferentes artistas?',
    'A distribuição de POS sugere um registro oral ou literário?'
  ],
  bibliographicReference: 'LEECH, Geoffrey; SHORT, Mick. Style in Fiction. 2nd ed. London: Pearson Longman, 2007. Cap. 4 "Grammar and Style".'
};

// ============================================
// FIGURAS RETÓRICAS
// ============================================
export const rhetoricalTheory: TheoreticalFramework = {
  toolId: 'rhetorical-figures',
  title: 'Figuras Retóricas',
  icon: '🎭',
  shortDescription: 'Detecta recursos estilísticos como repetição, aliteração, assonância, anáfora e paralelismo, revelando técnicas de foregrounding e efeitos poéticos intencionais.',
  detailedTheory: {
    definition: 'Figuras retóricas são desvios deliberados do uso normal da linguagem com fins expressivos. Leech & Short (2007) as conectam ao conceito de foregrounding: "deviation from some perceived norm" (p. 39). Incluem figuras de som (aliteração, assonância), de construção (paralelismo) e de repetição.',
    theoreticalBasis: 'Baseado no Capítulo 7 de Leech & Short (2007), seções 7.7-7.8 sobre "Repetition and parallelism" e conceitos de iconicidade. Os autores argumentam que "parallelism is a pervasive feature of literary language" (p. 186).',
    keyConceptsEN: ['Repetition', 'Alliteration', 'Assonance', 'Anaphora', 'Parallelism', 'Iconicity', 'Sound Patterning'],
    keyConceptsPT: ['Repetição', 'Aliteração', 'Assonância', 'Anáfora', 'Paralelismo', 'Iconicidade', 'Padrões Sonoros'],
    practicalRelevance: 'Figuras retóricas criam coesão, memorabilidade e impacto emocional. Aliteração e assonância contribuem para a musicalidade. Anáfora cria ênfase e estrutura. Paralelismo estabelece equivalências semânticas.'
  },
  analysisGuide: {
    whatToLookFor: [
      'Repetição: palavras ou estruturas recorrentes (refrão)',
      'Aliteração: repetição de consoantes iniciais (vento, várzea, verso)',
      'Assonância: repetição de vogais (saudade, alma, calma)',
      'Anáfora: repetição no início de versos/estrofes',
      'Paralelismo: estruturas sintáticas equivalentes',
      'Densidade de figuras por 100 palavras'
    ],
    interpretationTips: [
      'Alta densidade indica estilo poético elaborado',
      'Aliteração em /r/ e /s/ comum na poesia gaúcha',
      'Anáforas criam ritmo e expectativa no ouvinte',
      'Observe agrupamentos: figuras isoladas vs. clusters'
    ],
    commonPatterns: [
      'Milongas: uso intenso de aliteração em /r/ (rincão, rio, ronco)',
      'Refrões: paralelismo estrutural típico',
      'Assonância em /a/ evocando amplitude do pampa',
      'Repetição de "querência" como leitmotiv identitário'
    ]
  },
  exampleQuestions: [
    'Quais figuras são mais frequentes neste artista? Isso revela alguma técnica composicional?',
    'A alta densidade de aliteração contribui para a musicalidade?',
    'As anáforas detectadas correspondem aos refrões?',
    'O paralelismo estrutural reforça algum significado específico?'
  ],
  bibliographicReference: 'LEECH, Geoffrey; SHORT, Mick. Style in Fiction. 2nd ed. London: Pearson Longman, 2007. Cap. 7 "Discourse and discourse situation".'
};

// ============================================
// COESÃO
// ============================================
export const cohesionTheory: TheoreticalFramework = {
  toolId: 'cohesion-analysis',
  title: 'Análise de Coesão',
  icon: '🔗',
  shortDescription: 'Investiga mecanismos de conexão textual: conectivos, referência anafórica e cadeias lexicais, mostrando como o texto se articula e mantém continuidade temática.',
  detailedTheory: {
    definition: 'Coesão refere-se aos recursos linguísticos que ligam partes do texto. Leech & Short (2007) discutem coesão no Capítulo 7, enfatizando que "cohesive ties [...] bind a text together" (p. 169). Inclui conectivos, pronomes anafóricos e cadeias de repetição lexical.',
    theoreticalBasis: 'Fundamentado em Halliday & Hasan (1976) "Cohesion in English" via Leech & Short (2007), seção 7.8. Os autores distinguem coesão gramatical (referência, conjunção) de coesão lexical (repetição, sinonímia).',
    keyConceptsEN: ['Connectives', 'Anaphoric Reference', 'Lexical Chains', 'Cohesive Density', 'Conjunctive Relations', 'Thematic Progression'],
    keyConceptsPT: ['Conectivos', 'Referência Anafórica', 'Cadeias Lexicais', 'Densidade Coesiva', 'Relações Conjuntivas', 'Progressão Temática'],
    practicalRelevance: 'Alta coesão facilita compreensão e fluidez. Conectivos revelam relações lógicas (causa, contraste, tempo). Cadeias lexicais indicam isotopias temáticas. Baixa coesão pode indicar fragmentação intencional.'
  },
  analysisGuide: {
    whatToLookFor: [
      'Conectivos aditivos: e, também, ainda, além disso',
      'Conectivos adversativos: mas, porém, entretanto',
      'Conectivos causais: porque, pois, então',
      'Conectivos temporais: quando, depois, enquanto',
      'Pronomes anafóricos: ele, ela, isso, aquilo',
      'Cadeias lexicais: palavras semanticamente relacionadas'
    ],
    interpretationTips: [
      'Em música, conectivos podem ser menos frequentes',
      'Cadeias lexicais revelamcampos semânticos dominantes',
      'Observe se há progressão temática ou circularidade',
      'Conectivos adversativos indicam contrastes significativos'
    ],
    commonPatterns: [
      'Música gaúcha: cadeias lexicais de natureza, tradição, saudade',
      'Uso de "então" e "daí" como marcadores de oralidade',
      'Progressão temática do amanhecer ao anoitecer',
      'Isotopias do campo vs. cidade frequentes'
    ]
  },
  exampleQuestions: [
    'Quais cadeias lexicais são mais salientes neste corpus?',
    'Os conectivos indicam relações de causa-efeito ou contraste?',
    'A coesão é mais gramatical ou lexical neste artista?',
    'Há progressão temática ou estrutura circular nas letras?'
  ],
  bibliographicReference: 'LEECH, Geoffrey; SHORT, Mick. Style in Fiction. 2nd ed. London: Pearson Longman, 2007. Cap. 7.8; HALLIDAY, M.A.K.; HASAN, R. Cohesion in English. London: Longman, 1976.'
};

// ============================================
// FALA E PENSAMENTO
// ============================================
export const speechThoughtTheory: TheoreticalFramework = {
  toolId: 'speech-thought',
  title: 'Fala e Pensamento',
  icon: '💬',
  shortDescription: 'Analisa modos de representação de fala e pensamento: discurso direto (DD), discurso indireto (DI), discurso indireto livre (DIL), revelando perspectiva narrativa e grau de mediação autoral.',
  detailedTheory: {
    definition: 'A representação de fala e pensamento em textos ficcionais envolve um "cline" de categorias. Leech & Short (2007) apresentam um modelo escalar: "from most to least narrator-controlled: NRA < NRSA < IS < FIS < DS < FDS" (p. 260). O mesmo se aplica ao pensamento.',
    theoreticalBasis: 'Capítulo 10 de Leech & Short (2007), "Speech and thought presentation", desenvolvido extensivamente em Semino & Short (2004) "Corpus Stylistics". O modelo distingue 5 categorias principais para fala e 5 para pensamento.',
    keyConceptsEN: ['Direct Speech (DS)', 'Indirect Speech (IS)', 'Free Indirect Speech (FIS)', 'Narrative Report of Speech Acts (NRSA)', 'Free Direct Thought (FDT)'],
    keyConceptsPT: ['Discurso Direto (DD)', 'Discurso Indireto (DI)', 'Discurso Indireto Livre (DIL)', 'Relato de Ato de Fala (RAF)', 'Pensamento Direto Livre (PDL)'],
    practicalRelevance: 'DD cria vivacidade e ilusão de autenticidade. DIL permite ambiguidade entre voz do narrador e personagem. Pensamento interior revela subjetividade. A proporção de categorias indica estilo narrativo.'
  },
  analysisGuide: {
    whatToLookFor: [
      'Discurso Direto: marcado por aspas e verbos dicendi',
      'Discurso Indireto: "disse que...", orações subordinadas',
      'Discurso Indireto Livre: mescla de vozes sem marcadores explícitos',
      'Verbos de fala: dizer, falar, contar, gritar',
      'Verbos de pensamento: pensar, sonhar, lembrar',
      'Proporção fala vs. pensamento'
    ],
    interpretationTips: [
      'Em música, DD pode aparecer em diálogos cantados',
      'Monólogos interiores indicam subjetividade lírica',
      'DIL cria ambiguidade e intimidade com personagem',
      'Verbos de percepção indicam ponto de vista sensorial'
    ],
    commonPatterns: [
      'Música gaúcha: narrativas em 1ª pessoa (monólogo)',
      'Discurso direto em décimas e payadas (diálogos)',
      'Pensamento nostálgico: "lembro", "penso", "sonho"',
      'Interpelação direta ao ouvinte: "tu sabes", "imagine"'
    ]
  },
  exampleQuestions: [
    'A predominância de DD ou DI indica estilo mais dramático ou narrativo?',
    'Há instâncias de DIL que criam ambiguidade de voz?',
    'A representação de pensamento revela subjetividade ou objetividade?',
    'Os verbos de percepção indicam focalização interna?'
  ],
  bibliographicReference: 'LEECH, Geoffrey; SHORT, Mick. Style in Fiction. 2nd ed. London: Pearson Longman, 2007. Cap. 10; SEMINO, E.; SHORT, M. Corpus Stylistics. London: Routledge, 2004.'
};

// ============================================
// MIND STYLE
// ============================================
export const mindStyleTheory: TheoreticalFramework = {
  toolId: 'mind-style',
  title: 'Mind Style',
  icon: '🧠',
  shortDescription: 'Examina a perspectiva cognitiva através de padrões de transitividade (Halliday), agência, modalidade e dêixis, revelando a visão de mundo projetada pelo texto.',
  detailedTheory: {
    definition: 'Mind Style refere-se a "any distinctive linguistic representation of an individual mental self" (Leech & Short 2007, p. 150). Analisa como escolhas linguísticas revelam uma worldview particular através de transitividade, modalidade e perspectiva cognitiva.',
    theoreticalBasis: 'Capítulo 6 de Leech & Short (2007), "Mind style", baseado na teoria de transitividade de Halliday. Os autores distinguem processos materiais, mentais, relacionais, verbais, comportamentais e existenciais.',
    keyConceptsEN: ['Transitivity', 'Agency', 'Modality', 'Deixis', 'Cognitive Perspective', 'Material/Mental Processes'],
    keyConceptsPT: ['Transitividade', 'Agência', 'Modalidade', 'Dêixis', 'Perspectiva Cognitiva', 'Processos Materiais/Mentais'],
    practicalRelevance: 'Predominância de processos materiais indica orientação à ação. Processos mentais revelam interioridade. Modalidade alta indica certeza ou incerteza. Dêixis ancora o texto no espaço-tempo.'
  },
  analysisGuide: {
    whatToLookFor: [
      'Processos materiais: verbos de ação física (correr, cavalgar)',
      'Processos mentais: verbos de cognição/percepção (pensar, ver)',
      'Processos relacionais: verbos de estado (ser, estar)',
      'Modalidade: marcadores de certeza/incerteza (talvez, certamente)',
      'Dêixis: marcadores de pessoa, tempo, lugar (eu, aqui, agora)',
      'Razão percepção/ação: orientação cognitiva'
    ],
    interpretationTips: [
      'Estilo orientado à ação: predominância de processos materiais',
      'Estilo reflexivo: mais processos mentais e relacionais',
      'Alta modalidade epistêmica: texto mais assertivo',
      'Dêixis forte: ancoragem no contexto enunciativo'
    ],
    commonPatterns: [
      'Música gaúcha: equilíbrio entre ação (lida) e reflexão (saudade)',
      'Verbos de movimento: cavalgar, trotar, campear',
      'Verbos de percepção sensorial: ver, ouvir, sentir o pampa',
      'Modalidade deôntica: dever do gaúcho, tradição'
    ]
  },
  exampleQuestions: [
    'O estilo cognitivo é mais orientado à ação ou à percepção?',
    'A distribuição de transitividade revela uma visão de mundo específica?',
    'A modalidade indica certeza, possibilidade ou obrigação?',
    'A dêixis ancora o texto em que espaço-tempo?'
  ],
  bibliographicReference: 'LEECH, Geoffrey; SHORT, Mick. Style in Fiction. 2nd ed. London: Pearson Longman, 2007. Cap. 6 "Mind style"; HALLIDAY, M.A.K. An Introduction to Functional Grammar. London: Arnold, 1994.'
};

// ============================================
// FOREGROUNDING
// ============================================
export const foregroundingTheory: TheoreticalFramework = {
  toolId: 'foregrounding',
  title: 'Foregrounding',
  icon: '✨',
  shortDescription: 'Detecta desvios e paralelismos que criam proeminência estilística, fundamentado na Escola de Praga. Identifica usos da linguagem que se destacam do padrão e capturam a atenção do leitor.',
  detailedTheory: {
    definition: 'Foregrounding é o conceito central da estilística literária: "the technique of making unusual or unexpected use of language" (Leech & Short 2007, p. 39). Inclui desvio (deviation) de normas e paralelismo (parallelism) inesperado.',
    theoreticalBasis: 'Capítulo 4.6 de Leech & Short (2007), baseado nos formalistas russos e na Escola Linguística de Praga (Mukařovský). O conceito de "deautomatization" é central: linguagem que quebra automatismos perceptivos.',
    keyConceptsEN: ['Deviation', 'Parallelism', 'Defamiliarization', 'Deautomatization', 'Norm vs. Deviation', 'Internal/External Deviation'],
    keyConceptsPT: ['Desvio', 'Paralelismo', 'Estranhamento', 'Desautomatização', 'Norma vs. Desvio', 'Desvio Interno/Externo'],
    practicalRelevance: 'Foregrounding atrai atenção e cria significado adicional. Desvio gramatical pode indicar expressividade. Desvio semântico cria metáforas e novos sentidos. Paralelismo cria expectativas e equivalências.'
  },
  analysisGuide: {
    whatToLookFor: [
      'Desvio fonológico: rimas internas, aliteração excessiva',
      'Desvio gramatical: ordem incomum, elipse',
      'Desvio semântico: metáforas, personificação, metonímia',
      'Desvio lexical: neologismos, arcaísmos, regionalismos',
      'Paralelismo: repetição de estruturas com variação',
      'Consistência de desvio: padrão vs. ocasional'
    ],
    interpretationTips: [
      'Desvio interno: contraste dentro do próprio texto',
      'Desvio externo: contraste com normas da língua/gênero',
      'Paralelismo com variação cria ênfase e contraste',
      'Regionalismos podem ser foregrounding para audiência geral'
    ],
    commonPatterns: [
      'Música gaúcha: léxico regionalista como foregrounding',
      'Inversões sintáticas por razões métricas',
      'Metáforas do pampa: campo como liberdade, cavalo como companheiro',
      'Personificação da natureza: "o vento me chamou"'
    ]
  },
  exampleQuestions: [
    'Quais desvios linguísticos são mais frequentes? São intencionais?',
    'O foregrounding léxico (regionalismos) cria que efeito?',
    'Há padrões de paralelismo que estruturam o texto?',
    'Os desvios são consistentes (estilo) ou ocasionais (ênfase)?'
  ],
  bibliographicReference: 'LEECH, Geoffrey; SHORT, Mick. Style in Fiction. 2nd ed. London: Pearson Longman, 2007. Cap. 4.6; MUKAŘOVSKÝ, J. Standard Language and Poetic Language. In: FREEMAN, D. (ed.) Linguistics and Literary Style. New York: Holt, 1970.'
};

// ============================================
// EXPORTAÇÃO CONSOLIDADA
// ============================================
export const allTheories: TheoreticalFramework[] = [
  lexicalTheory,
  syntacticTheory,
  rhetoricalTheory,
  cohesionTheory,
  speechThoughtTheory,
  mindStyleTheory,
  foregroundingTheory
];

export function getTheoryByToolId(toolId: string): TheoreticalFramework | undefined {
  return allTheories.find(t => t.toolId === toolId);
}
