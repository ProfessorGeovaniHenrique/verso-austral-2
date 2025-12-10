/**
 * CatalogStatsOverview - Card de resumo para página inicial do catálogo
 * Sprint 5 + AUD-P1: Adicionado GlobalEnrichmentProgress com Collapsible
 */

import { useCatalogExtendedStats, CorpusBreakdown } from '@/hooks/useCatalogExtendedStats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Music, Users, FileText, Youtube, PenTool, CheckCircle, AlertCircle, Clock, ChevronDown, Rocket } from 'lucide-react';
import { useState } from 'react';
import { GlobalEnrichmentProgress } from './GlobalEnrichmentProgress';

interface CatalogStatsOverviewProps {
  compact?: boolean;
}

export function CatalogStatsOverview({ compact = false }: CatalogStatsOverviewProps) {
  const [enrichmentOpen, setEnrichmentOpen] = useState(false);
  const { data: stats, isLoading } = useCatalogExtendedStats();

  if (isLoading) {
    return <CatalogStatsOverviewSkeleton compact={compact} />;
  }

  if (!stats) return null;

  const enrichedPercentage = stats.totalSongs > 0 
    ? (stats.enrichedSongs / stats.totalSongs) * 100 
    : 0;

  if (compact) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStatCard icon={Music} label="Músicas" value={stats.totalSongs} />
        <MiniStatCard icon={Users} label="Artistas" value={stats.totalArtists} />
        <MiniStatCard icon={FileText} label="Com Letras" value={stats.songsWithLyrics} />
        <MiniStatCard icon={CheckCircle} label="Enriquecidas" value={stats.enrichedSongs} color="text-green-500" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Visão Geral do Catálogo
        </CardTitle>
        <CardDescription>
          Estatísticas totais e por corpus de estudo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estatísticas Globais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            icon={Music} 
            label="Total de Músicas" 
            value={stats.totalSongs.toLocaleString()} 
          />
          <StatCard 
            icon={Users} 
            label="Total de Artistas" 
            value={stats.totalArtists.toLocaleString()} 
          />
          <StatCard 
            icon={FileText} 
            label="Com Letras" 
            value={stats.songsWithLyrics.toLocaleString()}
            subtitle={`${((stats.songsWithLyrics / stats.totalSongs) * 100).toFixed(1)}%`}
          />
          <StatCard 
            icon={CheckCircle} 
            label="Enriquecidas" 
            value={stats.enrichedSongs.toLocaleString()}
            subtitle={`${enrichedPercentage.toFixed(1)}%`}
            color="text-green-500"
          />
        </div>

        {/* Barra de progresso global */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxa de Enriquecimento</span>
            <span className="font-medium">{enrichedPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={enrichedPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-yellow-500" />
              {stats.pendingSongs.toLocaleString()} pendentes
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-red-500" />
              {stats.errorSongs.toLocaleString()} com erro
            </span>
          </div>
        </div>

        {/* Sprint AUD-P1: Collapsible de Gerenciamento de Enriquecimento */}
        <Collapsible open={enrichmentOpen} onOpenChange={setEnrichmentOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <div className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Gerenciar Enriquecimento</span>
              {enrichedPercentage < 50 && (
                <Badge variant="destructive" className="text-xs">
                  {(100 - enrichedPercentage).toFixed(0)}% pendente
                </Badge>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${enrichmentOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <GlobalEnrichmentProgress showDetails={true} />
          </CollapsibleContent>
        </Collapsible>

        {/* Breakdown por Corpus */}
        {stats.corpusBreakdown.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Por Corpus</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {stats.corpusBreakdown.map(corpus => (
                <CorpusCard key={corpus.corpusId} corpus={corpus} />
              ))}
            </div>
          </div>
        )}

        {/* Indicadores de metadados */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Youtube className="h-4 w-4 text-red-500" />
            <span className="text-sm text-muted-foreground">Com YouTube:</span>
            <span className="text-sm font-medium">{stats.songsWithYouTube.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <PenTool className="h-4 w-4 text-purple-500" />
            <span className="text-sm text-muted-foreground">Com Compositor:</span>
            <span className="text-sm font-medium">{stats.songsWithComposer.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componentes auxiliares
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtitle, 
  color 
}: { 
  icon: any; 
  label: string; 
  value: string; 
  subtitle?: string; 
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className={`p-2 rounded-md bg-background ${color || 'text-primary'}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function MiniStatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: any; 
  label: string; 
  value: number; 
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
      <Icon className={`h-4 w-4 ${color || 'text-muted-foreground'}`} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

function CorpusCard({ corpus }: { corpus: CorpusBreakdown }) {
  const enrichedPercent = corpus.songCount > 0 
    ? (corpus.enrichedSongs / corpus.songCount) * 100 
    : 0;

  return (
    <div 
      className="p-3 rounded-lg border"
      style={{ borderLeftColor: corpus.color, borderLeftWidth: '4px' }}
    >
      <div className="flex items-center justify-between mb-2">
        <h5 className="font-medium text-sm">{corpus.corpusName}</h5>
        <Badge variant="secondary" className="text-xs">
          {corpus.songCount.toLocaleString()}
        </Badge>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>{corpus.artistCount} artistas</span>
          <span className="text-green-600">{enrichedPercent.toFixed(0)}% enriquecido</span>
        </div>
        <Progress value={enrichedPercent} className="h-1" />
        <div className="flex gap-2 pt-1">
          <span title="Com letras">📝 {corpus.songsWithLyrics}</span>
          <span title="Com YouTube">🎬 {corpus.songsWithYouTube}</span>
          <span title="Com compositor">✍️ {corpus.songsWithComposer}</span>
        </div>
      </div>
    </div>
  );
}

function CatalogStatsOverviewSkeleton({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-4 w-full" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
