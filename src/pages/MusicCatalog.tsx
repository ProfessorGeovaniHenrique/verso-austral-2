import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  EnrichedDataTable,
  SongCard,
  ArtistCard,
  StatsCard,
  AdvancedExportMenu 
} from '@/components/music';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LayoutGrid, LayoutList, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function MusicCatalog() {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSongs: 0,
    totalArtists: 0,
    avgConfidence: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar músicas com artistas
      const { data: songsData, error: songsError } = await supabase
        .from('music_songs' as any)
        .select(`
          *,
          music_artists (
            id,
            name,
            genre
          )
        `)
        .eq('status', 'enriched')
        .order('created_at', { ascending: false })
        .limit(100);

      if (songsError) throw songsError;

      // Carregar artistas únicos
      const { data: artistsData, error: artistsError } = await supabase
        .from('music_artists' as any)
        .select('*')
        .order('name');

      if (artistsError) throw artistsError;

      setSongs(songsData || []);
      setArtists(artistsData || []);

      // Calcular estatísticas
      const totalSongs = songsData?.length || 0;
      const totalArtists = artistsData?.length || 0;
      const avgConfidence = songsData?.length 
        ? (songsData as any[]).reduce((acc, s) => acc + (s.confidence_score || 0), 0) / songsData.length
        : 0;

      setStats({ totalSongs, totalArtists, avgConfidence });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar o catálogo de músicas.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSongs = songs.filter(song => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      song.title?.toLowerCase().includes(query) ||
      song.artists?.name?.toLowerCase().includes(query) ||
      song.composer?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de Músicas</h1>
          <p className="text-muted-foreground">
            {stats.totalSongs} músicas | {stats.totalArtists} artistas | 
            Confiança média: {stats.avgConfidence.toFixed(1)}/100
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <AdvancedExportMenu onExport={() => {}} />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, artista ou compositor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="songs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="songs">Músicas</TabsTrigger>
          <TabsTrigger value="artists">Artistas</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="songs" className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Carregando músicas...</p>
            </div>
          ) : viewMode === 'table' ? (
            <EnrichedDataTable 
              songs={filteredSongs.map(s => ({
                id: s.id,
                title: s.title,
                artist: s.artists?.name || 'Desconhecido',
                composer: s.composer,
                year: s.release_year,
                genre: s.artists?.genre,
                confidence: s.confidence_score || 0
              }))}
              onExport={() => {}}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredSongs.map((song) => (
                <SongCard 
                  key={song.id}
                  song={{
                    id: song.id,
                    title: song.title,
                    artist: song.artists?.name || 'Desconhecido',
                    album: song.raw_data?.album,
                    year: song.release_year,
                    genre: song.artists?.genre,
                    confidence: song.confidence_score || 0
                  }}
                  onEdit={() => {}}
                />
              ))}
            </div>
          )}

          {!loading && filteredSongs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "Nenhuma música encontrada com esses filtros."
                  : "Nenhuma música enriquecida ainda. Comece fazendo upload!"
                }
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="artists" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {artists.map((artist) => {
              const artistSongs = songs.filter(s => s.artist_id === artist.id);
              return (
                <ArtistCard 
                  key={artist.id}
                  artist={{
                    id: artist.id,
                    name: artist.name,
                    songCount: artistSongs.length,
                    averageConfidence: artistSongs.length > 0
                      ? artistSongs.reduce((acc, s) => acc + (s.confidence_score || 0), 0) / artistSongs.length
                      : 0,
                    topGenres: artist.genre ? [artist.genre] : []
                  }}
                  onViewSongs={() => {}}
                />
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard 
              title="Total de Músicas"
              value={stats.totalSongs}
              subtitle="músicas enriquecidas"
            />
            <StatsCard 
              title="Total de Artistas"
              value={stats.totalArtists}
              subtitle="artistas únicos"
            />
            <StatsCard 
              title="Confiança Média"
              value={`${stats.avgConfidence.toFixed(1)}/100`}
              subtitle="score de qualidade"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
