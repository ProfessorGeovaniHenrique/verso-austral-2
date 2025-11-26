/**
 * Stylistic Tools Methodology - Leech & Short (2007) + Corpus Stylistics
 * Complete documentation of stylistic analysis framework and Verso Austral implementation
 */

export interface StylisticsTool {
  id: string;
  name: string;
  theoreticalBasis: string;
  purpose: string;
  implementation: string;
  metrics: string[];
  references: string[];
}

export interface StylisticsTheory {
  framework: string;
  keyWorks: string[];
  coreLevel: {
    name: string;
    description: string;
    components: string[];
  }[];
  principles: string[];
  references: string[];
}

export const leechShortTheory: StylisticsTheory = {
  framework: "Estilística Linguística de Leech & Short",
  keyWorks: [
    "Style in Fiction: A Linguistic Introduction to English Fictional Prose (2007)",
    "Corpus Stylistics: Speech, Writing and Thought Presentation in a Corpus of English Writing (2004)"
  ],
  coreLevel: [
    {
      name: "Nível Léxico",
      description: "Análise de vocabulário, riqueza lexical e campos semânticos",
      components: [
        "Type-Token Ratio (TTR)",
        "Densidade Lexical",
        "Hapax Legomena",
        "Razão Substantivo/Verbo",
        "Campos Semânticos Dominantes"
      ]
    },
    {
      name: "Nível Sintático",
      description: "Estruturas de sentenças, complexidade e padrões gramaticais",
      components: [
        "Comprimento Médio de Sentença",
        "Distribuição de POS",
        "Voz Ativa/Passiva",
        "Densidade de Modificadores",
        "Complexidade Sintática"
      ]
    },
    {
      name: "Figuras Retóricas",
      description: "Recursos estilísticos e padrões de repetição",
      components: [
        "Repetição Lexical",
        "Aliteração",
        "Assonância",
        "Anáfora",
        "Paralelismo Sintático"
      ]
    },
    {
      name: "Coesão Textual",
      description: "Elementos que conectam partes do texto",
      components: [
        "Conectivos (aditivos, adversativos, causais, etc.)",
        "Referências Anafóricas",
        "Cadeias Lexicais",
        "Densidade de Conectivos"
      ]
    },
    {
      name: "Speech & Thought Presentation",
      description: "Escalas de apresentação de fala e pensamento",
      components: [
        "DS/IS/FIS/FDS/NRSA (Fala)",
        "DT/IT/FIT/FDT/NRTA (Pensamento)",
        "Distribuição de Categorias",
        "Padrões Narrativos"
      ]
    },
    {
      name: "Mind Style",
      description: "Perspectiva cognitiva através de padrões linguísticos",
      components: [
        "Transitividade de Halliday",
        "Padrões de Agência",
        "Modalidade Epistêmica",
        "Dêixis (temporal, espacial, pessoal)"
      ]
    },
    {
      name: "Foregrounding",
      description: "Deautomatização e proeminência estilística",
      components: [
        "Desvio Interno",
        "Desvio Externo",
        "Paralelismo",
        "Scores de Proeminência"
      ]
    }
  ],
  principles: [
    "Análise objetiva e quantificável do estilo literário",
    "Integração de linguística formal com crítica literária",
    "Uso de corpora para comparação e validação estatística",
    "Foco em padrões recorrentes e sistematicidade",
    "Metodologia replicável e verificável"
  ],
  references: [
    "LEECH, Geoffrey; SHORT, Mick. Style in Fiction: A Linguistic Introduction to English Fictional Prose. 2nd ed. Harlow: Pearson, 2007.",
    "SEMINO, Elena; SHORT, Mick. Corpus Stylistics: Speech, Writing and Thought Presentation in a Corpus of English Writing. London: Routledge, 2004.",
    "HALLIDAY, M.A.K. An Introduction to Functional Grammar. London: Edward Arnold, 1985.",
    "SIMPSON, Paul. Stylistics: A Resource Book for Students. London: Routledge, 2004."
  ]
};

