/**
 * Barrel exports para hooks
 * Facilita imports: import { useAuth, useAsyncJob } from '@/hooks'
 */

// Core
export * from './core';

// Semantic (consolidado)
export * from './semantic';

// Auth & User
export { useAuth } from './useAuth';
export { useFeatureAccess } from './useFeatureAccess';

// Jobs
export { useEnrichmentJob, useEnrichmentJobsList, useOrphanedEnrichmentJobs } from './useEnrichmentJob';
export { useProcessingPipeline } from './useProcessingPipeline';
export { useActiveJobs } from './useActiveJobs';
export { useEnrichmentHeartbeat } from './useEnrichmentHeartbeat';
export { useEnrichmentLiveMetrics } from './useEnrichmentLiveMetrics';
export { EnrichmentJobsProvider, useEnrichmentJobsContext } from '@/contexts/EnrichmentJobsContext';

// Music Catalog
export { useCatalogData } from './useCatalogData';
export { useCatalogExtendedStats } from './useCatalogExtendedStats';
export { useArtistSongs } from './useArtistSongs';
export { useDeduplication } from './useDeduplication';
export { useEnrichment } from './useEnrichment';
export { useGlobalEnrichmentStats } from './useGlobalEnrichmentStats';

// Analysis
export { useBasicToolsAnalysis } from './useBasicToolsAnalysis';
export { useFullAnalysis } from './useFullAnalysis';
export { useKeywords } from './useKeywords';
export { useLexicalDomainsData } from './useLexicalDomainsData';
export { useLexicalKWIC } from './useLexicalKWIC';

// UI & Navigation
export { useBreadcrumbs } from './useBreadcrumbs';
export { useIsActiveRoute } from './useIsActiveRoute';
export { useNavigationLevel } from './useNavigationLevel';
export { usePagination } from './usePagination';

// Curation
export { useNCCuration } from './useNCCuration';
export { useInsigniaCuration } from './useInsigniaCuration';
export { useTagsetCuration } from './useTagsetCuration';
export { useHumanValidation } from './useHumanValidation';

// DevOps
export { useDevOpsMetrics } from './useDevOpsMetrics';
export { useRealtimeDevOps } from './useRealtimeDevOps';
export { useSystemHealth } from './useSystemHealth';
export { useCodeScanHistory } from './useCodeScanHistory';

// Utils
export { useRateLimiter } from './useRateLimiter';
export { useNetworkStatus } from './useNetworkStatus';
export { useSaveIndicator } from './useSaveIndicator';
export { useToolCache } from './useToolCache';
