/**
 * Tab de Métricas do MusicCatalog
 * Sprint F2.1 - Refatoração
 * Sprint F4 - Loading States Padronizados
 * Sprint 5 - Correção de limite 1000 entradas e filtro por corpus
 * Sprint AUDIT-P2 - Skeleton loader específico
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EnrichmentMetricsDashboard } from '@/components/music/EnrichmentMetricsDashboard';
import { useCatalogExtendedStats } from '@/hooks/useCatalogExtendedStats';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Filter, Music, Users, FileText, CheckCircle, AlertCircle, Clock, Youtube, PenTool } from 'lucide-react';
import { MetricsDashboardSkeleton } from '../skeletons/CatalogSkeletons';

interface TabMetricsProps {
  metrics: any;
  loading: boolean;
  onRefresh: () => void;
  onExportReport: () => void;
}

export function TabMetrics({ metrics, loading, onRefresh, onExportReport }: TabMetricsProps) {
  const [corpusFilter, setCorpusFilter] = useState<string | undefined>(undefined);
  const { data: extendedStats, isLoading: extendedLoading, refetch } = useCatalogExtendedStats(corpusFilter);

  const isLoading = loading || extendedLoading;

  // Sprint AUDIT-P2: Skeleton específico
  if (isLoading) {
    return <MetricsDashboardSkeleton />;
  }

  // Usa extendedStats como fonte primária (sem limite de 1000)
  const stats = extendedStats;

  return (
    <div className="space-y-6">
      {/* Header com filtro por corpus */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Dashboard de Qualidade do Enriquecimento</h2>
          <p className="text-muted-foreground">Monitore a qualidade e eficácia do pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={corpusFilter || 'all'} onValueChange={(v) => setCorpusFilter(v === 'all' ? undefined : v)}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Todos os Corpus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Corpus</SelectItem>
              {stats?.corpusBreakdown.map(corpus => (
                <SelectItem key={corpus.corpusId} value={corpus.corpusId}>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: corpus.color }} />
                    {corpus.corpusName}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => { refetch(); onRefresh(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Overview Cards - Dados reais sem limite */}
      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard icon={Music} label="Total de Músicas" value={stats.totalSongs} color="text-blue-500" />
            <MetricCard icon={Users} label="Total de Artistas" value={stats.totalArtists} color="text-purple-500" />
            <MetricCard icon={FileText} label="Com Letras" value={stats.songsWithLyrics} 
              subtitle={`${((stats.songsWithLyrics / stats.totalSongs) * 100).toFixed(1)}%`} color="text-orange-500" />
            <MetricCard icon={CheckCircle} label="Enriquecidas" value={stats.enrichedSongs}
              subtitle={`${((stats.enrichedSongs / stats.totalSongs) * 100).toFixed(1)}%`} color="text-green-500" />
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatusCard icon={Clock} label="Pendentes" value={stats.pendingSongs} total={stats.totalSongs} color="yellow" />
            <StatusCard icon={CheckCircle} label="Enriquecidas" value={stats.enrichedSongs} total={stats.totalSongs} color="green" />
            <StatusCard icon={AlertCircle} label="Com Erro" value={stats.errorSongs} total={stats.totalSongs} color="red" />
          </div>

          {/* Metadata Coverage */}
          <Card>
            <CardHeader>
              <CardTitle>Cobertura de Metadados</CardTitle>
              <CardDescription>Percentual de preenchimento por tipo de dado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CoverageBar icon={FileText} label="Com Letras" value={stats.songsWithLyrics} total={stats.totalSongs} />
              <CoverageBar icon={Youtube} label="Com YouTube" value={stats.songsWithYouTube} total={stats.totalSongs} />
              <CoverageBar icon={PenTool} label="Com Compositor" value={stats.songsWithComposer} total={stats.totalSongs} />
              <CoverageBar icon={CheckCircle} label="Enriquecidas" value={stats.enrichedSongs} total={stats.totalSongs} />
            </CardContent>
          </Card>

          {/* Corpus Breakdown - sempre mostra todos os corpus */}
          {!corpusFilter && stats.corpusBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Comparativo por Corpus</CardTitle>
                <CardDescription>Estatísticas detalhadas de cada corpus de estudo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.corpusBreakdown.map(corpus => (
                    <CorpusDetailCard key={corpus.corpusId} corpus={corpus} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* EnrichmentMetricsDashboard existente */}
      {metrics && (
        <EnrichmentMetricsDashboard 
          metrics={metrics}
          onExportReport={onExportReport}
        />
      )}
    </div>
  );
}

// Componentes auxiliares
function MetricCard({ icon: Icon, label, value, subtitle, color }: { 
  icon: any; label: string; value: number; subtitle?: string; color: string; 
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-muted ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusCard({ icon: Icon, label, value, total, color }: {
  icon: any; label: string; value: number; total: number; color: 'yellow' | 'green' | 'red';
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const colorClasses = {
    yellow: 'text-yellow-500',
    green: 'text-green-500',
    red: 'text-red-500'
  };
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className={`h-4 w-4 ${colorClasses[color]}`} />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value.toLocaleString()}</div>
        <Progress value={percentage} className={`mt-2 h-2 [&>div]:bg-${color}-500`} />
        <p className="text-xs text-muted-foreground mt-1">{percentage.toFixed(1)}% do total</p>
      </CardContent>
    </Card>
  );
}

function CoverageBar({ icon: Icon, label, value, total }: { icon: any; label: string; value: number; total: number; }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground w-8" />
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1">
          <span>{label}</span>
          <span className="font-medium">{value.toLocaleString()} ({percentage.toFixed(1)}%)</span>
        </div>
        <Progress value={percentage} className="h-2" />
      </div>
    </div>
  );
}

function CorpusDetailCard({ corpus }: { corpus: any }) {
  const enrichedPercent = corpus.songCount > 0 ? (corpus.enrichedSongs / corpus.songCount) * 100 : 0;
  const lyricsPercent = corpus.songCount > 0 ? (corpus.songsWithLyrics / corpus.songCount) * 100 : 0;
  
  return (
    <div className="p-4 rounded-lg border" style={{ borderLeftColor: corpus.color, borderLeftWidth: '4px' }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">{corpus.corpusName}</h4>
        <Badge variant="secondary">{corpus.songCount.toLocaleString()} músicas</Badge>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Artistas</span>
          <span className="font-medium">{corpus.artistCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Com Letras</span>
          <span className="font-medium">{lyricsPercent.toFixed(0)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Enriquecidas</span>
          <span className="font-medium text-green-600">{enrichedPercent.toFixed(0)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Com YouTube</span>
          <span className="font-medium">{corpus.songsWithYouTube}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Com Compositor</span>
          <span className="font-medium">{corpus.songsWithComposer}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Confiança Média</span>
          <span className="font-medium">{corpus.avgConfidence.toFixed(1)}/100</span>
        </div>
        <Progress value={enrichedPercent} className="h-1.5 mt-2" />
      </div>
    </div>
  );
}
