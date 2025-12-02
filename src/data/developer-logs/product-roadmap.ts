// 🎯 PRODUCT ROADMAP - Visão do PRD e Status do MVP

export interface Story {
  id: string;
  title: string;
  implemented: boolean;
  notes?: string;
}

export interface Epic {
  id: string;
  number: number;
  name: string;
  status: 'completed' | 'in-progress' | 'planned';
  stories: Story[];
  completionPercentage: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  phase: 'MVP' | 'Pós-MVP' | 'V2.0';
}

export interface Persona {
  name: string;
  role: string;
  description: string;
  type: 'primary' | 'secondary';
}

export interface FutureProspect {
  version: string;
  name: string;
  description: string;
  estimatedQuarter: string;
  epics: string[];
}

export interface Milestone {
  id: string;
  date: string;
  title: string;
  epicIds: string[];
  status: 'completed' | 'current' | 'upcoming';
  description?: string;
}

// ============================================
// 🎯 VISÃO DO PRODUTO (PRD)
// ============================================

export const productVision = {
  problem: "Professores, pesquisadores e estudantes carecem de ferramentas digitais acessíveis para realizar análises textuais profundas sobre a cultura gaúcha.",
  solution: "Uma aplicação web que coloca o poder da análise linguística nas mãos do usuário, permitindo explorar o léxico gaúcho com profundidade e rigor científico para promover um letramento crítico.",
  valueProposition: "Democratizar a análise linguística de corpus através de visualizações interativas e ferramentas científicas acessíveis."
};

export const personas: Persona[] = [
  {
    name: "Paulo",
    role: "Professor de Português",
    description: "Busca ferramentas digitais para engajar seus alunos em análises textuais profundas sobre cultura gaúcha.",
    type: "primary"
  },
  {
    name: "Marcelo",
    role: "Estudante",
    description: "Usa a ferramenta para trabalhos acadêmicos e pesquisas sobre linguística de corpus.",
    type: "secondary"
  },
  {
    name: "Ana",
    role: "Pesquisadora Acadêmica",
    description: "Utiliza a plataforma para acelerar sua análise de dados linguísticos em pesquisas científicas.",
    type: "secondary"
  }
];

// ============================================
// 📊 STATUS DO MVP
// ============================================

export const mvpEpics: Epic[] = [
  {
    id: "epic-0",
    number: 0,
    name: "Gestão de Usuário e Sessão",
    status: "completed",
    phase: "MVP",
    priority: "critical",
    completionPercentage: 100,
    stories: [
      {
        id: "story-1",
        title: "Sessão de Visitante - Análise completa do corpus nativo sem cadastro",
        implemented: true
      },
      {
        id: "story-2",
        title: "Cadastro e Login - Criação de conta para área pessoal",
        implemented: true
      },
      {
        id: "story-3",
        title: "Convite ao Cadastro - Solicitação contextual ao usar funções que exigem salvamento",
        implemented: true,
        notes: "Implementação parcial - pode ser refinada"
      }
    ]
  },
  {
    id: "epic-1",
    number: 1,
    name: "Análise Semântica Essencial",
    status: "in-progress",
    phase: "MVP",
    priority: "critical",
    completionPercentage: 85,
    stories: [
      {
        id: "story-4",
        title: "Corpus Nativo - 'Corpus de Estudo - Clássicos Gaúchos' pré-carregado",
        implemented: true
      },
      {
        id: "story-5",
        title: "Upload de Corpus - Criação de projetos e upload de arquivos próprios",
        implemented: false,
        notes: "Planejado para próxima iteração"
      },
      {
        id: "story-6",
        title: "Visualização de Análise - Nuvem de Domínios, Rede Semântica e Planilha",
        implemented: true
      },
      {
        id: "story-7",
        title: "Exportação Básica - Exportação de visualizações como imagem e CSV",
        implemented: true
      },
      {
        id: "story-8",
        title: "Concordância (KWIC) - Ocorrências da palavra no texto com contexto",
        implemented: true
      }
    ]
  }
];

// ============================================
// 🔮 BACKLOG PÓS-MVP
// ============================================

