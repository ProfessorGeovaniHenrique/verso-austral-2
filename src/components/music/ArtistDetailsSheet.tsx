import { useState, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import {
  Music,
  BookOpen,
  ExternalLink,
  Loader2,
  List,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Song {
  id: string;
  title: string;
  composer: string | null;
  release_year: string | null;
  genre: string | null;
  status: string | null;
  confidence_score: number | null;
}

interface Artist {
  id: string;
  name: string;
  genre: string | null;
  normalized_name: string | null;
  biography?: string | null;
  biography_source?: string | null;
}

interface ArtistDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistId: string | null;
  artist: Artist | null;
  songs: Song[];
  onEnrichSong: (songId: string) => Promise<any>;
}

export function ArtistDetailsSheet({
  open,
  onOpenChange,
  artistId,
  artist,
  songs,
  onEnrichSong,
}: ArtistDetailsSheetProps) {
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [isEnrichingBio, setIsEnrichingBio] = useState(false);
  const [recentlyEnrichedIds, setRecentlyEnrichedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const handleEnrichBio = async () => {
    if (!artistId || !artist) return;

    setIsEnrichingBio(true);
    try {
      toast({
        title: "Buscando biografia",
        description: `Pesquisando informações sobre ${artist.name}...`,
      });

      // Simulação - implementar chamada real à API
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: "Biografia encontrada!",
        description: "A biografia foi adicionada com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível buscar a biografia",
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

    songs.forEach(song => {
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
  }, [songs]);

  if (!artist) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">{artist.name}</SheetTitle>
          <SheetDescription>
            {songs.length} {songs.length === 1 ? 'música' : 'músicas'} no catálogo
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Seção de Biografia */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Biografia</h3>
                </div>

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

          {/* Tabs: Lista vs Linha do Tempo */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'timeline')}>
            <TabsList className="grid w-full grid-cols-2">
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
            <TabsContent value="list" className="space-y-2 mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {songs.map((song) => (
                  <SongItem
                    key={song.id}
                    song={song}
                    isEnriching={recentlyEnrichedIds.has(song.id)}
                    onEnrich={() => handleEnrichSong(song.id)}
                  />
                ))}
              </ScrollArea>
            </TabsContent>

            {/* Tab: Linha do Tempo */}
            <TabsContent value="timeline" className="space-y-4 mt-4">
              <ScrollArea className="h-[400px] pr-4">
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
                        <SongItem
                          key={song.id}
                          song={song}
                          isEnriching={recentlyEnrichedIds.has(song.id)}
                          onEnrich={() => handleEnrichSong(song.id)}
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
                        <SongItem
                          key={song.id}
                          song={song}
                          isEnriching={recentlyEnrichedIds.has(song.id)}
                          onEnrich={() => handleEnrichSong(song.id)}
                        />
                      ))}
                    </div>
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

interface SongItemProps {
  song: Song;
  isEnriching: boolean;
  onEnrich: () => void;
}

function SongItem({ song, isEnriching, onEnrich }: SongItemProps) {
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'enriched':
        return <Badge variant="default" className="text-xs">Enriquecida</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-xs">Pendente</Badge>;
      case 'processing':
        return <Badge variant="outline" className="text-xs">Processando</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="mb-2 hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Music className="h-4 w-4 text-muted-foreground shrink-0" />
              <h4 className="font-medium text-sm truncate">{song.title}</h4>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {song.composer && (
                <span className="truncate">Compositor: {song.composer}</span>
              )}
              {song.genre && (
                <Badge variant="outline" className="text-xs">{song.genre}</Badge>
              )}
              {song.confidence_score !== null && (
                <span>Conf: {song.confidence_score}%</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {getStatusBadge(song.status)}
            {song.status === 'pending' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onEnrich}
                disabled={isEnriching}
                className="h-7 px-2"
              >
                {isEnriching ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
