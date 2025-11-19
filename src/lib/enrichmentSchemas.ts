import { z } from 'zod';

/**
 * Schema de validação Zod para dados de enriquecimento
 * Garante integridade dos dados em localStorage e Supabase
 */

export const EnrichedSongDataSchema = z.object({
  title: z.string(),
  artist: z.string(),
  album: z.string().optional(),
  year: z.number().optional(),
  composer: z.string().optional(),
  status: z.enum(['pending', 'enriching', 'enriched', 'validated', 'rejected', 'error']),
  suggestions: z.object({
    composer: z.string().optional(),
    album: z.string().optional(),
    year: z.number().optional(),
    confidence: z.number().min(0).max(100).optional(),
    source: z.string().optional(),
  }).optional(),
  error: z.string().optional(),
});

export const EnrichmentMetricsSchema = z.object({
  totalSongs: z.number().int().min(0),
  pendingSongs: z.number().int().min(0),
  enrichedSongs: z.number().int().min(0),
  validatedSongs: z.number().int().min(0),
  rejectedSongs: z.number().int().min(0),
  errorCount: z.number().int().min(0),
  averageConfidence: z.number().min(0).max(100).optional(),
  totalProcessingTime: z.number().int().min(0),
  averageTimePerSong: z.number().min(0).optional(),
});

export const EnrichmentSessionSchema = z.object({
  // Identificação
  corpusType: z.enum(['gaucho', 'nordestino']),
  sessionName: z.string().optional(),
  
  // Dados
  songs: z.array(EnrichedSongDataSchema),
  
  // Estado
  currentIndex: z.number().int().min(0),
  isEnriching: z.boolean(),
  isPaused: z.boolean(),
  
  // Métricas
  metrics: EnrichmentMetricsSchema,
  
  // Timestamps
  startedAt: z.string().datetime(),
  lastSavedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  
  // Versionamento
  schemaVersion: z.number().int().default(1),
});

export type EnrichedSongData = z.infer<typeof EnrichedSongDataSchema>;
export type EnrichmentMetrics = z.infer<typeof EnrichmentMetricsSchema>;
export type EnrichmentSession = z.infer<typeof EnrichmentSessionSchema>;

/**
 * Valida e sanitiza dados de sessão
 * Retorna dados válidos ou lança erro com detalhes
 */
export function validateEnrichmentSession(data: unknown): EnrichmentSession {
  return EnrichmentSessionSchema.parse(data);
}

/**
 * Valida dados parcialmente (para updates)
 */
export function validatePartialSession(data: unknown): Partial<EnrichmentSession> {
  return EnrichmentSessionSchema.partial().parse(data);
}

/**
 * Migra dados de versões antigas do schema
 */
export function migrateSessionSchema(data: any, fromVersion: number): EnrichmentSession {
  let migrated = data;
  
  // Exemplo: migração de v1 para v2 (quando necessário no futuro)
  if (fromVersion === 1) {
    // Adicionar novos campos com valores default
    migrated = {
      ...migrated,
      schemaVersion: 2,
      // ... outros campos novos
    };
  }
  
  return validateEnrichmentSession(migrated);
}
