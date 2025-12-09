import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BookOpen,
  ExternalLink,
  Loader2,
  List,
  Calendar,
  Sparkles,
  RefreshCw,
  Search,
  Briefcase,
  Microscope,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SongCard, Song } from './SongCard';
import { Card, CardContent } from '@/components/ui/card';
import { EnrichmentJobCard } from './EnrichmentJobCard';
import { useEnrichmentJob } from '@/hooks/useEnrichmentJob';

interface Artist {
  id: string;
  name: string;
  genre: string | null;
  normalized_name: string | null;
  biography?: string | null;
  biography_source?: string | null;
  corpus_type?: 'gaucho' | 'sertanejo' | 'nordestino' | null;
}

interface ArtistDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistId: string | null;
  artist: Artist | null;
  songs: Song[];
  onEnrichSong: (songId: string) => Promise<any>;
  onEditSong?: (song: Song) => void;
  onReEnrichSong?: (songId: string) => void;
  onMarkReviewed?: (songId: string) => void;
  onDeleteSong?: (songId: string) => void;
  onAnnotateSong?: (songId: string) => void;
  annotatingSongIds?: Set<string>;
  onBioEnriched?: (artistId: string) => void;
}

export function ArtistDetailsSheet({
  open,
  onOpenChange,
  artistId,
  artist,
  songs,
  onEnrichSong,
  onEditSong,
  onReEnrichSong,
  onMarkReviewed,
  onDeleteSong,
  onAnnotateSong,
  annotatingSongIds,
  onBioEnriched,
}: ArtistDetailsSheetProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [isEnrichingBio, setIsEnrichingBio] = useState(false);
  const [recentlyEnrichedIds, setRecentlyEnrichedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // Hook para job de enriquecimento do artista específico
  const artistEnrichmentJob = useEnrichmentJob({ 
    artistId: artistId || undefined, 
    jobType: 'metadata' 
  });

  const handleStartArtistJob = async () => {
    if (!artist) return;
    await artistEnrichmentJob.startJob({
      scope: 'artist',
      jobType: 'metadata',
      artistId: artist.id,
      artistName: artist.name,
    });
  };

  // Filtrar músicas pela busca
  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim()) return songs;
    
    const query = searchQuery.toLowerCase();
    return songs.filter(song => 
      song.title.toLowerCase().includes(query) ||
      song.composer?.toLowerCase().includes(query)
    );
  }, [songs, searchQuery]);

  const handleEnrichBio = async () => {
    if (!artistId || !artist) return;

    setIsEnrichingBio(true);
    try {
      toast({
        title: "Buscando biografia",
        description: `Pesquisando informações sobre ${artist.name}...`,
      });

      const { data, error } = await supabase.functions.invoke('generate-artist-bio', {
        body: {
          artistId: artist.id,
          artistName: artist.name
        }
      });

      if (error) throw error;

      // ✅ Atualizar dados do artista imediatamente após sucesso
      const { data: updatedArtist } = await supabase
        .from('artists')
        .select('biography, biography_source, biography_updated_at')
        .eq('id', artist.id)
        .single();

      if (updatedArtist && onBioEnriched) {
        // Notifica o componente pai para recarregar dados
        onBioEnriched(artist.id);
      }

      toast({
        title: "Biografia carregada!",
        description: "A biografia foi atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Error enriching bio:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível buscar a biografia",
        variant: "destructive",
      });
    } finally {
      setIsEnrichingBio(false);
    }
  };

  const handleEnrichSong = async (songId: string) => {
    setRecentlyEnrichedIds(prev => new Set(prev).add(songId));
    try {
      await onEnrichSong(songId);
    } finally {
      setTimeout(() => {
        setRecentlyEnrichedIds(prev => {
          const next = new Set(prev);
          next.delete(songId);
          return next;
        });
      }, 3000);
    }
  };

  const songsByYear = useMemo(() => {
    const grouped: Record<string, Song[]> = {};
    const unknown: Song[] = [];

    filteredSongs.forEach(song => {
      const year = song.release_year;

      if (!year || year === '0000' || year.trim() === '') {
        unknown.push(song);
      } else {
        if (!grouped[year]) {
          grouped[year] = [];
        }
        grouped[year].push(song);
      }
    });

    // Ordenar anos em ordem decrescente (mais recente primeiro)
    const sortedYears = Object.keys(grouped).sort((a, b) => parseInt(b) - parseInt(a));

    return {
      years: sortedYears.map(year => ({ year, songs: grouped[year] })),
      unknown
    };
  }, [filteredSongs]);

  if (!artist) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col overflow-hidden">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="text-2xl">{artist.name}</SheetTitle>
          <SheetDescription>
            {songs.length} {songs.length === 1 ? 'música' : 'músicas'} no catálogo
            {searchQuery && ` • ${filteredSongs.length} encontrada(s)`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 flex flex-col space-y-6 mt-6 overflow-hidden">
          {/* Seção de Biografia */}
          <Card className="flex-shrink-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Biografia</h3>
                  {artist.biography_source === 'gemini_pro' && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Sparkles className="h-3 w-3" />
                      Enriquecida
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  {artist.biography && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleEnrichBio}
                      disabled={isEnrichingBio}
                      title="Atualizar biografia"
                    >
                      <RefreshCw className={`h-4 w-4 ${isEnrichingBio ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                  {!artist.biography && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEnrichBio}
                      disabled={isEnrichingBio}
                    >
                      {isEnrichingBio ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Buscando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Buscar Biografia
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {artist.biography ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {artist.biography}
                  </p>

                  {artist.biography_source === 'wikipedia' && (
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto"
                      asChild
                    >
                      <a
                        href={`https://pt.wikipedia.org/wiki/${encodeURIComponent(artist.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Ler artigo completo na Wikipédia
                      </a>
                    </Button>
                  )}

                  {artist.biography_source === 'web' && (
                    <Badge variant="secondary" className="text-xs">
                      Biografia obtida através de pesquisa web atualizada
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Biografia ainda não disponível. Clique no botão acima para buscar.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Sprint CAT-AUDIT-P1: Botão Analisar Músicas do Artista */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => {
              onOpenChange(false);
              navigate(`/analysis-tools?artist=${artist.id}&artistName=${encodeURIComponent(artist.name)}`);
            }}
          >
            <Microscope className="h-4 w-4" />
            🔬 Analisar Músicas de {artist.name}
          </Button>

          {/* Card de Job de Enriquecimento do Artista */}
          {artistEnrichmentJob.activeJob ? (
            <EnrichmentJobCard
              artistId={artist.id}
              artistName={artist.name}
              jobType="metadata"
              compact={true}
            />
          ) : (
            <Card className="flex-shrink-0 border-dashed">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Enriquecimento em lote para {artist.name}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleStartArtistJob}
                    disabled={artistEnrichmentJob.isLoading || songs.length === 0}
                  >
                    {artistEnrichmentJob.isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Iniciar Job ({songs.length} músicas)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Barra de Busca */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome da música ou compositor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tabs: Lista vs Linha do Tempo */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'timeline')} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Linha do Tempo
              </TabsTrigger>
            </TabsList>

            {/* Tab: Lista */}
            <TabsContent value="list" className="space-y-2 mt-4 flex-1 overflow-hidden">
              <ScrollArea className="h-full pr-4">
                {filteredSongs.length > 0 ? (
                  filteredSongs.map((song) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      variant="compact"
                      isEnriching={recentlyEnrichedIds.has(song.id)}
                      isAnnotatingSemantic={annotatingSongIds?.has(song.id)}
                      onEdit={onEditSong}
                      onReEnrich={onReEnrichSong}
                      onMarkReviewed={onMarkReviewed}
                      onDelete={onDeleteSong}
                      onAnnotateSemantic={onAnnotateSong}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma música encontrada</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Tab: Linha do Tempo */}
            <TabsContent value="timeline" className="space-y-4 mt-4 flex-1 overflow-hidden">
              <ScrollArea className="h-full pr-4">
                {filteredSongs.length > 0 ? (
                  <>
                    {/* Anos conhecidos */}
                    {songsByYear.years.map(({ year, songs: yearSongs }) => (
                      <div key={year} className="mb-6">
                        {/* Header do Ano - Sticky */}
                        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b py-2 mb-3 z-10">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-lg">{year}</h4>
                            <Badge variant="secondary">
                              {yearSongs.length} {yearSongs.length === 1 ? 'música' : 'músicas'}
                            </Badge>
                          </div>
                        </div>

                        {/* Músicas do ano */}
                        <div className="space-y-2 pl-4 border-l-2 border-muted">
                          {yearSongs.map((song) => (
                            <SongCard
                              key={song.id}
                              song={song}
                              variant="compact"
                              isEnriching={recentlyEnrichedIds.has(song.id)}
                              isAnnotatingSemantic={annotatingSongIds?.has(song.id)}
                              onEdit={onEditSong}
                              onReEnrich={onReEnrichSong}
                              onMarkReviewed={onMarkReviewed}
                              onDelete={onDeleteSong}
                              onAnnotateSemantic={onAnnotateSong}
                            />
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Seção "Data Desconhecida" */}
                    {songsByYear.unknown.length > 0 && (
                      <div className="mb-6">
                        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b py-2 mb-3 z-10">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-lg text-muted-foreground">Data Desconhecida</h4>
                            <Badge variant="outline">
                              {songsByYear.unknown.length} músicas
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2 pl-4 border-l-2 border-muted">
                          {songsByYear.unknown.map((song) => (
                            <SongCard
                              key={song.id}
                              song={song}
                              variant="compact"
                              isEnriching={recentlyEnrichedIds.has(song.id)}
                              isAnnotatingSemantic={annotatingSongIds?.has(song.id)}
                              onEdit={onEditSong}
                              onReEnrich={onReEnrichSong}
                              onMarkReviewed={onMarkReviewed}
                              onDelete={onDeleteSong}
                              onAnnotateSemantic={onAnnotateSong}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma música encontrada</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
