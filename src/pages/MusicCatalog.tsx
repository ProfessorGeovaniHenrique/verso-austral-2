import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  EnrichedDataTable,
  SongCard,
  ArtistCard,
  StatsCard,
  AdvancedExportMenu 
} from '@/components/music';
import { EnrichmentBatchModal } from '@/components/music/EnrichmentBatchModal';
import { EnrichmentMetricsDashboard } from '@/components/music/EnrichmentMetricsDashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LayoutGrid, LayoutList, Search, Sparkles, AlertCircle, Download, Filter, RefreshCw } from 'lucide-react';
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
    avgConfidence: 0,
    pendingSongs: 0
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [pendingSongsForBatch, setPendingSongsForBatch] = useState<any[]>([]);
  const [showMetricsDashboard, setShowMetricsDashboard] = useState(false);
  const [metricsData, setMetricsData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar todas as músicas para estatísticas completas
      const { data: allSongsData, error: allSongsError } = await supabase
        .from('songs')
        .select(`
          *,
          artists (
            id,
            name,
            genre
          )
        `)
        .order('created_at', { ascending: false });

      if (allSongsError) throw allSongsError;

      const allSongs = allSongsData || [];

      // Filtrar músicas baseado no filtro de status
      const displayedSongs = statusFilter === 'all' 
        ? allSongs 
        : allSongs.filter(s => s.status === statusFilter);

      setSongs(displayedSongs);

      // Carregar artistas únicos
      const { data: artistsData, error: artistsError } = await supabase
        .from('artists')
        .select('*')
        .order('name');

      if (artistsError) throw artistsError;
      setArtists(artistsData || []);

      // Calcular estatísticas
      const enrichedCount = allSongs.filter(s => s.status === 'enriched').length;
      const pendingCount = allSongs.filter(s => s.status === 'pending').length;
      const errorCount = allSongs.filter(s => s.status === 'error').length;

      const avgConfidence = enrichedCount > 0
        ? allSongs
            .filter(s => s.status === 'enriched')
            .reduce((acc, s) => acc + (s.confidence_score || 0), 0) / enrichedCount
        : 0;

      setStats({ 
        totalSongs: allSongs.length, 
        totalArtists: artistsData?.length || 0, 
        avgConfidence, 
        pendingSongs: pendingCount 
      });

      // Calcular métricas para o dashboard
      const successRate = allSongs.length > 0 
        ? (enrichedCount / allSongs.length) * 100 
        : 0;

      // Histórico dos últimos 30 dias
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.toISOString().split('T')[0];
      });

      const historyData = last30Days.map(date => {
        const dayStart = new Date(date);
        const dayEnd = new Date(date);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const enrichedOnDay = allSongs.filter(s => 
          s.updated_at && 
          new Date(s.updated_at) >= dayStart && 
          new Date(s.updated_at) < dayEnd &&
          s.status === 'enriched'
        ).length;

        const errorsOnDay = allSongs.filter(s => 
          s.updated_at && 
          new Date(s.updated_at) >= dayStart && 
          new Date(s.updated_at) < dayEnd &&
          s.status === 'error'
        ).length;

        return {
          date: date.split('-').slice(1).join('/'),
          success: enrichedOnDay,
          failure: errorsOnDay
        };
      });

      // Distribuição por fonte
      const enrichedSongs = allSongs.filter(s => s.status === 'enriched');
      const sourceMap = new Map<string, { count: number; totalConfidence: number }>();
      
      enrichedSongs.forEach(song => {
        const source = song.enrichment_source || 'Unknown';
        const existing = sourceMap.get(source) || { count: 0, totalConfidence: 0 };
        sourceMap.set(source, {
          count: existing.count + 1,
          totalConfidence: existing.totalConfidence + (song.confidence_score || 0)
        });
      });

      const sourceDistribution = Array.from(sourceMap.entries()).map(([source, data]) => ({
        source,
        count: data.count,
        avgConfidence: data.count > 0 ? (data.totalConfidence / data.count) : 0
      }));

      // Distribuição de confiança
      const confidenceRanges = [
        { range: '0-20%', min: 0, max: 20 },
        { range: '21-40%', min: 21, max: 40 },
        { range: '41-60%', min: 41, max: 60 },
        { range: '61-80%', min: 61, max: 80 },
        { range: '81-100%', min: 81, max: 100 }
      ];

      const confidenceDistribution = confidenceRanges.map(range => ({
        range: range.range,
        count: enrichedSongs.filter(s => 
          s.confidence_score >= range.min && s.confidence_score <= range.max
        ).length
      }));

      // Enriquecimentos recentes
      const recentEnrichments = allSongs
        .filter(s => s.status === 'enriched' || s.status === 'error')
        .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
        .slice(0, 10)
        .map(s => ({
          id: s.id,
          title: s.title,
          artist: s.artists?.name || 'Unknown',
          timestamp: s.updated_at || s.created_at,
          status: s.status,
          confidence: s.confidence_score || 0,
          source: s.enrichment_source || 'Unknown'
        }));

      setMetricsData({
        totalSongs: allSongs.length,
        enriched: enrichedCount,
        pending: pendingCount,
        errors: errorCount,
        successRate,
        avgConfidence,
        enrichmentHistory: historyData,
        sourceDistribution,
        confidenceDistribution,
        recentEnrichments
      });

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

  const handleEnrichSong = async (songId: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      // Timeout de 30s
      const enrichPromise = supabase.functions.invoke('enrich-music-data', {
        body: { songId }
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: operação demorou mais de 30s')), 30000)
      );
      
      const { data, error } = await Promise.race([enrichPromise, timeoutPromise]) as any;
      
      if (error) throw error;
      
      if (data?.success) {
        return {
          success: true,
          message: `${data.enrichedData?.composer || 'Compositor'} - ${data.confidenceScore}%`
        };
      } else {
        throw new Error(data?.error || 'Erro desconhecido ao enriquecer');
      }
    } catch (error: any) {
      console.error('Erro ao enriquecer música:', error);
      
      // Reverter status em caso de erro
      await supabase
        .from('songs')
        .update({ status: 'pending' })
        .eq('id', songId);
      
      return {
        success: false,
        error: error.message || 'Falha ao buscar metadados'
      };
    }
  };

  const handleEnrichSongUI = async (songId: string) => {
    if (enrichingIds.has(songId)) return;
    
    setEnrichingIds(prev => new Set(prev).add(songId));
    
    try {
      const result = await handleEnrichSong(songId);
      
      if (result.success) {
        toast({
          title: "✨ Música enriquecida!",
          description: result.message
        });
        await loadData();
      } else {
        toast({
          title: "Erro ao enriquecer",
          description: result.error,
          variant: "destructive"
        });
      }
    } finally {
      setEnrichingIds(prev => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
    }
  };

  const handleBatchEnrich = () => {
    const pending = songs.filter(s => s.status === 'pending');
    setPendingSongsForBatch(pending);
    setBatchModalOpen(true);
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handleBatchComplete = async () => {
    await loadData();
    toast({
      title: "🎉 Enriquecimento concluído!",
      description: "Todas as músicas foram processadas."
    });
  };

  const handleExportReport = () => {
    if (!metricsData) return;

    const reportData = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalSongs: metricsData.totalSongs,
        enriched: metricsData.enriched,
        pending: metricsData.pending,
        errors: metricsData.errors,
        successRate: metricsData.successRate,
        avgConfidence: metricsData.avgConfidence
      },
      enrichmentHistory: metricsData.enrichmentHistory,
      sourceDistribution: metricsData.sourceDistribution,
      confidenceDistribution: metricsData.confidenceDistribution,
      recentEnrichments: metricsData.recentEnrichments
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-enriquecimento-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "✅ Relatório exportado!",
      description: "Arquivo JSON baixado com sucesso."
    });
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
    <div className="space-y-0">
      {/* GitHub-style Toolbar */}
      <div className="border-b bg-muted/30 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left actions */}
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar músicas, artistas, compositores..."
                  className="pl-9 h-9 bg-background/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Button variant="ghost" size="sm" className="h-9 gap-2">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filtros</span>
              </Button>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-2"
                onClick={loadData}
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Atualizar</span>
              </Button>
              
              <div className="flex items-center gap-1 border rounded-md p-0.5 bg-background/50">
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setViewMode('table')}
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>

              <AdvancedExportMenu 
                onExport={(format, options) => {
                  toast({
                    title: "Exportação iniciada",
                    description: `Preparando arquivo ${format.toUpperCase()} para download.`,
                  });
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex justify-between items-start">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Catálogo de Músicas</h1>
            <p className="text-muted-foreground">
              {stats.totalSongs} músicas | {stats.totalArtists} artistas | 
              Confiança média: {stats.avgConfidence.toFixed(1)}/100
              {stats.pendingSongs > 0 && ` | ${stats.pendingSongs} aguardando enriquecimento`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filtrar por status:</span>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Todas
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('pending')}
              >
                Pendentes
              </Button>
              <Button
                variant={statusFilter === 'enriched' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('enriched')}
              >
                Enriquecidas
              </Button>
              <Button
                variant={statusFilter === 'processed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('processed')}
              >
                Processadas
              </Button>
            </div>
          </div>
        </div>
        </div>

      {/* Batch Enrichment Alert */}
      {stats.pendingSongs > 0 && (
        <Alert className="border-primary/50 bg-primary/5">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertTitle>Músicas Aguardando Enriquecimento</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span>
                {stats.pendingSongs} música{stats.pendingSongs > 1 ? 's' : ''} precisa
                {stats.pendingSongs > 1 ? 'm' : ''} ser enriquecida{stats.pendingSongs > 1 ? 's' : ''} com metadados externos.
              </span>
              <Button 
                size="sm" 
                onClick={handleBatchEnrich}
                className="w-full sm:w-auto"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Enriquecer Todas ({stats.pendingSongs})
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

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
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
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
                confidence: s.confidence_score || 0,
                status: s.status || 'pending'
              }))}
              onExport={() => {}}
              onEnrich={handleEnrichSongUI}
              enrichingIds={enrichingIds}
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
                    confidence: song.confidence_score || 0,
                    status: song.status || 'pending'
                  }}
                  onEdit={() => {}}
                  onEnrich={handleEnrichSongUI}
                  isEnriching={enrichingIds.has(song.id)}
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

        <TabsContent value="metrics" className="space-y-4">
          {metricsData && (
            <EnrichmentMetricsDashboard 
              metrics={metricsData}
              onExportReport={handleExportReport}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Batch Enrichment Modal */}
      <EnrichmentBatchModal
        open={batchModalOpen}
        onOpenChange={setBatchModalOpen}
        songs={pendingSongsForBatch.map(s => ({
          id: s.id,
          title: s.title,
          artist: s.artists?.name || 'Desconhecido'
        }))}
        onEnrich={handleEnrichSong}
        onComplete={handleBatchComplete}
      />
      </div>
    </div>
  );
}
