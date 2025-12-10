// Tipos de auditoria
export type AuditType = 'security' | 'performance' | 'ux' | 'architecture' | 'comprehensive';
export type AuditScope = 'backend' | 'frontend' | 'full-stack' | 'specific-module';
export type FindingStatus = 'open' | 'in-progress' | 'resolved' | 'wont-fix' | 'deferred';
export type SprintStatus = 'planned' | 'in-progress' | 'completed' | 'blocked';

export interface AuditFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'security' | 'performance' | 'functional' | 'ux' | 'accessibility';
  component: string;
  file?: string;
  description: string;
  impact: string;
  status: FindingStatus;
  resolvedIn?: string;
  resolvedDate?: string;
}

export interface RemediationSprint {
  id: string;
  auditRef: string;
  name: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  estimatedHours: number;
  actualHours?: number;
  status: SprintStatus;
  startDate?: string;
  completedDate?: string;
  deliverables: {
    description: string;
    completed: boolean;
    fileChanges?: string[];
  }[];
  acceptanceCriteria: {
    criterion: string;
    met: boolean;
  }[];
}

export interface Audit {
  id: string;
  name: string;
  date: string;
  type: AuditType;
  scope: AuditScope;
  auditor: string;
  methodology?: string;
  findings: AuditFinding[];
  remediationSprints: RemediationSprint[];
  summary: {
    totalFindings: number;
    resolvedFindings: number;
    coveragePercent: number;
    estimatedEffort: string;
    actualEffort?: string;
  };
  documentation?: string;
}

// ============ DADOS DAS AUDITORIAS ============

