import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Sparkles, Clock, TrendingUp } from 'lucide-react';

export interface EnrichedSongData {
  status: 'pending' | 'enriching' | 'enriched' | 'validated' | 'rejected' | 'error' | 'applied';
  compositor?: string;
  sugestao?: {
    compositor?: string;
    fonte: 'musicbrainz' | 'ai-inferred' | 'not-found';
    confianca: number;
  };
}

interface MetricsProps {
  songs: EnrichedSongData[];
  avgProcessingTime: number;
}

export function EnrichmentMetrics({ songs, avgProcessingTime }: MetricsProps) {
  // Calcular métricas
  const enrichedSongs = songs.filter(s => s.sugestao);
  const validatedSongs = songs.filter(s => s.status === 'validated');
  
  // Taxa de sucesso por fonte
  const musicBrainzCount = enrichedSongs.filter(
    s => s.sugestao?.fonte === 'musicbrainz'
  ).length;
  const geminiCount = enrichedSongs.filter(
    s => s.sugestao?.fonte === 'ai-inferred'
  ).length;
  const notFoundCount = enrichedSongs.filter(
    s => s.sugestao?.fonte === 'not-found'
  ).length;
  
  const musicBrainzRate = enrichedSongs.length > 0 
    ? ((musicBrainzCount / enrichedSongs.length) * 100).toFixed(1)
    : '0';
  const geminiRate = enrichedSongs.length > 0
    ? ((geminiCount / enrichedSongs.length) * 100).toFixed(1)
    : '0';
  
  // Distribuição de confiança
  const confidenceDistribution = {
    high: enrichedSongs.filter(s => s.sugestao!.confianca >= 85).length,
    medium: enrichedSongs.filter(
      s => s.sugestao!.confianca >= 70 && s.sugestao!.confianca < 85
    ).length,
    low: enrichedSongs.filter(s => s.sugestao!.confianca < 70).length
  };
  
  // Compositores mais frequentes
  const composerCounts = validatedSongs.reduce((acc, song) => {
    if (song.compositor) {
      acc[song.compositor] = (acc[song.compositor] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  const topComposers = Object.entries(composerCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  
  // Confiança média
  const avgConfidence = enrichedSongs.length > 0
    ? (enrichedSongs.reduce((sum, s) => sum + s.sugestao!.confianca, 0) / enrichedSongs.length).toFixed(1)
    : '0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Taxa de Sucesso por Fonte */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="text-sm">MusicBrainz</span>
            </div>
            <span className="font-bold text-blue-600">{musicBrainzRate}%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm">Gemini AI</span>
            </div>
            <span className="font-bold text-purple-600">{geminiRate}%</span>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {notFoundCount} não encontradas
          </div>
        </CardContent>
      </Card>

      {/* Distribuição de Confiança */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Distribuição de Confiança</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Alta (≥85%)</span>
            <span className="font-bold text-green-600">{confidenceDistribution.high}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Média (70-85%)</span>
            <span className="font-bold text-yellow-600">{confidenceDistribution.medium}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Baixa (&lt;70%)</span>
            <span className="font-bold text-red-600">{confidenceDistribution.low}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Média: {avgConfidence}%
          </div>
        </CardContent>
      </Card>

      {/* Performance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm">Tempo médio</span>
          </div>
          <div className="text-2xl font-bold">
            {(avgProcessingTime / 1000).toFixed(1)}s
          </div>
          <div className="text-xs text-muted-foreground">
            por música processada
          </div>
        </CardContent>
      </Card>

      {/* Top Compositores */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Top Compositores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {topComposers.length > 0 ? (
              topComposers.map(([composer, count]) => (
                <div key={composer} className="flex justify-between text-sm">
                  <span className="truncate flex-1">{composer}</span>
                  <span className="font-bold text-muted-foreground ml-2">{count}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                Nenhum compositor validado
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
