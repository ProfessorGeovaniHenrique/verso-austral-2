/**
 * Tab de Artistas do MusicCatalog
 * Sprint F2.1 - Refatoração
 */

import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArtistCard } from '@/components/music';
import { CorpusAnnotationJobCard } from '@/components/music/CorpusAnnotationJobCard';
import { Sparkles, Loader2, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useYouTubeEnrichment } from '@/hooks/useYouTubeEnrichment';
import { useOrphanedEnrichmentJobs } from '@/hooks/useEnrichmentJob';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('TabArtists');

interface TabArtistsProps {
  artists: any[];
  paginatedArtists: any[];
  allSongs: any[];
  loading: boolean;
  selectedLetter: string;
  onLetterChange: (letter: string) => void;
  pendingCountForLetter: number;
  enrichingByLetter: boolean;
  onEnrichByLetter: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isDataRefreshing: boolean;
  onRefresh: () => void;
  artistStatsOverrides: Map<string, any>;
  onViewArtistDetails: (artistId: string) => void;
  onAnnotateArtist: (artistId: string, artistName: string) => Promise<any>;
  isAnnotatingArtist: (artistId: string) => boolean;
  onOpenEnrichmentModal: (songs: any[], artistId: string) => void;
  onDeleteArtist: (artistId: string, artistName: string) => Promise<void>;
  reload: () => Promise<void>;
  totalSongs: number;
  selectedCorpusId?: string;
  selectedCorpusName?: string;
}

const AlphabetFilter = memo(({ selectedLetter, onLetterChange }: { 
  selectedLetter: string; 
  onLetterChange: (letter: string) => void;
}) => (
  <div className="flex flex-wrap gap-1 p-4 bg-card rounded-lg border mb-4">
    <Button
      size="sm"
      variant={selectedLetter === 'all' ? 'default' : 'outline'}
      onClick={() => onLetterChange('all')}
      className="h-8 px-3 text-xs"
    >
      Todos
    </Button>
    {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
      <Button
        key={letter}
        size="sm"
        variant={selectedLetter === letter ? 'default' : 'outline'}
        onClick={() => onLetterChange(letter)}
        className="h-8 w-8 p-0 text-xs font-mono"
      >
        {letter}
      </Button>
    ))}
  </div>
));

AlphabetFilter.displayName = 'AlphabetFilter';

