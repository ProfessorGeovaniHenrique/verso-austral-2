/**
 * MusicCatalog - Componente principal refatorado
 * Sprint F2.1 - Reduzido de 1830 para ~350 linhas
 */

import { useMemo, useState } from 'react';
import { createLogger } from '@/lib/loggerFactory';
import { supabase } from '@/integrations/supabase/client';
import { enrichmentService } from '@/services/enrichmentService';
import { ArtistDetailsSheet } from '@/components/music/ArtistDetailsSheet';
import { EnrichmentBatchModal } from '@/components/music/EnrichmentBatchModal';
import { YouTubeEnrichmentModal } from '@/components/music/YouTubeEnrichmentModal';
import { SertanejoPopulateCard } from '@/components/music/SertanejoPopulateCard';
import { TabEnrichmentJobs } from '@/components/music/TabEnrichmentJobs';
import { TabScrapingJobs } from '@/components/music/TabScrapingJobs';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Briefcase, Download } from 'lucide-react';

// Hooks refatorados
import { 
  useMusicCatalogState, 
  useMusicCatalogHandlers, 
  useFilteredData 
} from '@/hooks/music-catalog';

// Componentes refatorados
import {
  MusicCatalogToolbar,
  MusicCatalogFilters,
  MusicCatalogAlerts,
  CatalogStatsOverview,
  TabSongs,
  TabArtists,
  TabStats,
  TabMetrics,
  TabValidation,
  TabDeduplication,
} from '@/components/music/catalog';

const log = createLogger('MusicCatalog');

