import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Database, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import type { SongMetadata } from '@/data/types/full-text-corpus.types';

interface EnrichedSongData extends SongMetadata {
  status: 'pending' | 'enriching' | 'validated' | 'rejected' | 'error' | 'applied';
  sugestao?: {
    compositor?: string;
    artista?: string;
    album?: string;
    ano?: string;
    fonte: 'musicbrainz' | 'ai-inferred' | 'not-found';
    confianca: number;
    detalhes?: string;
  };
}

interface MetadataQualityDashboardProps {
  songs: EnrichedSongData[];
}

export function MetadataQualityDashboard({ songs }: MetadataQualityDashboardProps) {
  const stats = useMemo(() => {
    const enriched = songs.filter(s => s.sugestao && s.sugestao.fonte !== 'not-found');
    const validated = songs.filter(s => s.status === 'validated');
    const applied = songs.filter(s => s.status === 'applied');
    
    // Taxa de sucesso
    const successRate = songs.length > 0 
      ? (enriched.length / songs.filter(s => s.status !== 'pending').length) * 100 
      : 0;

    // Confiança média
    const avgConfidence = enriched.length > 0
      ? enriched.reduce((sum, s) => sum + (s.sugestao?.confianca || 0), 0) / enriched.length
      : 0;

    // Distribuição de fontes
    const sourceDistribution = {
      musicbrainz: enriched.filter(s => s.sugestao?.fonte === 'musicbrainz').length,
      ai: enriched.filter(s => s.sugestao?.fonte === 'ai-inferred').length,
      notFound: songs.filter(s => s.sugestao?.fonte === 'not-found').length,
    };

    // Completude de campos
    const fieldCompleteness = {
      compositor: (enriched.filter(s => s.sugestao?.compositor).length / enriched.length) * 100 || 0,
      album: (enriched.filter(s => s.sugestao?.album).length / enriched.length) * 100 || 0,
      ano: (enriched.filter(s => s.sugestao?.ano).length / enriched.length) * 100 || 0,
    };

    return {
      total: songs.length,
      enriched: enriched.length,
      validated: validated.length,
      applied: applied.length,
      successRate,
      avgConfidence,
      sourceDistribution,
      fieldCompleteness,
    };
  }, [songs]);

  return (
    <div className="space-y-6">
      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Taxa de Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.successRate.toFixed(1)}%</div>
            <Progress value={stats.successRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.enriched} de {stats.total} músicas enriquecidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              Confiança Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.avgConfidence.toFixed(0)}%</div>
            <Progress value={stats.avgConfidence} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Baseado em {stats.enriched} análises
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-purple-600" />
              Músicas Validadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.validated}</div>
            <Progress value={(stats.validated / stats.total) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {((stats.validated / stats.total) * 100).toFixed(1)}% do corpus
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-orange-600" />
              Aplicadas ao Corpus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.applied}</div>
            <Progress value={(stats.applied / stats.total) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {((stats.applied / stats.total) * 100).toFixed(1)}% aplicadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição de Fontes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Distribuição de Fontes de Dados
          </CardTitle>
          <CardDescription>
            Origem dos metadados enriquecidos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  MusicBrainz
                </span>
                <Badge variant="secondary">{stats.sourceDistribution.musicbrainz}</Badge>
              </div>
              <Progress 
                value={(stats.sourceDistribution.musicbrainz / stats.enriched) * 100 || 0} 
                className="h-2"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  IA Inferida
                </span>
                <Badge variant="secondary">{stats.sourceDistribution.ai}</Badge>
              </div>
              <Progress 
                value={(stats.sourceDistribution.ai / stats.enriched) * 100 || 0} 
                className="h-2"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  Não Encontrado
                </span>
                <Badge variant="outline">{stats.sourceDistribution.notFound}</Badge>
              </div>
              <Progress 
                value={(stats.sourceDistribution.notFound / stats.total) * 100 || 0} 
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completude de Campos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Completude de Campos
          </CardTitle>
          <CardDescription>
            Percentual de preenchimento dos metadados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Compositor</span>
                <span className="text-sm text-muted-foreground">{stats.fieldCompleteness.compositor.toFixed(1)}%</span>
              </div>
              <Progress value={stats.fieldCompleteness.compositor} className="h-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Álbum</span>
                <span className="text-sm text-muted-foreground">{stats.fieldCompleteness.album.toFixed(1)}%</span>
              </div>
              <Progress value={stats.fieldCompleteness.album} className="h-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Ano</span>
                <span className="text-sm text-muted-foreground">{stats.fieldCompleteness.ano.toFixed(1)}%</span>
              </div>
              <Progress value={stats.fieldCompleteness.ano} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