export function TabArtists({
  artists,
  paginatedArtists,
  allSongs,
  loading,
  selectedLetter,
  onLetterChange,
  pendingCountForLetter,
  enrichingByLetter,
  onEnrichByLetter,
  currentPage,
  totalPages,
  onPageChange,
  isDataRefreshing,
  onRefresh,
  artistStatsOverrides,
  onViewArtistDetails,
  onAnnotateArtist,
  isAnnotatingArtist,
  onOpenEnrichmentModal,
  onDeleteArtist,
  reload,
  totalSongs,
  selectedCorpusId,
  selectedCorpusName,
}: TabArtistsProps) {
  const { toast } = useToast();
  const { enrichYouTubeBatch } = useYouTubeEnrichment();
  const { orphanedJobs, cleanupOrphanedJobs, isLoading: loadingOrphaned } = useOrphanedEnrichmentJobs();

  const handleEnrichArtist = useCallback(async (artist: any) => {
    try {
      const { data: pendingSongsData, error } = await supabase
        .from('songs')
        .select('id, title')
        .eq('artist_id', artist.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!pendingSongsData || pendingSongsData.length === 0) {
        toast({
          title: "Nenhuma música pendente",
          description: `Todas as músicas de ${artist.name} já estão enriquecidas.`,
        });
        return;
      }

      onOpenEnrichmentModal(
        pendingSongsData.map(s => ({ ...s, artist: artist.name })),
        artist.id
      );
    } catch (error) {
      log.error('Error fetching pending songs', error as Error, { artistId: artist.id });
      toast({
        title: "Erro ao buscar músicas",
        description: "Tente novamente.",
        variant: "destructive"
      });
    }
  }, [onOpenEnrichmentModal, toast]);

  const handleYouTubeEnrich = useCallback(async (artist: any) => {
    try {
      const { data: songsWithoutYT, error } = await supabase
        .from('songs')
        .select('id, title')
        .eq('artist_id', artist.id)
        .is('youtube_url', null);

      if (error) throw error;

      if (!songsWithoutYT || songsWithoutYT.length === 0) {
        toast({
          title: "Todas têm YouTube",
          description: `${artist.name} já possui links do YouTube.`,
        });
        return;
      }

      toast({
        title: "Buscando links do YouTube...",
        description: `Processando ${songsWithoutYT.length} músicas de ${artist.name}`,
      });

      const songIds = songsWithoutYT.map(s => s.id);
      const results = await enrichYouTubeBatch(songIds);
      
      const successCount = results?.success || 0;
      const notFoundCount = results?.notFound || 0;
      const errorCount = results?.error || 0;

      if (successCount === 0 && errorCount === songIds.length) {
        toast({
          title: "⚠️ Limite de API do YouTube atingido",
          description: "Tente novamente amanhã.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "✅ Enriquecimento YouTube concluído",
        description: `${successCount} links encontrados, ${notFoundCount} não encontradas.`,
      });
    } catch (error) {
      log.error('Error enriching YouTube', error as Error, { artistId: artist.id });
      toast({
        title: "Erro ao buscar YouTube",
        description: "Tente novamente.",
        variant: "destructive"
      });
    }
  }, [enrichYouTubeBatch, toast]);

  const handleDelete = useCallback(async (artist: any) => {
    try {
      const { error: songsError } = await supabase.from('songs').delete().eq('artist_id', artist.id);
      if (songsError) throw songsError;
      
      const { error: artistError } = await supabase.from('artists').delete().eq('id', artist.id);
      if (artistError) throw artistError;
      
      await reload();
      toast({
        title: "Sucesso!",
        description: `Artista ${artist.name} excluído com sucesso`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: 'Erro ao excluir artista',
        variant: "destructive",
      });
    }
  }, [reload, toast]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Carregando artistas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Card de Anotação de Corpus */}
      {selectedCorpusId && selectedCorpusName && (
        <CorpusAnnotationJobCard
          corpusId={selectedCorpusId}
          corpusName={selectedCorpusName}
        />
      )}

      {/* Alerta de Jobs Órfãos */}
      {orphanedJobs.length > 0 && (
        <Alert variant="destructive" className="border-amber-500 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-amber-700">
              {orphanedJobs.length} job(s) de enriquecimento travado(s) detectado(s).
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={cleanupOrphanedJobs}
              disabled={loadingOrphaned}
              className="ml-4"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Limpar Jobs Abandonados
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <AlphabetFilter selectedLetter={selectedLetter} onLetterChange={onLetterChange} />

      {/* Batch Enrich by Letter */}
      {selectedLetter !== 'all' && artists.length > 0 && pendingCountForLetter > 0 && (
        <div className="p-4 bg-card rounded-lg border">
          <Button
            onClick={onEnrichByLetter}
            className="w-full gap-2"
            disabled={enrichingByLetter}
          >
            {enrichingByLetter ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enriquecendo artistas com {selectedLetter}...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Enriquecer todos com "{selectedLetter}" ({pendingCountForLetter} pendentes)
              </>
            )}
          </Button>
        </div>
      )}

      {artists.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {selectedLetter !== 'all' 
              ? `Nenhum artista encontrado com a letra ${selectedLetter}`
              : 'Nenhum artista encontrado'
            }
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">
                {artists.length} {artists.length === 1 ? 'Artista' : 'Artistas'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {totalSongs} músicas no total
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isDataRefreshing && (
                <Badge variant="secondary" className="animate-pulse">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Sincronizando...
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading || isDataRefreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedArtists.map((artist) => {
              const statsOverride = artistStatsOverrides.get(artist.id);
              const displayPendingSongs = statsOverride?.pendingSongs ?? artist.pendingSongs ?? 0;
              const displayEnrichedPercentage = statsOverride?.enrichedPercentage ?? artist.enrichedPercentage ?? 0;
              
              return (
                <ArtistCard 
                  key={artist.id}
                  id={artist.id}
                  name={artist.name}
                  genre={artist.genre}
                  corpusName={artist.corpora?.name}
                  corpusColor={artist.corpora?.color}
                  totalSongs={artist.totalSongs || 0}
                  pendingSongs={displayPendingSongs}
                  enrichedPercentage={displayEnrichedPercentage}
                  isAnnotatingSemantic={isAnnotatingArtist(artist.id)}
                  onViewDetails={() => onViewArtistDetails(artist.id)}
                  onAnnotateSemantic={async () => {
                    try {
                      const { count: totalWords } = await supabase
                        .from('semantic_disambiguation_cache')
                        .select('*', { count: 'exact', head: true })
                        .eq('artist_id', artist.id);
                      
                      if (totalWords && totalWords > 0) {
                        const confirmed = window.confirm(
                          `${artist.name} já possui ${totalWords} palavras anotadas.\n\nDeseja continuar?`
                        );
                        if (!confirmed) return;
                      }
                      
                      await onAnnotateArtist(artist.id, artist.name);
                    } catch (error) {
                      log.error('Error starting annotation', error as Error, { artistId: artist.id });
                    }
                  }}
                  onEnrich={() => handleEnrichArtist(artist)}
                  onDelete={() => handleDelete(artist)}
                />
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8 pb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                ← Anterior
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({artists.length} artistas)
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Próxima →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
