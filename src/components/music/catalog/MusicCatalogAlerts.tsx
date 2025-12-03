/**
 * Alerts do MusicCatalog - simplificado
 * Botões de iniciar jobs movidos para aba Enriquecimento
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Filter, RefreshCw, ArrowRight, Info } from 'lucide-react';
import { useEnrichmentJob } from '@/hooks/useEnrichmentJob';
import { EnrichmentJobCard } from '@/components/music/EnrichmentJobCard';
import { Link } from 'react-router-dom';

interface MusicCatalogAlertsProps {
  // Active filters alert
  statusFilter: string;
  selectedCorpusFilter: string;
  showSuspiciousOnly: boolean;
  corpora: Array<{ id: string; name: string; color: string | null }>;
  onClearFilters: () => void;
  onNavigateToEnrichment?: () => void;
  
  // Stats for info display
  pendingSongs: number;
  songsWithoutYouTube: number;
}

export function MusicCatalogAlerts({
  statusFilter,
  selectedCorpusFilter,
  showSuspiciousOnly,
  corpora,
  onClearFilters,
  onNavigateToEnrichment,
  pendingSongs,
  songsWithoutYouTube,
}: MusicCatalogAlertsProps) {
  const hasActiveFilters = statusFilter !== 'all' || selectedCorpusFilter !== 'all' || showSuspiciousOnly;
  
  // Apenas para exibir cards de jobs ativos
  const metadataJob = useEnrichmentJob({ jobType: 'metadata' });
  const youtubeJob = useEnrichmentJob({ jobType: 'youtube' });
  const lyricsJob = useEnrichmentJob({ jobType: 'lyrics' });
  
  const hasAnyActiveJob = metadataJob.activeJob || youtubeJob.activeJob || lyricsJob.activeJob;
  const hasNeedingEnrichment = pendingSongs > 0 || songsWithoutYouTube > 0;

  return (
    <div className="space-y-4">
      {/* Active Filters Alert */}
      {hasActiveFilters && (
        <Alert className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
          <Filter className="h-4 w-4 text-blue-500" />
          <AlertTitle>Filtros Ativos</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span className="text-sm">
                As visualizações estão filtradas.
                {statusFilter !== 'all' && <strong> Status: {statusFilter}</strong>}
                {selectedCorpusFilter !== 'all' && (
                  <strong> Corpus: {selectedCorpusFilter === 'null' ? 'Sem classificação' : corpora.find(c => c.id === selectedCorpusFilter)?.name}</strong>
                )}
                {showSuspiciousOnly && <strong> Dados Suspeitos: Apenas problemáticos</strong>}
              </span>
              <Button variant="outline" size="sm" onClick={onClearFilters} className="w-full sm:w-auto">
                <RefreshCw className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Jobs Ativos - Cards compactos */}
      {metadataJob.activeJob && (
        <EnrichmentJobCard jobType="metadata" compact={true} />
      )}
      {youtubeJob.activeJob && (
        <EnrichmentJobCard jobType="youtube" compact={true} />
      )}
      {lyricsJob.activeJob && (
        <EnrichmentJobCard jobType="lyrics" compact={true} />
      )}

      {/* Info sobre músicas pendentes - sem botões de ação */}
      {!hasAnyActiveJob && hasNeedingEnrichment && (
        <Alert className="border-muted">
          <Info className="h-4 w-4 text-muted-foreground" />
          <AlertTitle className="text-sm font-medium">Músicas Aguardando Enriquecimento</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {pendingSongs > 0 && <span>{pendingSongs.toLocaleString()} sem metadados</span>}
                {pendingSongs > 0 && songsWithoutYouTube > 0 && <span> · </span>}
                {songsWithoutYouTube > 0 && <span>{songsWithoutYouTube.toLocaleString()} sem YouTube</span>}
              </div>
              {onNavigateToEnrichment && (
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={onNavigateToEnrichment}
                  className="h-auto p-0 text-primary"
                >
                  Gerenciar na aba Enriquecimento
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