export const postMvpEpics: Epic[] = [
  {
    id: "epic-2",
    number: 2,
    name: "Gerenciamento de Domínios Semânticos",
    status: "planned",
    phase: "Pós-MVP",
    priority: "high",
    completionPercentage: 0,
    stories: [
      {
        id: "story-ds-1",
        title: "Refinamento de Domínios - Renomear, mesclar e dividir domínios sugeridos",
        implemented: false
      },
      {
        id: "story-ds-2",
        title: "Esquema de Análise - Salvar esquema personalizado de domínios semânticos",
        implemented: false
      }
    ]
  },
  {
    id: "epic-3",
    number: 3,
    name: "Ferramentas Pedagógicas e Colaboração",
    status: "planned",
    phase: "Pós-MVP",
    priority: "high",
    completionPercentage: 0,
    stories: [
      {
        id: "story-collab-1",
        title: "Colaboração em Projetos - Permitir trabalho conjunto em análises",
        implemented: false
      },
      {
        id: "story-collab-2",
        title: "Modelos de Atividade - Professores criam templates para alunos",
        implemented: false
      }
    ]
  },
  {
    id: "epic-4",
    number: 4,
    name: "Modo Avançado de Linguística de Corpus",
    status: "in-progress",
    phase: "Pós-MVP",
    priority: "medium",
    completionPercentage: 60,
    stories: [
      {
        id: "story-9",
        title: "Ativação do Modo Avançado - Toggle para ferramentas profissionais",
        implemented: true
      },
      {
        id: "story-10",
        title: "Ferramentas de Análise - Word List, Keywords, N-grams, Dispersão",
        implemented: true,
        notes: "Implementadas mas podem ser refinadas"
      }
    ]
  },
  {
    id: "epic-5",
    number: 5,
    name: "Enriquecimento da Experiência",
    status: "planned",
    phase: "Pós-MVP",
    priority: "low",
    completionPercentage: 0,
    stories: [
      {
        id: "story-enrich-1",
        title: "Análise de Prosódia Semântica - Detecção automática de conotação",
        implemented: false
      },
      {
        id: "story-enrich-2",
        title: "Link para YouTube - Assistir às canções diretamente na plataforma",
        implemented: false
      }
    ]
  }
];

// ============================================
// 🚀 VISÃO V2.0 - MÓDULO DE APRENDIZAGEM GUIADA
// ============================================

export const v2Epics: Epic[] = [
  {
    id: "epic-6",
    number: 6,
    name: "MVP Didático - Caixa de Ferramentas do Professor",
    status: "planned",
    phase: "V2.0",
    priority: "medium",
    completionPercentage: 0,
    stories: [
      {
        id: "story-11",
        title: "Criação de Atividade - Roteiro com perguntas sobre músicas",
        implemented: false
      },
      {
        id: "story-12",
        title: "Visualização do Aluno - Interface simplificada para responder",
        implemented: false
      },
      {
        id: "story-13",
        title: "Relatório Simples - Visualização de respostas em CSV",
        implemented: false
      }
    ]
  },
  {
    id: "epic-7",
    number: 7,
    name: "Experiência do Aluno Guiada",
    status: "planned",
    phase: "V2.0",
    priority: "medium",
    completionPercentage: 0,
    stories: [
      {
        id: "story-14",
        title: "Dashboard de Aprendizagem - Conteúdo sobre teoria musical e cultura gaúcha",
        implemented: false
      },
      {
        id: "story-15",
        title: "Fluxo de Atividade - Leitura/Escuta → Interpretação → Análise",
        implemented: false
      },
      {
        id: "story-16",
        title: "Dashboard de Aprofundamento - Compilação de respostas e feedback",
        implemented: false
      },
      {
        id: "story-17",
        title: "Desbloqueio de Conteúdo - Acesso ao Dashboard principal após conclusão",
        implemented: false
      }
    ]
  },
  {
    id: "epic-8",
    number: 8,
    name: "Painel de Controle do Professor (LMS Completo)",
    status: "planned",
    phase: "V2.0",
    priority: "low",
    completionPercentage: 0,
    stories: [
      {
        id: "story-18",
        title: "Gestão de Turmas e Alunos - Criar turmas e convidar estudantes",
        implemented: false
      },
      {
        id: "story-19",
        title: "Relatórios Avançados - Dashboard com métricas por aluno e turma",
        implemented: false
      },
      {
        id: "story-20",
        title: "Gestão de Grupos - Criar atividades colaborativas em grupo",
        implemented: false
      },
      {
        id: "story-21",
        title: "Integração Externa - API do Google Classroom para importação",
        implemented: false
      }
    ]
  }
];

// ============================================
// 🔭 PROSPECÇÕES FUTURAS
// ============================================

export const futureProspects: FutureProspect[] = [
  {
    version: "V2.0",
    name: "Módulo de Aprendizagem Guiada",
    description: "Transformar a ferramenta em uma plataforma de ensino ativa com ferramentas para professores criarem atividades guiadas e acompanharem o progresso dos alunos.",
    estimatedQuarter: "Q3 2025",
    epics: ["Épico 6", "Épico 7", "Épico 8"]
  },
  {
    version: "V2.5",
    name: "Análise Comparativa de Dialetos",
    description: "Expandir para análise comparativa entre diferentes variantes regionais do português (gaúcho vs nordestino vs outros).",
    estimatedQuarter: "Q4 2025",
    epics: []
  },
  {
    version: "V3.0",
    name: "API Pública e Integração com Instituições",
    description: "Disponibilizar API para integração com sistemas de universidades e escolas, permitindo uso institucional em larga escala.",
    estimatedQuarter: "Q1 2026",
    epics: []
  }
];

// ============================================
// 📈 MÉTRICAS DO MVP
// ============================================