export const auditsRegistry: Audit[] = [
  // 1. Remediation Roadmap (AUD-P0 a AUD-P5)
  {
    id: 'remediation-roadmap-2024',
    name: 'Remediation Roadmap - Enrichment & Semantic',
    date: '2024-11-15',
    type: 'comprehensive',
    scope: 'full-stack',
    auditor: 'internal',
    methodology: 'Sherlock Holmes Root Cause Analysis',
    findings: [
      {
        id: 'RR-F1',
        severity: 'critical',
        category: 'security',
        component: 'artist_stats_mv',
        file: 'supabase/migrations',
        description: 'Materialized view sem RLS expondo estatísticas de artistas',
        impact: 'Dados de estatísticas acessíveis publicamente via API',
        status: 'resolved',
        resolvedIn: 'AUD-P0',
        resolvedDate: '2024-11-16'
      },
      {
        id: 'RR-F2',
        severity: 'critical',
        category: 'functional',
        component: 'useSemanticAnnotationCatalog',
        file: 'src/hooks/useSemanticAnnotationCatalog.ts',
        description: 'Query usando campo inexistente song_id ao invés de palavra',
        impact: 'checkSongCoverage sempre retorna zero coverage',
        status: 'resolved',
        resolvedIn: 'SPRINT-0',
        resolvedDate: '2024-11-17'
      },
      {
        id: 'RR-F3',
        severity: 'critical',
        category: 'functional',
        component: 'EnrichmentControlPanel',
        file: 'src/components/music/enrichment/EnrichmentControlPanel.tsx',
        description: 'filteredArtists ignora corpus_id quando scope=corpus',
        impact: 'Retorna todos artistas ao invés de filtrados por corpus',
        status: 'resolved',
        resolvedIn: 'SPRINT-0',
        resolvedDate: '2024-11-17'
      },
      {
        id: 'RR-F4',
        severity: 'high',
        category: 'ux',
        component: 'enrichmentService',
        file: 'src/services/enrichmentService.ts',
        description: 'Toast de sucesso aparece antes de verificação de persistência',
        impact: 'Usuário vê falsos positivos de sucesso',
        status: 'resolved',
        resolvedIn: 'SPRINT-0',
        resolvedDate: '2024-11-17'
      },
      {
        id: 'RR-F5',
        severity: 'high',
        category: 'performance',
        component: 'enrich-songs-batch',
        file: 'supabase/functions/enrich-songs-batch',
        description: 'CHUNK_SIZE=20 e RATE_LIMIT_MS=1000 muito conservadores',
        impact: '31 horas para processar 86k músicas',
        status: 'resolved',
        resolvedIn: 'SPRINT-1',
        resolvedDate: '2024-11-18'
      },
      {
        id: 'RR-F6',
        severity: 'high',
        category: 'performance',
        component: 'useSemanticCoverage',
        file: 'src/hooks/useSemanticCoverage.ts',
        description: '17 queries (~130k records) para carregar cobertura',
        impact: 'Dashboard lento (3-8s) e sobrecarga no banco',
        status: 'resolved',
        resolvedIn: 'AUD-P2',
        resolvedDate: '2024-11-20'
      },
      {
        id: 'RR-F7',
        severity: 'medium',
        category: 'functional',
        component: 'semantic_disambiguation_cache',
        description: '378 palavras NC (não classificadas) no cache',
        impact: 'Lacunas na análise semântica',
        status: 'resolved',
        resolvedIn: 'AUD-P5',
        resolvedDate: '2024-11-25'
      }
    ],
    remediationSprints: [
      {
        id: 'SPRINT-0',
        auditRef: 'remediation-roadmap-2024',
        name: 'Critical Bugfixes',
        priority: 'P0',
        estimatedHours: 2,
        actualHours: 2,
        status: 'completed',
        startDate: '2024-11-16',
        completedDate: '2024-11-17',
        deliverables: [
          { description: 'Fix BUG-1: checkSongCoverage query field', completed: true, fileChanges: ['useSemanticAnnotationCatalog.ts'] },
          { description: 'Fix BUG-2: filteredArtists corpus_id filtering', completed: true, fileChanges: ['EnrichmentControlPanel.tsx'] },
          { description: 'Fix BUG-3: toast after DB verification', completed: true, fileChanges: ['enrichmentService.ts'] }
        ],
        acceptanceCriteria: [
          { criterion: 'checkSongCoverage retorna valores corretos', met: true },
          { criterion: 'filteredArtists filtra por corpus_id', met: true },
          { criterion: 'Toast só aparece após confirmação DB', met: true }
        ]
      },
      {
        id: 'SPRINT-1',
        auditRef: 'remediation-roadmap-2024',
        name: 'Throughput Boost',
        priority: 'P0',
        estimatedHours: 4,
        actualHours: 4,
        status: 'completed',
        startDate: '2024-11-17',
        completedDate: '2024-11-18',
        deliverables: [
          { description: 'CHUNK_SIZE 20→50', completed: true },
          { description: 'RATE_LIMIT_MS 1000→500ms', completed: true },
          { description: 'PARALLEL_SONGS=3', completed: true },
          { description: 'Adaptive rate limiting with exponential backoff', completed: true }
        ],
        acceptanceCriteria: [
          { criterion: 'Throughput reduzido de 31h para 5-8h', met: true },
          { criterion: 'Métricas de velocidade em tempo real', met: true }
        ]
      },
      {
        id: 'AUD-P0',
        auditRef: 'remediation-roadmap-2024',
        name: 'Security Fixes',
        priority: 'P0',
        estimatedHours: 2,
        actualHours: 2,
        status: 'completed',
        startDate: '2024-11-15',
        completedDate: '2024-11-16',
        deliverables: [
          { description: 'RLS para artist_stats_mv via secure view', completed: true },
          { description: 'Linter warnings ≤2', completed: true }
        ],
        acceptanceCriteria: [
          { criterion: 'artist_stats_secure com RLS ativo', met: true },
          { criterion: 'Acesso direto à MV bloqueado', met: true }
        ]
      },
      {
        id: 'AUD-P1',
        auditRef: 'remediation-roadmap-2024',
        name: 'Global Progress Dashboard',
        priority: 'P1',
        estimatedHours: 4,
        actualHours: 4,
        status: 'completed',
        startDate: '2024-11-18',
        completedDate: '2024-11-19',
        deliverables: [
          { description: 'useGlobalEnrichmentStats hook', completed: true },
          { description: 'GlobalEnrichmentProgress component', completed: true },
          { description: 'CorpusProgressCard per corpus', completed: true }
        ],
        acceptanceCriteria: [
          { criterion: 'Progress bar global funcional', met: true },
          { criterion: 'ETA e processing rate visíveis', met: true },
          { criterion: 'Botões de processamento por corpus', met: true }
        ]
      },
      {
        id: 'AUD-P2',
        auditRef: 'remediation-roadmap-2024',
        name: 'useSemanticCoverage Optimization',
        priority: 'P1',
        estimatedHours: 6,
        actualHours: 5,
        status: 'completed',
        startDate: '2024-11-19',
        completedDate: '2024-11-20',
        deliverables: [
          { description: 'semantic_coverage_by_corpus MV', completed: true },
          { description: 'semantic_coverage_by_artist MV', completed: true },
          { description: 'semantic_quality_metrics MV', completed: true },
          { description: 'refresh_semantic_coverage_mvs() function', completed: true }
        ],
        acceptanceCriteria: [
          { criterion: 'Queries reduzidas de 17 para 3', met: true },
          { criterion: 'Response time <500ms', met: true }
        ]
      },
      {
        id: 'AUD-P3',
        auditRef: 'remediation-roadmap-2024',
        name: 'Batch Execution Orchestration',
        priority: 'P1',
        estimatedHours: 8,
        actualHours: 7,
        status: 'completed',
        startDate: '2024-11-20',
        completedDate: '2024-11-22',
        deliverables: [
          { description: 'orchestrate-corpus-enrichment edge function', completed: true },
          { description: 'useEnrichmentOrchestration hook', completed: true },
          { description: 'EnrichmentOrchestrationPanel UI', completed: true }
        ],
        acceptanceCriteria: [
          { criterion: 'Single button processa 86k songs', met: true },
          { criterion: 'Auto-cleanup de jobs órfãos', met: true },
          { criterion: 'User controls (pause/stop/skip)', met: true }
        ]
      },
      {
        id: 'AUD-P4',
        auditRef: 'remediation-roadmap-2024',
        name: 'N1→N2 Refinement',
        priority: 'P2',
        estimatedHours: 5,
        actualHours: 5,
        status: 'completed',
        startDate: '2024-11-22',
        completedDate: '2024-11-24',
        deliverables: [
          { description: 'refine-domain-batch com quality tracking', completed: true },
          { description: 'Intelligent prioritization modes', completed: true },
          { description: 'DOMAIN_INSTRUCTIONS per domain', completed: true }
        ],
        acceptanceCriteria: [
          { criterion: '7,593 N1-only words targeted', met: true },
          { criterion: 'depthDistribution metrics', met: true }
        ]
      },
      {
        id: 'AUD-P5',
        auditRef: 'remediation-roadmap-2024',
        name: 'NC Curation System',
        priority: 'P2',
        estimatedHours: 4,
        actualHours: 4,
        status: 'completed',
        startDate: '2024-11-24',
        completedDate: '2024-11-25',
        deliverables: [
          { description: 'reclassify-common-nc edge function', completed: true },
          { description: 'text-normalizer expansion (100+ corrections)', completed: true },
          { description: 'batch-curate-nc orchestrator', completed: true }
        ],
        acceptanceCriteria: [
          { criterion: 'NC words <100', met: true },
          { criterion: 'Batch curation UI', met: true }
        ]
      }
    ],
    summary: {
      totalFindings: 7,
      resolvedFindings: 7,
      coveragePercent: 100,
      estimatedEffort: '35h',
      actualEffort: '33h'
    }
  },

  // 2. Music Catalog Audit (CAT-AUDIT)
  {
    id: 'music-catalog-audit-2024',
    name: 'Music Catalog UI/UX Audit',
    date: '2024-11-20',
    type: 'ux',
    scope: 'frontend',
    auditor: 'Senior PM (Google/Alphabet methodology)',
    methodology: 'WCAG 2.1 AA + Heuristic Evaluation',
    findings: [
      {
        id: 'CAT-F1',
        severity: 'critical',
        category: 'ux',
        component: 'Global',
        description: '688 ocorrências de cores azuis em 75 arquivos violando diretiva "no blue"',
        impact: 'Inconsistência visual e violação de design directive',
        status: 'resolved',
        resolvedIn: 'CAT-AUDIT-P0',
        resolvedDate: '2024-11-21'
      },
      {
        id: 'CAT-F2',
        severity: 'critical',
        category: 'ux',
        component: 'MusicCatalogToolbar',
        file: 'src/components/music/MusicCatalogToolbar.tsx',
        description: 'Botão "Limpar Catálogo" destrutivo muito acessível',
        impact: 'Risco de deleção acidental de dados',
        status: 'resolved',
        resolvedIn: 'CAT-AUDIT-P0',
        resolvedDate: '2024-11-21'
      },
      {
        id: 'CAT-F3',
        severity: 'high',
        category: 'ux',
        component: 'Search',
        description: 'Busca sem autocomplete, workflow fragmentado catalog→analysis',
        impact: 'Fricção no fluxo de trabalho do professor',
        status: 'resolved',
        resolvedIn: 'CAT-AUDIT-P1',
        resolvedDate: '2024-11-22'
      },
      {
        id: 'CAT-F4',
        severity: 'high',
        category: 'functional',
        component: 'Integration',
        description: 'Sem botão "Analisar Corpus", fluxo desconectado',
        impact: 'Professor não consegue iniciar análise do catálogo',
        status: 'resolved',
        resolvedIn: 'CAT-AUDIT-P1',
        resolvedDate: '2024-11-22'
      },
      {
        id: 'CAT-F5',
        severity: 'high',
        category: 'accessibility',
        component: 'AlphabetFilter',
        file: 'src/components/music/catalog/TabArtists.tsx',
        description: 'Sem navegação por teclado, sem ARIA attributes',
        impact: 'Não acessível para usuários de teclado/screen readers',
        status: 'resolved',
        resolvedIn: 'CAT-AUDIT-P2',
        resolvedDate: '2024-11-23'
      },
      {
        id: 'CAT-F6',
        severity: 'medium',
        category: 'functional',
        component: 'SongCard',
        file: 'src/components/music/catalog/SongCard.tsx',
        description: '501 linhas, violação SRP (Single Responsibility)',
        impact: 'Manutenibilidade comprometida',
        status: 'resolved',
        resolvedIn: 'CAT-AUDIT-P2',
        resolvedDate: '2024-11-23'
      },
      {
        id: 'CAT-F7',
        severity: 'medium',
        category: 'ux',
        component: 'Onboarding',
        description: 'Nenhum onboarding para professores novos',
        impact: 'Curva de aprendizado íngreme',
        status: 'resolved',
        resolvedIn: 'CAT-AUDIT-P3',
        resolvedDate: '2024-11-24'
      },
      {
        id: 'CAT-F8',
        severity: 'medium',
        category: 'ux',
        component: 'AlphabetFilter',
        description: 'Não responsivo em mobile',
        impact: 'UX degradada em dispositivos móveis',
        status: 'resolved',
        resolvedIn: 'CAT-AUDIT-P3',
        resolvedDate: '2024-11-24'
      }
    ],
    remediationSprints: [
      {
        id: 'CAT-AUDIT-P0',
        auditRef: 'music-catalog-audit-2024',
        name: 'Correções Críticas',
        priority: 'P0',
        estimatedHours: 3,
        actualHours: 2.5,
        status: 'completed',
        startDate: '2024-11-20',
        completedDate: '2024-11-21',
        deliverables: [
          { description: 'Blue color elimination (75+ files)', completed: true },
          { description: '"Limpar Catálogo" relocated to dropdown', completed: true }
        ],
        acceptanceCriteria: [
          { criterion: 'Zero blue colors no projeto', met: true },
          { criterion: 'Ação destrutiva com double confirmation', met: true }
        ]
      },
      {
        id: 'CAT-AUDIT-P1',
        auditRef: 'music-catalog-audit-2024',
        name: 'Teacher Workflow',
        priority: 'P1',
        estimatedHours: 5,
        actualHours: 5,
        status: 'completed',
        startDate: '2024-11-21',
        completedDate: '2024-11-22',
        deliverables: [
          { description: 'CatalogSearchAutocomplete component', completed: true },
          { description: '"Analisar Corpus" buttons', completed: true },
          { description: 'CatalogBreadcrumb navigation', completed: true }
        ],
        acceptanceCriteria: [
          { criterion: 'Autocomplete com debounce 300ms', met: true },
          { criterion: 'Navegação catalog→analysis funcional', met: true },
          { criterion: 'Breadcrumb hierárquico', met: true }
        ]
      },
      {
        id: 'CAT-AUDIT-P2',
        auditRef: 'music-catalog-audit-2024',
        name: 'Accessibility & Code Quality',
        priority: 'P1',
        estimatedHours: 4.25,
        actualHours: 4.25,
        status: 'completed',
        startDate: '2024-11-22',
        completedDate: '2024-11-23',
        deliverables: [
          { description: 'AlphabetFilter keyboard navigation', completed: true },
          { description: 'SongCard refactored to 6 subcomponents', completed: true },
          { description: 'ARIA attributes compliance', completed: true }
        ],
        acceptanceCriteria: [
          { criterion: 'Tab/Enter/Arrow navigation', met: true },
          { criterion: 'SongCard 501→120 lines', met: true },
          { criterion: 'WCAG 2.1 AA compliance', met: true }
        ]
      },
      {
        id: 'CAT-AUDIT-P3',
        auditRef: 'music-catalog-audit-2024',
        name: 'Polimento Final',
        priority: 'P2',
        estimatedHours: 4,
        actualHours: 4,
        status: 'completed',
        startDate: '2024-11-23',
        completedDate: '2024-11-24',
        deliverables: [
          { description: 'AlphabetFilter responsive (ScrollArea mobile)', completed: true },
          { description: 'Pagination counter', completed: true },
          { description: 'Shepherd.js onboarding tour (6 steps)', completed: true }
        ],
        acceptanceCriteria: [
          { criterion: 'Mobile-first responsive', met: true },
          { criterion: 'Guided tour para novos usuários', met: true }
        ]
      }
    ],
    summary: {
      totalFindings: 8,
      resolvedFindings: 8,
      coveragePercent: 100,
      estimatedEffort: '16.25h',
      actualEffort: '15.75h'
    }
  },

  // 3. Semantic Pipeline Audit (SP-1 a SP-6)
  {
    id: 'semantic-pipeline-audit-2024',
    name: 'Semantic Pipeline Audit',
    date: '2024-12-01',
    type: 'comprehensive',
    scope: 'specific-module',
    auditor: 'internal',
    methodology: 'Sherlock Holmes Analysis + WCAG Review',
    findings: [
      {
        id: 'SP-F1',
        severity: 'high',
        category: 'performance',
        component: 'useSemanticPipelineStats',
        description: 'Fetch de 42k+ records para calcular estatísticas',
        impact: 'Dashboard lento, sobrecarga no banco',
        status: 'resolved',
        resolvedIn: 'SP-1',
        resolvedDate: '2024-12-02'
      },
      {
        id: 'SP-F2',
        severity: 'medium',
        category: 'functional',
        component: 'POS Stats',
        description: 'Mock data ao invés de dados reais de POS',
        impact: 'Métricas não refletem realidade',
        status: 'resolved',
        resolvedIn: 'SP-1',
        resolvedDate: '2024-12-02'
      },
      {
        id: 'SP-F3',
        severity: 'medium',
        category: 'ux',
        component: 'TabsList',
        description: 'Tabs não responsivas em mobile',
        impact: 'UX degradada em dispositivos móveis',
        status: 'resolved',
        resolvedIn: 'SP-2',
        resolvedDate: '2024-12-03'
      },
      {
        id: 'SP-F4',
        severity: 'medium',
        category: 'accessibility',
        component: 'Icons',
        description: 'Ícones sem aria-labels',
        impact: 'Screen readers não conseguem interpretar',
        status: 'resolved',
        resolvedIn: 'SP-3',
        resolvedDate: '2024-12-04'
      },
      {
        id: 'SP-F5',
        severity: 'medium',
        category: 'functional',
        component: 'Error Handling',
        description: 'Sem error boundaries, crash propaga para página inteira',
        impact: 'Experiência de erro ruim',
        status: 'resolved',
        resolvedIn: 'SP-4',
        resolvedDate: '2024-12-05'
      },
      {
        id: 'SP-F6',
        severity: 'low',
        category: 'ux',
        component: 'Technical Metrics',
        description: 'Métricas técnicas sem tooltips explicativos',
        impact: 'Usuários não entendem significado',
        status: 'resolved',
        resolvedIn: 'SP-5',
        resolvedDate: '2024-12-06'
      },
      {
        id: 'SP-F7',
        severity: 'low',
        category: 'performance',
        component: 'Polling',
        description: 'Polling continua quando tab não está visível',
        impact: 'Requests desnecessários',
        status: 'resolved',
        resolvedIn: 'SP-6',
        resolvedDate: '2024-12-10'
      }
    ],
    remediationSprints: [
      {
        id: 'SP-1',
        auditRef: 'semantic-pipeline-audit-2024',
        name: 'Materialized Views & Real Data',
        priority: 'P1',
        estimatedHours: 4,
        actualHours: 4,
        status: 'completed',
        startDate: '2024-12-01',
        completedDate: '2024-12-02',
        deliverables: [
          { description: 'semantic_pipeline_stats_mv', completed: true },
          { description: 'Real POS aggregation queries', completed: true },
          { description: 'Division-by-zero guards', completed: true }
        ],
        acceptanceCriteria: [
          { criterion: 'Zero mock data', met: true },
          { criterion: 'Query time <500ms', met: true }
        ]
      },
      {
        id: 'SP-2',
        auditRef: 'semantic-pipeline-audit-2024',
        name: 'Responsiveness & Validation',
        priority: 'P1',
        estimatedHours: 3,
        actualHours: 3,
        status: 'completed',
        startDate: '2024-12-02',
        completedDate: '2024-12-03',
        deliverables: [
          { description: 'Responsive tabs (grid-cols-2 md:grid-cols-4)', completed: true },
          { description: 'Zod validation for API data', completed: true }
        ],
        acceptanceCriteria: [
          { criterion: 'Mobile layout funcional', met: true },
          { criterion: 'API data validated', met: true }
        ]
      },
      {
        id: 'SP-3',
        auditRef: 'semantic-pipeline-audit-2024',
        name: 'Accessibility',
        priority: 'P1',
        estimatedHours: 3,
        actualHours: 3,
        status: 'completed',
        startDate: '2024-12-03',
        completedDate: '2024-12-04',
        deliverables: [
          { description: 'aria-labels em todos ícones', completed: true },
          { description: 'Heading hierarchy (h1→h2→h3)', completed: true },
          { description: 'scope="col" em tabelas', completed: true }
        ],
        acceptanceCriteria: [
          { criterion: 'WCAG 2.1 AA compliance', met: true }
        ]
      },
      {
        id: 'SP-4',
        auditRef: 'semantic-pipeline-audit-2024',
        name: 'Error Boundaries',
        priority: 'P1',
        estimatedHours: 2,
        actualHours: 2,
        status: 'completed',
        startDate: '2024-12-04',
        completedDate: '2024-12-05',
        deliverables: [
          { description: 'SectionErrorBoundary component', completed: true },
          { description: 'Wrap critical sections', completed: true }
        ],
        acceptanceCriteria: [
          { criterion: 'Erros contidos por seção', met: true }
        ]
      },
      {
        id: 'SP-5',
        auditRef: 'semantic-pipeline-audit-2024',
        name: 'UX Polish',
        priority: 'P2',
        estimatedHours: 4,
        actualHours: 4,
        status: 'completed',
        startDate: '2024-12-05',
        completedDate: '2024-12-06',
        deliverables: [
          { description: 'Tooltips para métricas técnicas', completed: true },
          { description: 'Collapsible sections', completed: true },
          { description: 'Visual feedback for saves', completed: true }
        ],
        acceptanceCriteria: [
          { criterion: 'Todas métricas com explicação', met: true },
          { criterion: 'Feedback visual em ações', met: true }
        ]
      },
      {
        id: 'SP-6',
        auditRef: 'semantic-pipeline-audit-2024',
        name: 'Monitoring Integration',
        priority: 'P2',
        estimatedHours: 2,
        actualHours: 2,
        status: 'completed',
        startDate: '2024-12-09',
        completedDate: '2024-12-10',
        deliverables: [
          { description: 'useSmartPolling hook', completed: true },
          { description: 'AnomalyAlertsBadge no header', completed: true },
          { description: 'Link para ThroughputDashboard', completed: true }
        ],
        acceptanceCriteria: [
          { criterion: 'Polling pausado quando tab oculta', met: true },
          { criterion: 'Alertas visíveis no header', met: true },
          { criterion: 'Link funcional para métricas', met: true }
        ]
      }
    ],
    summary: {
      totalFindings: 7,
      resolvedFindings: 7,
      coveragePercent: 100,
      estimatedEffort: '18h',
      actualEffort: '18h'
    }
  },

  // 4. Analysis Tools Audit (AUD-A, AUD-C2)
  {
    id: 'analysis-tools-audit-2024',
    name: 'Analysis Tools Audit',
    date: '2024-11-28',
    type: 'architecture',
    scope: 'frontend',
    auditor: 'internal',
    methodology: 'Code Review + Functional Testing',
    findings: [
      {
        id: 'AT-F1',
        severity: 'high',
        category: 'functional',
        component: 'Compare Mode',
        file: 'src/contexts/SubcorpusContext.tsx',
        description: 'Compare mode retorna "não implementado"',
        impact: 'Usuário não pode comparar dois artistas',
        status: 'resolved',
        resolvedIn: 'AUD-A',
        resolvedDate: '2024-11-29'
      },
      {
        id: 'AT-F2',
        severity: 'medium',
        category: 'ux',
        component: 'Annotation Quality',
        description: 'Sem métricas de qualidade de anotação visíveis',
        impact: 'Usuário não sabe a confiabilidade dos dados',
        status: 'resolved',
        resolvedIn: 'AUD-A',
        resolvedDate: '2024-11-29'
      },
      {
        id: 'AT-F3',
        severity: 'medium',
        category: 'functional',
        component: 'ContextBridge',
        file: 'src/components/analysis/ContextBridge.tsx',
        description: '6+ refs manuais causando code smell',
        impact: 'Código difícil de manter',
        status: 'resolved',
        resolvedIn: 'AUD-C2',
        resolvedDate: '2024-11-30'
      },
      {
        id: 'AT-F4',
        severity: 'low',
        category: 'functional',
        component: 'Type Guards',
        description: 'Type guards duplicados em múltiplos arquivos',
        impact: 'Inconsistência e duplicação',
        status: 'resolved',
        resolvedIn: 'AUD-C2',
        resolvedDate: '2024-11-30'
      },
      {
        id: 'AT-F5',
        severity: 'low',
        category: 'performance',
        component: 'Rate Limiting',
        description: 'Sem rate limiting unificado',
        impact: 'Risco de quota exhaustion',
        status: 'resolved',
        resolvedIn: 'AUD-C2',
        resolvedDate: '2024-11-30'
      }
    ],
    remediationSprints: [
      {
        id: 'AUD-A',
        auditRef: 'analysis-tools-audit-2024',
        name: 'Compare Mode & Quality Metrics',
        priority: 'P1',
        estimatedHours: 4,
        actualHours: 4,
        status: 'completed',
        startDate: '2024-11-28',
        completedDate: '2024-11-29',
        deliverables: [
          { description: 'Compare mode implementation', completed: true },
          { description: 'AnnotationQualityMetrics component', completed: true }
        ],
        acceptanceCriteria: [
          { criterion: 'Two-artist corpus loading', met: true },
          { criterion: 'Quality score 0-100 displayed', met: true }
        ]
      },
      {
        id: 'AUD-C2',
        auditRef: 'analysis-tools-audit-2024',
        name: 'Cleanup & Quality',
        priority: 'P2',
        estimatedHours: 4,
        actualHours: 4,
        status: 'completed',
        startDate: '2024-11-29',
        completedDate: '2024-11-30',
        deliverables: [
          { description: 'ContextBridge useReducer refactor', completed: true },
          { description: 'Centralized typeGuards.ts', completed: true },
          { description: 'useRateLimiter hook', completed: true }
        ],
        acceptanceCriteria: [
          { criterion: 'Zero manual refs in ContextBridge', met: true },
          { criterion: 'Consistent rate limiting', met: true }
        ]
      }
    ],
    summary: {
      totalFindings: 5,
      resolvedFindings: 5,
      coveragePercent: 100,
      estimatedEffort: '8h',
      actualEffort: '8h'
    }
  }
];

