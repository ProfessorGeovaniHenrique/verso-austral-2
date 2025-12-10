/**
 * Tab de Artistas do MusicCatalog - Versão com tipos fortes
 * Sprint AUDIT - BE-A02: Elimina tipagem any
 */

import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ArtistCard } from '@/components/music';
import { CorpusAnnotationJobCard } from '@/components/music/CorpusAnnotationJobCard';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Sparkles, Loader2, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useYouTubeEnrichment } from '@/hooks/useYouTubeEnrichment';
import { useOrphanedEnrichmentJobs } from '@/hooks/useEnrichmentJob';
import { createLogger } from '@/lib/loggerFactory';

const log = createLogger('TabArtists');

// Interfaces tipadas (BE-A02)
interface ArtistCorpus {
  id: string;
  name: string;
  color: string | null;
}

interface ArtistStats {
  pendingSongs: number;
  enrichedPercentage: number;
}

interface Artist {
  id: string;
  name: string;
  genre: string | null;
  totalSongs: number;
  pendingSongs: number;
  enrichedPercentage: number;
  corpora: ArtistCorpus | null;
}

interface Song {
  id: string;
  title: string;
  artist?: string;
}

interface TabArtistsProps {
  artists: Artist[];
  paginatedArtists: Artist[];
  allSongs: Song[];
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
  artistStatsOverrides: Map<string, ArtistStats>;
  onViewArtistDetails: (artistId: string) => void;
  onAnnotateArtist: (artistId: string, artistName: string) => Promise<void>;
  isAnnotatingArtist: (artistId: string) => boolean;
  onOpenEnrichmentModal: (songs: Song[], artistId: string) => void;
  onDeleteArtist: (artistId: string, artistName: string) => Promise<void>;
  reload: () => Promise<void>;
  totalSongs: number;
  selectedCorpusId?: string;
  selectedCorpusName?: string;
  itemsPerPage?: number;
}

