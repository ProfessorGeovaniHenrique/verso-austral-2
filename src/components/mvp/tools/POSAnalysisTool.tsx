/**
 * 🔤 FERRAMENTA DE ANÁLISE POS (Morfossintática)
 * 
 * Analisa e visualiza anotações morfossintáticas do corpus
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {  Layers, Download, Info, PlayCircle } from 'lucide-react';
import { useFullTextCorpus } from '@/hooks/useFullTextCorpus';
import { annotatePOSForCorpus, getPOSStatistics } from '@/services/posAnnotationService';
import type { CorpusComPOS, POSStatistics } from '@/data/types/pos-annotation.types';
import { toast } from 'sonner';

const POS_LABELS: Record<string, string> = {
  NOUN: 'Substantivos',
  VERB: 'Verbos',
  ADJ: 'Adjetivos',
  ADV: 'Advérbios',
  PRON: 'Pronomes',
  DET: 'Determinantes',
  ADP: 'Preposições',
  CONJ: 'Conjunções',
  NUM: 'Numerais',
  PROPN: 'Nomes Próprios',
  AUX: 'Auxiliares',
  PART: 'Partículas',
  INTJ: 'Interjeições',
  PUNCT: 'Pontuação',
};

const POS_COLORS: Record<string, string> = {
  NOUN: '#3b82f6',
  VERB: '#ef4444',
  ADJ: '#10b981',
  ADV: '#f59e0b',
  PRON: '#8b5cf6',
  DET: '#ec4899',
  ADP: '#6366f1',
  CONJ: '#14b8a6',
  NUM: '#f97316',
  PROPN: '#06b6d4',
  AUX: '#84cc16',
  PART: '#a3a3a3',
  INTJ: '#fbbf24',
  PUNCT: '#64748b',
};

export function POSAnalysisTool() {
  const [annotatedCorpus, setAnnotatedCorpus] = useState<CorpusComPOS | null>(null);
  const [statistics, setStatistics] = useState<POSStatistics | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { corpus, isLoading: isLoadingCorpus } = useFullTextCorpus('gaucho');

  const handleAnnotate = async () => {
    if (!corpus) {
      toast.error('Corpus não carregado');
      return;
    }

    setIsProcessing(true);

    try {
      toast.info('Iniciando anotação POS... Isso pode levar alguns minutos.');
      const annotated = await annotatePOSForCorpus(corpus);
      const stats = getPOSStatistics(annotated);

      setAnnotatedCorpus(annotated);
      setStatistics(stats);
      toast.success(`Análise POS concluída! ${stats.totalTokens} tokens anotados.`);
    } catch (error) {
      console.error('[POS] Error:', error);
      toast.error('Erro ao processar análise POS');
    } finally {
      setIsProcessing(false);
    }
  };

  const exportToCSV = () => {
    if (!annotatedCorpus || !statistics) return;

    const headers = ['Palavra', 'Lema', 'POS', 'POS_Detalhada', 'Música', 'Artista'];
    const rows: string[][] = [];

    annotatedCorpus.musicas.forEach(musica => {
      musica.tokens.forEach(token => {
        rows.push([
          token.palavra,
          token.lema,
          token.pos,
          token.posDetalhada || '',
          musica.metadata.musica,
          musica.metadata.artista
        ]);
      });
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pos-annotation.csv';
    link.click();

    toast.success('Anotações exportadas!');
  };

  // Preparar dados para gráficos
  const posDistributionData = statistics
    ? Object.entries(statistics.distribuicaoPercentual)
        .filter(([pos]) => pos !== 'PUNCT') // Excluir pontuação
        .map(([pos, percentage]) => ({
          name: POS_LABELS[pos] || pos,
          value: parseFloat(percentage.toFixed(1)),
          fill: POS_COLORS[pos] || '#64748b',
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  const verbTensesData = statistics?.temposVerbais
    ? Object.entries(statistics.temposVerbais).map(([tempo, count]) => ({
        name: tempo === 'Pres' ? 'Presente' : tempo === 'Past' ? 'Passado' : 'Futuro',
        value: count
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Card de Controle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Análise Morfossintática (POS Tagging)
          </CardTitle>
          <CardDescription>
            Anota automaticamente o corpus com classes gramaticais e características morfológicas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleAnnotate}
              disabled={isProcessing || isLoadingCorpus || !corpus}
              className="flex-1"
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              {isProcessing ? 'Processando...' : 'Iniciar Análise POS'}
            </Button>

            {statistics && (
              <Button onClick={exportToCSV} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            )}
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={50} />
              <p className="text-sm text-muted-foreground text-center">
                Processando corpus com análise computacional... Isso pode levar alguns minutos.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoadingCorpus && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {/* Resultados */}
      {statistics && annotatedCorpus && (
        <>
          {/* Estatísticas Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total de Tokens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{statistics.totalTokens.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Palavras analisadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Músicas Analisadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{annotatedCorpus.totalMusicas}</div>
                <p className="text-xs text-muted-foreground mt-1">Do corpus {annotatedCorpus.tipo}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Densidade Lexical</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {(statistics.densidadeLexical * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Palavras de conteúdo</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Classes Identificadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {Object.keys(statistics.distribuicaoPOS).length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">POS tags diferentes</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribuição de POS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuição de Classes Gramaticais</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={posDistributionData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis label={{ value: '% do Total', angle: -90, position: 'insideLeft' }} />
                    <RechartsTooltip />
                    <Bar dataKey="value" name="Percentual">
                      {posDistributionData.slice(0, 10).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Tempos Verbais */}
            {verbTensesData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribuição de Tempos Verbais</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={verbTensesData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {verbTensesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#ef4444', '#f59e0b', '#10b981'][index]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tabela de Top Lemas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Lemas por Classe Gramatical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {['NOUN', 'VERB', 'ADJ', 'ADV', 'PRON', 'ADP'].map(pos => {
                  const lemas = statistics.lemasFrequentes
                    .filter(l => l.pos === pos)
                    .slice(0, 8);
                  
                  return (
                    <div key={pos}>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Badge variant="outline" style={{ backgroundColor: POS_COLORS[pos] + '20' }}>
                          {POS_LABELS[pos]}
                        </Badge>
                      </h4>
                      <div className="space-y-1">
                        {lemas.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="font-mono text-muted-foreground">{item.lema}</span>
                            <span className="text-muted-foreground">{item.frequencia}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Sobre a Análise:</strong> A anotação POS utiliza processamento automático avançado para identificar
              automaticamente classes gramaticais, lemas e características morfológicas. Os resultados são
              salvos em cache para consulta rápida. Esta análise é fundamental para estudos estilísticos avançados.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