export const versoAustralStylisticsTools: StylisticsTool[] = [
  {
    id: "lexical-profile",
    name: "Perfil Léxico",
    theoreticalBasis: "Leech & Short (2007) Capítulos 2-3 sobre vocabulário e riqueza lexical",
    purpose: "Quantificar diversidade vocabular e identificar campos semânticos dominantes no corpus musical gaúcho",
    implementation: "Calcula TTR, densidade lexical, hapax legomena e distribui palavras em domínios semânticos usando taxonomia VA (13 N1 + subcategorias)",
    metrics: [
      "Type-Token Ratio: totalUniqueWords / totalWords",
      "Densidade Lexical: (NOUN + VERB + ADJ + ADV) / totalWords",
      "Hapax %: palavras únicas / total vocabulário",
      "Razão N/V: substantivos / verbos"
    ],
    references: [
      "LEECH & SHORT (2007), Cap. 3",
      "BAKER, Paul. Using Corpora in Discourse Analysis. 2006."
    ]
  },
  {
    id: "syntactic-profile",
    name: "Perfil Sintático",
    theoreticalBasis: "Leech & Short (2007) Capítulo 7 sobre sintaxe e estrutura",
    purpose: "Analisar complexidade sintática e padrões estruturais das letras de música",
    implementation: "Usa POS tagger híbrido de 3 camadas (VA Grammar → spaCy → Gemini) para anotar corpus e calcular métricas sintáticas",
    metrics: [
      "Comprimento médio de sentença",
      "Desvio padrão de comprimento",
      "Distribuição de POS (%)",
      "Razão Adj/Noun e Adv/Verb",
      "Complexidade sintática normalizada"
    ],
    references: [
      "LEECH & SHORT (2007), Cap. 7",
      "BIBER, Douglas. Variation across Speech and Writing. 1988."
    ]
  },
  {
    id: "rhetorical-figures",
    name: "Figuras Retóricas",
    theoreticalBasis: "Leech & Short (2007) Capítulo 7.7 sobre iconicidade e paralelismo",
    purpose: "Detectar recursos estilísticos tradicionais como repetição, aliteração e anáfora",
    implementation: "Pattern matching baseado em regras linguísticas para identificar 5 tipos de figuras retóricas",
    metrics: [
      "Contagem por tipo (repetição, aliteração, assonância, anáfora, paralelismo)",
      "Densidade: figuras por 100 palavras",
      "Distribuição por artista/música"
    ],
    references: [
      "LEECH & SHORT (2007), Cap. 7.7",
      "JAKOBSON, Roman. Linguistics and Poetics. 1960."
    ]
  },
  {
    id: "cohesion-analysis",
    name: "Análise de Coesão",
    theoreticalBasis: "Leech & Short (2007) Capítulo 7.8 sobre cross-reference e linkage",
    purpose: "Identificar elementos que conectam partes do texto criando coerência textual",
    implementation: "Detecção de conectivos por tipo semântico, referências anafóricas e cadeias lexicais",
    metrics: [
      "Densidade de conectivos por sentença",
      "Variação de conectivos (únicos)",
      "Distribuição por tipo (aditivo, adversativo, causal, temporal, conclusivo)"
    ],
    references: [
      "LEECH & SHORT (2007), Cap. 7.8",
      "HALLIDAY, M.A.K.; HASAN, Ruqaiya. Cohesion in English. 1976."
    ]
  },
  {
    id: "speech-thought-presentation",
    name: "Apresentação de Fala e Pensamento",
    theoreticalBasis: "Leech & Short (2007) Capítulo 10 + Semino & Short (2004) Corpus Stylistics",
    purpose: "Classificar instâncias de fala e pensamento nas escalas DS→NRSA e DT→NRTA",
    implementation: "Detecção baseada em padrões: aspas, verbos dicendi/mentais, backshift temporal, marcadores de discurso indireto livre",
    metrics: [
      "Distribuição de categorias de fala (DS, IS, FIS, FDS, NRSA)",
      "Distribuição de categorias de pensamento (DT, IT, FIT, FDT, NRTA)",
      "Categoria dominante",
      "Instâncias totais"
    ],
    references: [
      "LEECH & SHORT (2007), Cap. 10",
      "SEMINO & SHORT (2004), Corpus Stylistics",
      "MCINTYRE, Dan; WALKER, Brian. Corpus Stylistics: Theory and Practice. 2019."
    ]
  },
  {
    id: "mind-style-analyzer",
    name: "Analisador de Mind Style",
    theoreticalBasis: "Leech & Short (2007) Capítulo 6 sobre mind style + Halliday (1985) transitivity",
    purpose: "Revelar perspectiva cognitiva do texto através de padrões verbais, modalidade e agência",
    implementation: "Análise de transitividade (processos material/mental/relacional), padrões de agência, modalidade epistêmica e dêixis",
    metrics: [
      "Distribuição de processos de Halliday (%)",
      "Razão Percepção/Ação",
      "Indicadores de modalidade (certeza, incerteza, obrigação)",
      "Dêixis (temporal, espacial, pessoal)",
      "Estilo cognitivo classificado"
    ],
    references: [
      "LEECH & SHORT (2007), Cap. 6",
      "HALLIDAY, M.A.K. An Introduction to Functional Grammar. 1985.",
      "FOWLER, Roger. Linguistic Criticism. 1986."
    ]
  },
  {
    id: "foregrounding-detector",
    name: "Detector de Foregrounding",
    theoreticalBasis: "Escola de Praga (deautomatização) + Leech & Short (2007) Capítulo 4",
    purpose: "Identificar padrões linguísticos que chamam atenção do leitor por desvio ou paralelismo",
    implementation: "Detecção de desvio interno (vs. norma do texto), desvio externo (vs. norma geral) e estruturas paralelas com cálculo de scores de proeminência",
    metrics: [
      "Contagem de desvios internos/externos/paralelismos",
      "Score de proeminência (0-1)",
      "Significância estatística (σ)",
      "Padrões mais proeminentes"
    ],
    references: [
      "LEECH & SHORT (2007), Cap. 4.6",
      "MUKAROVSKY, Jan. Standard Language and Poetic Language. 1932.",
      "VAN PEER, Willie. Stylistics and Psychology. 1986."
    ]
  }
];

