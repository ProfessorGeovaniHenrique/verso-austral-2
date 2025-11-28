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
import {
  BookOpen,
  ExternalLink,
  Loader2,
  List,
  Calendar,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SongCard, Song } from './SongCard';
import { Card, CardContent } from '@/components/ui/card';

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
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [isEnrichingBio, setIsEnrichingBio] = useState(false);
  const [recentlyEnrichedIds, setRecentlyEnrichedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // 🔍 FASE 3: Log detalhado das props recebidas
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 [FASE 3] ARTIST DETAILS SHEET RENDERIZANDO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📂 Props recebidas:`);
  console.log(`   - open: ${open}`);
  console.log(`   - artistId: ${artistId}`);
  console.log(`   - artist: ${artist ? artist.name : 'null'}`);
  console.log(`   - songs (array): ${songs.length} items`);
  
  if (songs.length > 0) {
    console.log('📝 Sample das músicas recebidas:');
    songs.slice(0, 3).forEach((song, idx) => {
      console.log(`  [${idx + 1}] ID: ${song.id}, Title: ${song.title}`);
    });
  } else {
    console.error('❌ ARRAY DE MÚSICAS ESTÁ VAZIO!');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

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

      toast({
        title: "Biografia carregada!",
        description: "A biografia foi atualizada com sucesso.",
      });

      // Notifica o componente pai para recarregar os dados do artista
      if (onBioEnriched) {
        onBioEnriched(artist.id);
      }
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
      <SheetContent className="w-full sm:max-w-2xl flex flex-col overflow-hidden">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="text-2xl">{artist.name}</SheetTitle>
          <SheetDescription>
            {songs.length} {songs.length === 1 ? 'música' : 'músicas'} no catálogo
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
                  {artist.biography_source === 'gemini' && (
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
                {songs.map((song) => (
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
              </ScrollArea>
            </TabsContent>

            {/* Tab: Linha do Tempo */}
            <TabsContent value="timeline" className="space-y-4 mt-4 flex-1 overflow-hidden">
              <ScrollArea className="h-full pr-4">
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
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