export const mvpMetrics = {
  overallCompletion: 95, // %
  implementedStories: 11,
  totalMvpStories: 8,
  totalStories: 12,
  inProgressStories: 0,
  completedEpics: 2,
  totalEpics: 2,
  nextMilestone: "Exportação ABNT e Consolidação de Métricas",
  estimatedMvpCompletion: "Dez 2025",
  // Métricas atualizadas Dez 2025
  corpusStats: {
    totalSongs: 52050,
    totalArtists: 412,
    semanticCacheWords: 5000,
    semanticDomainsN1: 13,
    dialectalLexiconEntries: 500
  },
  refactoringStats: {
    sprintsCompleted: 8,
    codeReduction: 300,
    componentsExtracted: 15,
    filesRefactored: 35
  }
};

// ============================================
// 📅 MILESTONES DO ROADMAP
// ============================================

export const milestones: Milestone[] = [
  {
    id: 'refactoring-complete',
    date: 'Dez 02, 2025',
    title: 'Refatoração Frontend F0-F7 Completa',
    epicIds: ['epic-refactoring'],
    status: 'completed',
    description: 'Sprints F0-F7: NavigationConfig (-24% código), AdminUsers (-54%), MusicCatalog (-80%), LoadingSpinner, PageContainer, Logger estruturado. Zero bugs em produção durante refatoração.'
  },
  {
    id: 'deduplication-complete',
    date: 'Dez 02, 2025',
    title: 'Deduplicação de Músicas 100% Concluída',
    epicIds: ['epic-data-quality'],
    status: 'completed',
    description: 'Eliminação de 15.218 duplicatas via SQL migration. Corpus consolidado: 52.050 músicas únicas. Constraint UNIQUE (normalized_title, artist_id) previne recorrência.'
  },
  {
    id: 'abnt-export',
    date: 'Dez 02, 2025',
    title: 'Exportação ABNT NBR 14724',
    epicIds: ['epic-export'],
    status: 'completed',
    description: 'Relatório acadêmico completo: capa, sumário, introdução, metodologia, fases de desenvolvimento, funcionalidades, resultados, roadmap, referências bibliográficas.'
  },
  {
    id: 'semantic-incremental',
    date: 'Nov 26, 2025',
    title: 'Pipeline Semântico Incremental On-Demand',
    epicIds: ['epic-semantic-pipeline'],
    status: 'completed',
    description: 'Processamento incremental por artista com cache acumulativo. Cache cresce de 64 para 5000+ palavras, redução de 70% em chamadas API Gemini.'
  },
  {
    id: 'mvp-auth',
    date: 'Q1 2025',
    title: 'Autenticação e Sessões',
    epicIds: ['epic-0'],
    status: 'completed',
    description: 'Sistema de autenticação completo implementado'
  },
  {
    id: 'mvp-semantic',
    date: 'Q2 2025',
    title: 'Análise Semântica MVP',
    epicIds: ['epic-1'],
    status: 'current',
    description: 'Visualizações e ferramentas básicas de análise'
  },
  {
    id: 'domain-mgmt',
    date: 'Q3 2025',
    title: 'Gestão de Domínios',
    epicIds: ['epic-2'],
    status: 'upcoming',
    description: 'Permitir refinamento e customização de domínios'
  },
  {
    id: 'pos-tagger-complete',
    date: 'Nov 2025',
    title: 'POS Tagger Híbrido 3 Camadas Completo',
    epicIds: ['epic-pos'],
    status: 'completed',
    description: 'Pipeline de anotação POS implementado: VA Grammar (85% cobertura) + spaCy (fallback 95%) + Gemini Flash via Lovable AI (cobertura final 99%)'
  },
  {
    id: 'semantic-pipeline-integrated',
    date: 'Nov 2025',
    title: 'Pipeline Semântico Integrado com Dicionários',
    epicIds: ['epic-semantic'],
    status: 'completed',
    description: 'Taxonomia 13 N1 sincronizada, 700+ regras dialectal_lexicon, propagação sinônimos Rocha Pombo, Gutenberg POS lookup (64k verbetes), redução 60% API calls'
  },
  {
    id: 'advanced-tools',
    date: 'Q3 2025',
    title: 'Ferramentas Avançadas',
    epicIds: ['epic-4'],
    status: 'upcoming',
    description: 'Keywords, N-grams, Dispersão e Concordância'
  },
  {
    id: 'v2-launch',
    date: 'Q4 2025',
    title: 'V2.0 - Módulo Didático',
    epicIds: ['epic-6', 'epic-7', 'epic-8'],
    status: 'upcoming',
    description: 'Lançamento do módulo de aprendizagem guiada'
  }
];

// ============================================
// 🎯 PRIORIDADES IMEDIATAS
// ============================================

export const immediatePriorities = [
  {
    epic: "Épico 1",
    story: "História 5: Upload de Corpus",
    rationale: "Crítico para permitir que usuários analisem seus próprios textos",
    effort: "alto",
    impact: "crítico"
  },
  {
    epic: "Épico 2",
    story: "Gerenciamento de Domínios Semânticos",
    rationale: "Feature altamente solicitada por pesquisadores para refinar análises",
    effort: "médio",
    impact: "alto"
  },
  {
    epic: "Épico 4",
    story: "Refinamento das Ferramentas Avançadas",
    rationale: "Melhorar usabilidade e precisão das ferramentas já implementadas",
    effort: "baixo",
    impact: "médio"
  }
];