export const versoAustralStylisticsRoadmap = {
  phase1: {
    name: "Ferramentas Base (COMPLETO)",
    duration: "3 semanas",
    status: "complete",
    deliverables: [
      "Perfil Léxico com comparação de corpora",
      "Perfil Sintático com POS tagger híbrido",
      "Figuras Retóricas (5 tipos)",
      "Análise de Coesão"
    ]
  },
  phase2: {
    name: "Ferramentas Avançadas (COMPLETO)",
    duration: "2 semanas",
    status: "complete",
    deliverables: [
      "Speech & Thought Presentation Tool",
      "Mind Style Analyzer",
      "Foregrounding Detector",
      "Integração completa com UnifiedCorpusSelector em todas as ferramentas"
    ]
  },
  phase3: {
    name: "Análise Comparativa Cross-Corpus",
    duration: "1 semana",
    status: "planned",
    deliverables: [
      "Comparação estatística entre artistas",
      "Identificação de keywords estilísticas",
      "Gráficos radar comparativos",
      "Relatórios automatizados"
    ]
  },
  phase4: {
    name: "Dashboards Interativos",
    duration: "2 semanas",
    status: "planned",
    deliverables: [
      "Visualizações 3D de foregrounding",
      "Heat maps de densidade estilística",
      "Timeline de evolução estilística",
      "Export completo multi-formato"
    ]
  }
};