// ============ HELPER FUNCTIONS ============

export const getAuditById = (id: string): Audit | undefined => {
  return auditsRegistry.find(a => a.id === id);
};

export const getAuditsByType = (type: AuditType): Audit[] => {
  return auditsRegistry.filter(a => a.type === type);
};

export const getCoverageStats = () => {
  const totals = auditsRegistry.reduce((acc, audit) => ({
    totalFindings: acc.totalFindings + audit.summary.totalFindings,
    resolvedFindings: acc.resolvedFindings + audit.summary.resolvedFindings,
    totalSprints: acc.totalSprints + audit.remediationSprints.length,
    completedSprints: acc.completedSprints + audit.remediationSprints.filter(s => s.status === 'completed').length,
    estimatedHours: acc.estimatedHours + audit.remediationSprints.reduce((h, s) => h + s.estimatedHours, 0),
    actualHours: acc.actualHours + audit.remediationSprints.reduce((h, s) => h + (s.actualHours || 0), 0)
  }), { totalFindings: 0, resolvedFindings: 0, totalSprints: 0, completedSprints: 0, estimatedHours: 0, actualHours: 0 });

  return {
    ...totals,
    coveragePercent: Math.round((totals.resolvedFindings / totals.totalFindings) * 100),
    sprintCompletionPercent: Math.round((totals.completedSprints / totals.totalSprints) * 100)
  };
};

export const getPendingSprints = (): RemediationSprint[] => {
  return auditsRegistry.flatMap(a => 
    a.remediationSprints.filter(s => s.status !== 'completed')
  ).sort((a, b) => {
    const priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
};

export const getAllFindings = (): (AuditFinding & { auditName: string })[] => {
  return auditsRegistry.flatMap(a => 
    a.findings.map(f => ({ ...f, auditName: a.name }))
  );
};

export const getFindingsBySeverity = (severity: AuditFinding['severity']) => {
  return getAllFindings().filter(f => f.severity === severity);
};
