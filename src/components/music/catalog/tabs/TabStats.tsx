/**
 * Tab de Estatísticas do MusicCatalog - Expandido
 * Sprint 2 - Integração Backend Completa
 */

import { useCatalogExtendedStats } from '@/hooks/useCatalogExtendedStats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SectionLoading } from '@/components/ui/loading-spinner';
import { 
  Music, Users, TrendingUp, FileText, Clock, CheckCircle, 
  AlertCircle, Youtube, PenTool, RefreshCw, BarChart3 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TabStatsProps {
  totalSongs: number;
  totalArtists: number;
  avgConfidence: number;
}

export function TabStats({ totalSongs, totalArtists, avgConfidence }: TabStatsProps) {
  const { data: stats, isLoading, refetch } = useCatalogExtendedStats();

  if (isLoading) {
    return <SectionLoading text="Carregando estatísticas..." />;
  }

  // Use hook data or fallback to props
  const data = stats || {
    totalSongs,
    totalArtists,
    avgConfidence,
    songsWithLyrics: 0,
    pendingSongs: 0,
    enrichedSongs: 0,
    errorSongs: 0,
    songsWithYouTube: 0,
    songsWithComposer: 0,
    corpusBreakdown: [],
    weeklyTrend: []
  };

  const lyricsPercentage = data.totalSongs > 0 ? (data.songsWithLyrics / data.totalSongs) * 100 : 0;
  const enrichedPercentage = data.totalSongs > 0 ? (data.enrichedSongs / data.totalSongs) * 100 : 0;
  const youtubePercentage = data.totalSongs > 0 ? (data.songsWithYouTube / data.totalSongs) * 100 : 0;
  const composerPercentage = data.totalSongs > 0 ? (data.songsWithComposer / data.totalSongs) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Estatísticas do Catálogo</h2>
          <p className="text-muted-foreground">Visão geral e métricas de qualidade</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total de Músicas"
          value={data.totalSongs.toLocaleString()}
          icon={Music}
          color="text-blue-500"
        />
        <StatsCard
          title="Total de Artistas"
          value={data.totalArtists.toLocaleString()}
          icon={Users}
          color="text-purple-500"
        />
        <StatsCard
          title="Confiança Média"
          value={`${data.avgConfidence.toFixed(1)}/100`}
          icon={TrendingUp}
          color="text-green-500"
          subtitle={getConfidenceLabel(data.avgConfidence)}
        />
        <StatsCard
          title="Com Letras"
          value={`${lyricsPercentage.toFixed(0)}%`}
          icon={FileText}
          color="text-orange-500"
          subtitle={`${data.songsWithLyrics.toLocaleString()} músicas`}
        />
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pendingSongs.toLocaleString()}</div>
            <Progress 
              value={data.totalSongs > 0 ? (data.pendingSongs / data.totalSongs) * 100 : 0} 
              className="mt-2 h-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {data.totalSongs > 0 ? ((data.pendingSongs / data.totalSongs) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Enriquecidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.enrichedSongs.toLocaleString()}</div>
            <Progress value={enrichedPercentage} className="mt-2 h-2 [&>div]:bg-green-500" />
            <p className="text-xs text-muted-foreground mt-1">
              {enrichedPercentage.toFixed(1)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Com Erro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.errorSongs.toLocaleString()}</div>
            <Progress 
              value={data.totalSongs > 0 ? (data.errorSongs / data.totalSongs) * 100 : 0} 
              className="mt-2 h-2 [&>div]:bg-red-500" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              {data.totalSongs > 0 ? ((data.errorSongs / data.totalSongs) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enrichment Quality */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Qualidade do Enriquecimento
          </CardTitle>
          <CardDescription>Cobertura de metadados por tipo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <QualityBar label="Com Letras" value={lyricsPercentage} icon={FileText} />
            <QualityBar label="Com YouTube" value={youtubePercentage} icon={Youtube} />
            <QualityBar label="Com Compositor" value={composerPercentage} icon={PenTool} />
            <QualityBar label="Enriquecidas" value={enrichedPercentage} icon={CheckCircle} />
          </div>
        </CardContent>
      </Card>

      {/* Corpus Breakdown */}
      {data.corpusBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Corpus</CardTitle>
            <CardDescription>Estatísticas separadas por corpus de estudo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.corpusBreakdown.map(corpus => (
                <div 
                  key={corpus.corpusId} 
                  className="p-4 rounded-lg border"
                  style={{ borderLeftColor: corpus.color, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{corpus.corpusName}</h4>
                    <Badge variant="secondary">{corpus.songCount} músicas</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>{corpus.artistCount} artistas</p>
                    <p>Confiança: {corpus.avgConfidence.toFixed(1)}/100</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Trend Mini Chart */}
      {data.weeklyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente (7 dias)</CardTitle>
            <CardDescription>Músicas enriquecidas vs pendentes por dia</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-24">
              {data.weeklyTrend.map((day, idx) => {
                const total = day.enriched + day.pending;
                const maxTotal = Math.max(...data.weeklyTrend.map(d => d.enriched + d.pending), 1);
                const height = (total / maxTotal) * 100;
                const enrichedHeight = total > 0 ? (day.enriched / total) * height : 0;
                
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full bg-muted rounded-t relative"
                      style={{ height: `${height}%`, minHeight: '4px' }}
                    >
                      <div 
                        className="absolute bottom-0 w-full bg-green-500 rounded-t"
                        style={{ height: `${enrichedHeight}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>Enriquecidas</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-muted" />
                <span>Pendentes</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper Components
function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  subtitle 
}: { 
  title: string; 
  value: string | number; 
  icon: any; 
  color: string;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-muted ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QualityBar({ 
  label, 
  value, 
  icon: Icon 
}: { 
  label: string; 
  value: number; 
  icon: any;
}) {
  const getColor = (v: number) => {
    if (v >= 80) return 'bg-green-500';
    if (v >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground w-8" />
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1">
          <span>{label}</span>
          <span className="font-medium">{value.toFixed(1)}%</span>
        </div>
        <Progress value={value} className={`h-2 [&>div]:${getColor(value)}`} />
      </div>
    </div>
  );
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 80) return 'Excelente';
  if (confidence >= 60) return 'Bom';
  if (confidence >= 40) return 'Regular';
  return 'Baixo';
}
