/**
 * 🗺️ ROADMAP DE FEATURES FUTURAS
 * Sistema de documentação de features propostas mas adiadas
 * Permite retomada com contexto técnico completo
 */

export interface FutureFeature {
  id: string;
  title: string;
  status: 'proposed' | 'planned' | 'in-progress' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedTime: string;
  description: string;
  technicalDetails: {
    dependencies: string[];
    apiKeys?: string[];
    endpoints?: string[];
    schemas?: string[];
  };
  implementation: {
    phase: string;
    files: string[];
    keyFunctions?: string[];
  };
  rationale: string;
  challenges?: string[];
  references?: string[];
  proposedBy: string;
  proposedAt: string;
  blockedReason?: string;
}

export const futureFeatures: FutureFeature[] = [
  {
    id: 'youtube-music-links',
    title: 'YouTube Music Link Enrichment',
    status: 'proposed',
    priority: 'medium',
    estimatedTime: '3h00min',
    description: 'Adicionar links para YouTube Music automaticamente durante o enriquecimento, permitindo que usuários escutem as músicas diretamente da interface.',
    technicalDetails: {
      dependencies: [
        'YouTube Data API v3',
        'Google Cloud API Key'
      ],
      apiKeys: ['YOUTUBE_DATA_API_KEY'],
      endpoints: [
        'https://www.googleapis.com/youtube/v3/search'
      ],
      schemas: [
        'EnrichedSongDataSchema (youtubeUrl, youtubeMusicUrl, youtubeVideoId)',
        'SongMetadata (mesmos campos)'
      ]
    },
    implementation: {
      phase: 'PLANO V6.1 - YouTube Music Links',
      files: [
        'src/lib/enrichmentSchemas.ts',
        'src/data/types/full-text-corpus.types.ts',
        'supabase/functions/enrich-corpus-metadata/index.ts',
        'src/components/advanced/MetadataEnrichmentInterface.tsx'
      ],
      keyFunctions: [
        'queryYouTube(artista, musica) → { videoId, url, musicUrl, confianca }',
        'Integração no serve handler do edge function',
        'UI: Botão "Assistir no YouTube Music" em cada card'
      ]
    },
    rationale: `### Por que implementar?
1. **UX Rica**: Usuário pode validar se a música está correta ouvindo diretamente
2. **Valor Pedagógico**: Professores podem usar links nas atividades
3. **Diferencial Competitivo**: Outras ferramentas não oferecem isso
4. **Custo Zero**: Quota gratuita do YouTube API (100 músicas/dia)

### Por que adiar agora?
1. **Prioridade do Anotador Semântico**: Core feature do MVP
2. **Complexidade de Setup**: Requer Google Cloud Console + API Key
3. **Quota Limitations**: Para corpus grande (1000+) precisa de batching
4. **Nice-to-have vs Must-have**: Não bloqueia uso do sistema

### Implementação Técnica
**Fase 1 (30min)**: Estender schemas com youtubeUrl, youtubeMusicUrl, youtubeVideoId
**Fase 2 (1h30min)**: Criar função queryYouTube() no edge function
  - Buscar via YouTube Data API v3
  - Filtrar por relevância (título contém artista E música)
  - Calcular confiança: 85% (match exato) ou 60% (match parcial)
**Fase 3 (45min)**: Adicionar botão "🎵 Assistir no YouTube Music" nos cards
**Fase 4 (15min)**: Testing com músicas populares e nicho`,
    challenges: [
      'Quota da API: 10.000 units/dia = 100 searches/dia',
      'Precision: ~85% para músicas populares, ~60% para nicho',
      'Setup: Usuário precisa criar projeto no Google Cloud',
      'Rate limiting: Adiciona 300-500ms por música',
      'Fallback: Precisa funcionar gracefully sem API key'
    ],
    references: [
      'https://developers.google.com/youtube/v3',
      'https://developers.google.com/youtube/v3/docs/search/list',
      'https://console.cloud.google.com/',
      'https://github.com/zerodytrash/YouTube-Internal-Clients (alternativa Innertube)',
      'https://github.com/yt-dlp/yt-dlp (alternativa yt-dlp)'
    ],
    proposedBy: 'User Request',
    proposedAt: '2025-11-19',
  }
];

export const roadmapStats = {
  totalFeatures: futureFeatures.length,
  byStatus: {
    proposed: futureFeatures.filter(f => f.status === 'proposed').length,
    planned: futureFeatures.filter(f => f.status === 'planned').length,
    inProgress: futureFeatures.filter(f => f.status === 'in-progress').length,
    blocked: futureFeatures.filter(f => f.status === 'blocked').length,
  },
  byPriority: {
    critical: futureFeatures.filter(f => f.priority === 'critical').length,
    high: futureFeatures.filter(f => f.priority === 'high').length,
    medium: futureFeatures.filter(f => f.priority === 'medium').length,
    low: futureFeatures.filter(f => f.priority === 'low').length,
  }
};

/**
 * Helper para adicionar novas features ao roadmap
 */
export function addFeatureToRoadmap(feature: FutureFeature): void {
  futureFeatures.push(feature);
}

/**
 * Helper para filtrar features por status
 */
export function getFeaturesByStatus(status: FutureFeature['status']): FutureFeature[] {
  return futureFeatures.filter(f => f.status === status);
}

/**
 * Helper para filtrar features por prioridade
 */
export function getFeaturesByPriority(priority: FutureFeature['priority']): FutureFeature[] {
  return futureFeatures.filter(f => f.priority === priority);
}