export default function MusicCatalog() {
  const { toast } = useToast();
  const [showSertanejoModal, setShowSertanejoModal] = useState(false);
  
  // Hook centralizado de estados
  const state = useMusicCatalogState();
  
  // Hook centralizado de handlers
  const handlers = useMusicCatalogHandlers(state);
  
  // Hook de dados filtrados
  const { filteredSongs, filteredArtists, paginatedArtists, totalArtistPages } = useFilteredData(
    state,
    handlers.convertToSongCard,
    handlers.hasSuspiciousData
  );

  // Corpus options para filtros
  const corpusOptions = useMemo(() => state.corpora, [state.corpora]);
  
  // Handler para enriquecer por letra
  const handleEnrichByLetter = async () => {
    try {
      state.setEnrichingByLetter(true);
      const artistIds = filteredArtists.map(a => a.id);
      
      toast({
        title: "Buscando músicas pendentes...",
        description: `Consultando músicas dos ${artistIds.length} artistas com "${state.selectedLetter}"`,
      });

      const { data: pendingSongsData, error } = await supabase
        .from('songs')
        .select(`id, title, artists (name)`)
        .in('artist_id', artistIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (!pendingSongsData || pendingSongsData.length === 0) {
        toast({
          title: "Nenhuma música pendente",
          description: `Todas as músicas dos artistas com "${state.selectedLetter}" já estão enriquecidas.`,
        });
        return;
      }
      
      const songsForBatch = pendingSongsData.map(song => ({
        id: song.id,
        title: song.title,
        artist: (song.artists as any)?.name || 'Desconhecido'
      }));
      
      state.setPendingSongsForBatch(songsForBatch);
      state.setBatchModalOpen(true);
    } catch (error: any) {
      log.error('Failed to enrich by letter', error);
      toast({
        title: "Erro ao buscar músicas",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      state.setEnrichingByLetter(false);
    }
  };

  // Handler deletar artista
  const handleArtistDelete = async (artistId: string, artistName: string) => {
    try {
      await supabase.from('songs').delete().eq('artist_id', artistId);
      await supabase.from('artists').delete().eq('id', artistId);
      await state.reload();
      toast({ title: "Sucesso!", description: `Artista ${artistName} excluído` });
    } catch {
      toast({ title: "Erro", description: 'Erro ao excluir artista', variant: "destructive" });
    }
  };

  return (
    <div className="space-y-0">
      {/* Toolbar */}
      <MusicCatalogToolbar
        searchQuery={state.searchQuery}
        onSearchChange={state.setSearchQuery}
        viewMode={state.viewMode}
        onViewModeChange={state.setViewMode}
        onRefresh={state.reload}
        isClearingCatalog={state.isClearingCatalog}
        onClearCatalog={handlers.handleClearCatalog}
        totalSongs={state.catalogStats?.totalSongs || 0}
        totalArtists={state.catalogStats?.totalArtists || 0}
      />

      {/* Main content */}
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Catálogo de Músicas</h1>
              <p className="text-muted-foreground">
                {state.catalogStats?.totalSongs || 0} músicas | {state.catalogStats?.totalArtists || 0} artistas | 
                Confiança média: {(state.catalogStats?.avgConfidence || 0).toFixed(1)}/100
                {(state.catalogStats?.pendingSongs || 0) > 0 && ` | ${state.catalogStats?.pendingSongs} aguardando enriquecimento`}
              </p>
            </div>

            <MusicCatalogFilters
              statusFilter={state.statusFilter}
              onStatusFilterChange={state.setStatusFilter}
              showSuspiciousOnly={state.showSuspiciousOnly}
              onShowSuspiciousChange={state.setShowSuspiciousOnly}
              selectedCorpusFilter={state.selectedCorpusFilter}
              onCorpusFilterChange={state.setSelectedCorpusFilter}
              corpora={corpusOptions}
              onOpenSertanejoImport={() => setShowSertanejoModal(true)}
            />
          </div>
        </div>

        <MusicCatalogAlerts
          statusFilter={state.statusFilter}
          selectedCorpusFilter={state.selectedCorpusFilter}
          showSuspiciousOnly={state.showSuspiciousOnly}
          corpora={corpusOptions}
          onClearFilters={() => {
            state.setStatusFilter('all');
            state.setSelectedCorpusFilter('all');
            state.setShowSuspiciousOnly(false);
          }}
          pendingSongs={state.catalogStats?.pendingSongs || 0}
          songsWithoutYouTube={state.songsWithoutYouTube.length}
          onNavigateToEnrichment={() => state.setView('enrichment-jobs')}
        />

        {/* Card de resumo de estatísticas por corpus */}
        <CatalogStatsOverview />

        {/* Card para popular Corpus Sertanejo quando vazio */}
        {state.selectedCorpusFilter !== 'all' && 
         corpusOptions.find(c => c.id === state.selectedCorpusFilter)?.normalized_name === 'sertanejo' &&
         filteredArtists.length === 0 && (
          <SertanejoPopulateCard onComplete={() => state.reload()} />
        )}

        <Tabs value={state.view} onValueChange={(v) => state.setView(v as any)} className="space-y-4">
          <TabsList>
            <TabsTrigger value="songs">Músicas</TabsTrigger>
            <TabsTrigger value="artists">
              Artistas {state.selectedLetter !== 'all' && `(${state.selectedLetter})`}
            </TabsTrigger>
            <TabsTrigger value="scraping-jobs" className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              Scraping
            </TabsTrigger>
            <TabsTrigger value="enrichment-jobs" className="flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              Enriquecimento
            </TabsTrigger>
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
            <TabsTrigger value="metrics">Métricas</TabsTrigger>
            <TabsTrigger value="validation">🧪 Validação</TabsTrigger>
            <TabsTrigger value="deduplication">🗑️ Deduplicação</TabsTrigger>
          </TabsList>

          <TabsContent value="songs">
            <TabSongs
              songs={filteredSongs}
              loading={state.loading}
              viewMode={state.viewMode}
              searchQuery={state.searchQuery}
              enrichingIds={state.enrichingIds}
              onEnrich={handlers.handleEnrichSongUI}
              onReEnrich={handlers.handleReEnrichSong}
              onMarkReviewed={handlers.handleMarkReviewed}
              onDelete={handlers.handleDeleteSong}
              onEdit={handlers.handleEditSong}
            />
          </TabsContent>

          <TabsContent value="artists">
            <TabArtists
              artists={filteredArtists}
              paginatedArtists={paginatedArtists}
              allSongs={state.allSongs}
              loading={state.catalogLoading}
              isDataRefreshing={state.isDataRefreshing}
              selectedLetter={state.selectedLetter}
              onLetterChange={state.setSelectedLetter}
              pendingCountForLetter={state.pendingCountForLetter}
              enrichingByLetter={state.enrichingByLetter}
              onEnrichByLetter={handleEnrichByLetter}
              currentPage={state.currentArtistPage}
              totalPages={totalArtistPages}
              onPageChange={state.setCurrentArtistPage}
              totalSongs={state.catalogStats?.totalSongs || 0}
              artistStatsOverrides={state.artistStatsOverrides}
              onRefresh={() => state.reloadWithDelay(500)}
              onViewArtistDetails={(artistId) => {
                state.setSelectedArtistId(artistId);
                state.setIsSheetOpen(true);
              }}
              onOpenEnrichmentModal={(songs, artistId) => {
                state.setSongsToEnrich(songs);
                state.setSelectedArtistId(artistId);
                state.setIsEnrichmentModalOpen(true);
              }}
              onDeleteArtist={handleArtistDelete}
              onAnnotateArtist={state.annotateArtist}
              isAnnotatingArtist={state.isAnnotatingArtist}
              reload={state.reload}
            />
          </TabsContent>

          <TabsContent value="scraping-jobs">
            <TabScrapingJobs />
          </TabsContent>

          <TabsContent value="enrichment-jobs">
            <TabEnrichmentJobs />
          </TabsContent>

          <TabsContent value="stats">
            <TabStats 
              totalSongs={state.catalogStats?.totalSongs || 0}
              totalArtists={state.catalogStats?.totalArtists || 0}
              avgConfidence={state.catalogStats?.avgConfidence || 0}
            />
          </TabsContent>

          <TabsContent value="metrics">
            <TabMetrics
              metrics={state.enrichmentMetrics}
              loading={state.metricsLoading}
              onRefresh={state.refetchMetrics}
              onExportReport={handlers.handleExportReport}
            />
          </TabsContent>

          <TabsContent value="validation">
            <TabValidation />
          </TabsContent>

          <TabsContent value="deduplication">
            <TabDeduplication />
          </TabsContent>
        </Tabs>

        {/* Modais */}
        <EnrichmentBatchModal
          open={state.batchModalOpen}
          onOpenChange={state.setBatchModalOpen}
          songIds={state.pendingSongsForBatch.map(s => s.id)}
          onComplete={() => {
            handlers.handleBatchComplete(0);
            state.setBatchModalOpen(false);
          }}
        />

        <YouTubeEnrichmentModal
          open={state.youtubeModalOpen}
          onOpenChange={state.setYoutubeModalOpen}
          pendingSongs={state.songsWithoutYouTube}
          onComplete={() => handlers.handleBatchComplete(0)}
        />

        <EnrichmentBatchModal
          open={state.isEnrichmentModalOpen}
          onOpenChange={state.setIsEnrichmentModalOpen}
          artistId={state.selectedArtistId || ''}
          artistName={state.artistsWithStats.find(a => a.id === state.selectedArtistId)?.name || ''}
          songIds={state.songsToEnrich.map(s => s.id)}
          onComplete={() => {
            handlers.handleBatchComplete(0, state.selectedArtistId || undefined);
            state.setIsEnrichmentModalOpen(false);
            state.setSongsToEnrich([]);
          }}
        />

        <ArtistDetailsSheet
          open={state.isSheetOpen}
          onOpenChange={state.setIsSheetOpen}
          artistId={state.selectedArtistId}
          artist={state.selectedArtistId ? (() => {
            const foundArtist = state.artistsWithStats.find(a => a.id === state.selectedArtistId);
            const corpus = state.corpora.find(c => c.id === foundArtist?.corpus_id);
            return {
              ...foundArtist,
              ...state.artistBioOverrides.get(state.selectedArtistId),
              corpus_type: corpus?.normalized_name as 'gaucho' | 'sertanejo' | 'nordestino' | null
            };
          })() : null}
          songs={state.artistSongs.map(song => ({
            id: song.id,
            title: song.title,
            normalized_title: song.normalized_title || null,
            artist_id: song.artist_id,
            composer: song.composer,
            release_year: song.release_year,
            lyrics: song.lyrics,
            status: song.status || 'pending',
            confidence_score: song.confidence_score,
            enrichment_source: song.enrichment_source,
            youtube_url: song.youtube_url,
            corpus_id: song.corpus_id,
            upload_id: song.upload_id,
            raw_data: song.raw_data || {},
            created_at: song.created_at || '',
            updated_at: song.updated_at || '',
            artists: song.artists ? {
              id: song.artists.id,
              name: song.artists.name,
              genre: song.artists.genre,
              corpus_id: null
            } : null,
            corpora: song.corpora
          }))}
          onEnrichSong={handlers.handleEnrichSong}
          onEditSong={handlers.handleEditSong}
          onReEnrichSong={handlers.handleReEnrichSong}
          onMarkReviewed={handlers.handleMarkReviewed}
          onDeleteSong={handlers.handleDeleteSong}
          onAnnotateSong={async (songId: string) => {
            const song = state.artistSongs.find(s => s.id === songId);
            if (!song) return;
            
            const coverage = await state.checkSongCoverage(songId);
            if (coverage && coverage.coverage >= 95) {
              const confirmed = window.confirm(
                `"${song.title}" já possui ${coverage.coverage.toFixed(1)}% de cobertura.\n\nDeseja reprocessar?`
              );
              if (!confirmed) return;
            }
            
            await state.annotateSong(songId, song.title);
          }}
          annotatingSongIds={new Set(Array.from(state.songProgress.keys()))}
          onBioEnriched={handlers.handleBioEnriched}
        />
      </div>

      {/* Modal para importar Sertanejo */}
      <Dialog open={showSertanejoModal} onOpenChange={setShowSertanejoModal}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <SertanejoPopulateCard 
            onComplete={() => {
              setShowSertanejoModal(false);
              state.reload();
            }} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