const LETTERS = ['all', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

const AlphabetFilter = memo(({ 
  selectedLetter, 
  onLetterChange,
  artistCounts 
}: { 
  selectedLetter: string; 
  onLetterChange: (letter: string) => void;
  artistCounts?: Map<string, number>;
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, letter: string, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onLetterChange(letter);
      return;
    }

    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const container = e.currentTarget.closest('[data-alphabet-container]');
      const buttons = container?.querySelectorAll('button');
      if (!buttons) return;
      
      const nextIndex = e.key === 'ArrowRight' 
        ? Math.min(index + 1, buttons.length - 1)
        : Math.max(index - 1, 0);
      
      (buttons[nextIndex] as HTMLButtonElement)?.focus();
    }

    if (e.key === 'Home') {
      e.preventDefault();
      const container = e.currentTarget.closest('[data-alphabet-container]');
      const buttons = container?.querySelectorAll('button');
      (buttons?.[0] as HTMLButtonElement)?.focus();
    }

    if (e.key === 'End') {
      e.preventDefault();
      const container = e.currentTarget.closest('[data-alphabet-container]');
      const buttons = container?.querySelectorAll('button');
      if (buttons) (buttons[buttons.length - 1] as HTMLButtonElement)?.focus();
    }
  };

  return (
    <div 
      className="bg-card rounded-lg border mb-4"
      role="group"
      aria-label="Filtro alfabético de artistas"
      data-tour="alphabet-filter"
    >
      {/* Mobile: Scroll horizontal */}
      <div className="block sm:hidden">
        <ScrollArea className="w-full">
          <div className="flex gap-1 p-4" data-alphabet-container>
            {LETTERS.map((letter, index) => {
              const count = artistCounts?.get(letter) || 0;
              return (
                <Button
                  key={letter}
                  size="sm"
                  variant={selectedLetter === letter ? 'default' : 'outline'}
                  onClick={() => onLetterChange(letter)}
                  onKeyDown={(e) => handleKeyDown(e, letter, index)}
                  tabIndex={selectedLetter === letter ? 0 : -1}
                  aria-pressed={selectedLetter === letter}
                  aria-label={letter === 'all' ? 'Mostrar todos os artistas' : `Filtrar por letra ${letter}${count > 0 ? `, ${count} artistas` : ''}`}
                  className={letter === 'all' ? 'h-8 px-3 text-xs shrink-0' : 'h-8 min-w-8 p-0 text-xs font-mono shrink-0'}
                >
                  {letter === 'all' ? 'Todos' : letter}
                  {/* UX-U03: Badge com contagem */}
                  {letter !== 'all' && count > 0 && (
                    <span className="ml-1 text-[10px] opacity-70">({count})</span>
                  )}
                </Button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
      
      {/* Desktop: Flex wrap */}
      <div className="hidden sm:flex flex-wrap gap-1 p-4" data-alphabet-container>
        {LETTERS.map((letter, index) => {
          const count = artistCounts?.get(letter) || 0;
          return (
            <Button
              key={letter}
              size="sm"
              variant={selectedLetter === letter ? 'default' : 'outline'}
              onClick={() => onLetterChange(letter)}
              onKeyDown={(e) => handleKeyDown(e, letter, index)}
              tabIndex={selectedLetter === letter ? 0 : -1}
              aria-pressed={selectedLetter === letter}
              aria-label={letter === 'all' ? 'Mostrar todos os artistas' : `Filtrar por letra ${letter}${count > 0 ? `, ${count} artistas` : ''}`}
              className={letter === 'all' ? 'h-8 px-3 text-xs' : 'h-8 min-w-8 px-2 text-xs font-mono'}
            >
              {letter === 'all' ? 'Todos' : letter}
              {letter !== 'all' && count > 0 && (
                <span className="ml-1 text-[10px] opacity-70">({count})</span>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
});

AlphabetFilter.displayName = 'AlphabetFilter';

export function TabArtistsTyped({
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
  itemsPerPage = 12,
}: TabArtistsProps) {
  const { toast } = useToast();
  const { enrichYouTubeBatch } = useYouTubeEnrichment();
  const { orphanedJobs, cleanupOrphanedJobs, isLoading: loadingOrphaned } = useOrphanedEnrichmentJobs();

  // Calcular contagem por letra (UX-U03)
  const artistCounts = new Map<string, number>();
  artists.forEach(artist => {
    const firstLetter = artist.name[0]?.toUpperCase() || '';
    artistCounts.set(firstLetter, (artistCounts.get(firstLetter) || 0) + 1);
  });
  artistCounts.set('all', artists.length);

  const handleEnrichArtist = useCallback(async (artist: Artist) => {
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

  const handleYouTubeEnrich = useCallback(async (artist: Artist) => {
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
          title: "Limite de API do YouTube atingido",
          description: "Tente novamente amanhã.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Enriquecimento YouTube concluído",
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

  // BE-D01: AlertDialog ao invés de window.confirm
  const handleDeleteWithConfirmation = useCallback(async (artist: Artist) => {
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

      <AlphabetFilter 
        selectedLetter={selectedLetter} 
        onLetterChange={onLetterChange}
        artistCounts={artistCounts}
      />

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
                        // Será tratado pelo AlertDialog no próprio ArtistCard
                      }
                      
                      await onAnnotateArtist(artist.id, artist.name);
                    } catch (error) {
                      log.error('Error starting annotation', error as Error, { artistId: artist.id });
                    }
                  }}
                  onEnrich={() => handleEnrichArtist(artist)}
                  onDelete={() => handleDeleteWithConfirmation(artist)}
                />
              );
            })}
          </div>

          {/* Pagination com aria-current (UX-A02) */}
          {totalPages > 1 && (
            <nav 
              className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 mt-8 pb-4"
              aria-label="Paginação de artistas"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                aria-label="Ir para página anterior"
              >
                ← Anterior
              </Button>
              
              <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center">
                <span className="text-sm font-medium" aria-live="polite">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, artists.length)} de {artists.length}
                </span>
                <span 
                  className="text-xs text-muted-foreground hidden sm:inline"
                  aria-current="page"
                >
                  • Página {currentPage} de {totalPages}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                aria-label="Ir para próxima página"
              >
                Próxima →
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
