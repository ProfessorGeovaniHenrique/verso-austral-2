/**
 * 🎭 CULTURAL INSIGNIA ANALYSIS TOOL
 * 
 * Analytical visualization of cultural insignia distribution
 * with corpus comparison capabilities
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Award, 
  BarChart3, 
  Download, 
  Loader2,
  PieChart,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { INSIGNIAS_OPTIONS } from '@/data/types/cultural-insignia.types';
import { toast } from 'sonner';
import { useAnalysisTools } from '@/contexts/AnalysisToolsContext';

const INSIGNIA_COLORS: Record<string, string> = {
  'Gaúcho': 'hsl(var(--chart-1))',
  'Nordestino': 'hsl(var(--chart-2))',
  'Sertanejo': 'hsl(var(--chart-3))',
  'Caipira': 'hsl(var(--chart-4))',
  'Platino': 'hsl(var(--chart-5))',
  'Indígena': 'hsl(142, 71%, 45%)',
  'Brasileiro': 'hsl(200, 70%, 50%)',
};

interface InsigniaCount {
  insignia: string;
  count: number;
  percentage: number;
  words: string[];
}

interface CorpusInsigniaData {
  corpusName: string;
  totalWords: number;
  withInsignias: number;
  distribution: InsigniaCount[];
}

export function CulturalInsigniaAnalysisTool() {
  const { studyCorpus, referenceCorpus } = useAnalysisTools();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [studyData, setStudyData] = useState<CorpusInsigniaData | null>(null);
  const [referenceData, setReferenceData] = useState<CorpusInsigniaData | null>(null);

  // Fetch insignia data for a corpus
  const fetchCorpusInsigniaData = async (corpusType: string): Promise<CorpusInsigniaData> => {
    const { data, error } = await supabase
      .from('semantic_disambiguation_cache')
      .select('palavra, insignias_culturais')
      .not('insignias_culturais', 'is', null);

    if (error) throw error;

    const entries = data || [];
    const insigniaCounts: Record<string, { count: number; words: Set<string> }> = {};
    
    entries.forEach(entry => {
      if (entry.insignias_culturais && Array.isArray(entry.insignias_culturais)) {
        (entry.insignias_culturais as string[]).forEach(insignia => {
          if (!insigniaCounts[insignia]) {
            insigniaCounts[insignia] = { count: 0, words: new Set() };
          }
          insigniaCounts[insignia].count++;
          insigniaCounts[insignia].words.add(entry.palavra);
        });
      }
    });

    const totalWithInsignias = entries.length;
    const distribution: InsigniaCount[] = Object.entries(insigniaCounts)
      .map(([insignia, data]) => ({
        insignia,
        count: data.count,
        percentage: totalWithInsignias > 0 ? (data.count / totalWithInsignias) * 100 : 0,
        words: Array.from(data.words).slice(0, 10),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      corpusName: corpusType,
      totalWords: entries.length,
      withInsignias: totalWithInsignias,
      distribution,
    };
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const studyType = studyCorpus?.platformCorpus || 'gaucho';
      const refType = referenceCorpus?.platformCorpus || 'nordestino';

      const [study, reference] = await Promise.all([
        fetchCorpusInsigniaData(studyType),
        fetchCorpusInsigniaData(refType),
      ]);

      setStudyData(study);
      setReferenceData(reference);
      toast.success('Análise de insígnias concluída');
    } catch (error) {
      console.error('Error analyzing insignias:', error);
      toast.error('Erro ao analisar insígnias culturais');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getInsigniaLabel = (insignia: string) => {
    const option = INSIGNIAS_OPTIONS.find(o => o.value === insignia);
    return option?.label || insignia;
  };

  // Comparison data
  const comparisonData = useMemo(() => {
    if (!studyData || !referenceData) return [];

    const allInsignias = new Set([
      ...studyData.distribution.map(d => d.insignia),
      ...referenceData.distribution.map(d => d.insignia),
    ]);

    return Array.from(allInsignias).map(insignia => {
      const studyItem = studyData.distribution.find(d => d.insignia === insignia);
      const refItem = referenceData.distribution.find(d => d.insignia === insignia);

      return {
        insignia,
        label: getInsigniaLabel(insignia),
        studyCount: studyItem?.count || 0,
        studyPercentage: studyItem?.percentage || 0,
        refCount: refItem?.count || 0,
        refPercentage: refItem?.percentage || 0,
        difference: (studyItem?.percentage || 0) - (refItem?.percentage || 0),
      };
    }).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
  }, [studyData, referenceData]);

  const exportToCSV = () => {
    if (!studyData || !referenceData) return;

    const headers = ['Insígnia', 'Estudo (%)', 'Referência (%)', 'Diferença (%)'];
    const rows = comparisonData.map(d => [
      d.label,
      d.studyPercentage.toFixed(2),
      d.refPercentage.toFixed(2),
      d.difference.toFixed(2),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'analise-insignias-culturais.csv';
    link.click();

    toast.success('Dados exportados com sucesso');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Análise de Insígnias Culturais
          </CardTitle>
          <CardDescription>
            Visualize a distribuição de marcadores culturais regionais e compare entre corpora
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Award className="mr-2 h-4 w-4" />
                Analisar Insígnias Culturais
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Loading */}
      {isAnalyzing && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {/* Results */}
      {studyData && referenceData && !isAnalyzing && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Palavras Analisadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{studyData.totalWords.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total no corpus de estudo</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Com Insígnias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {studyData.withInsignias.toLocaleString()}
                </div>
                <Progress 
                  value={(studyData.withInsignias / studyData.totalWords) * 100} 
                  className="mt-2" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Insígnias Únicas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{studyData.distribution.length}</div>
                <p className="text-xs text-muted-foreground">Tipos identificados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Dominante</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  {studyData.distribution[0]?.insignia ? getInsigniaLabel(studyData.distribution[0].insignia) : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {studyData.distribution[0]?.percentage.toFixed(1)}% das palavras
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Visualizations */}
          <Tabs defaultValue="comparison" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="comparison">
                <BarChart3 className="h-4 w-4 mr-2" />
                Comparação
              </TabsTrigger>
              <TabsTrigger value="distribution">
                <PieChart className="h-4 w-4 mr-2" />
                Distribuição
              </TabsTrigger>
              <TabsTrigger value="words">
                <Award className="h-4 w-4 mr-2" />
                Palavras
              </TabsTrigger>
            </TabsList>

            {/* Comparison Chart */}
            <TabsContent value="comparison">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Comparação entre Corpora</CardTitle>
                    <CardDescription>
                      Distribuição percentual de insígnias culturais
                    </CardDescription>
                  </div>
                  <Button onClick={exportToCSV} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={comparisonData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" unit="%" />
                      <YAxis 
                        dataKey="label" 
                        type="category" 
                        width={120} 
                        tick={{ fontSize: 12 }} 
                      />
                      <Tooltip 
                        formatter={(value: number) => `${value.toFixed(2)}%`}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="studyPercentage" 
                        name="Corpus de Estudo" 
                        fill="hsl(var(--chart-1))" 
                        radius={[0, 4, 4, 0]} 
                      />
                      <Bar 
                        dataKey="refPercentage" 
                        name="Corpus de Referência" 
                        fill="hsl(var(--chart-2))" 
                        radius={[0, 4, 4, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Distribution Pie */}
            <TabsContent value="distribution">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Corpus de Estudo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RePieChart>
                        <Pie
                          data={studyData.distribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="count"
                          nameKey="insignia"
                          label={({ insignia, percentage }) => 
                            `${getInsigniaLabel(insignia)}: ${percentage.toFixed(0)}%`
                          }
                        >
                          {studyData.distribution.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={INSIGNIA_COLORS[entry.insignia] || `hsl(${index * 45}, 70%, 50%)`} 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => value.toLocaleString()}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--popover))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Corpus de Referência</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RePieChart>
                        <Pie
                          data={referenceData.distribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="count"
                          nameKey="insignia"
                          label={({ insignia, percentage }) => 
                            `${getInsigniaLabel(insignia)}: ${percentage.toFixed(0)}%`
                          }
                        >
                          {referenceData.distribution.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={INSIGNIA_COLORS[entry.insignia] || `hsl(${index * 45}, 70%, 50%)`} 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => value.toLocaleString()}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--popover))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Words Table */}
            <TabsContent value="words">
              <Card>
                <CardHeader>
                  <CardTitle>Palavras Representativas por Insígnia</CardTitle>
                  <CardDescription>
                    Exemplos de palavras classificadas com cada insígnia cultural
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Insígnia</TableHead>
                        <TableHead className="text-right">Estudo</TableHead>
                        <TableHead className="text-right">Referência</TableHead>
                        <TableHead className="text-right">Diferença</TableHead>
                        <TableHead>Palavras Exemplo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonData.map((row) => (
                        <TableRow key={row.insignia}>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              style={{ 
                                borderColor: INSIGNIA_COLORS[row.insignia] || 'hsl(var(--border))',
                                color: INSIGNIA_COLORS[row.insignia] || 'inherit'
                              }}
                            >
                              {row.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {row.studyPercentage.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {row.refPercentage.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {row.difference > 2 ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              ) : row.difference < -2 ? (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                              ) : (
                                <Minus className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className={
                                row.difference > 2 ? 'text-green-500' : 
                                row.difference < -2 ? 'text-red-500' : 
                                'text-muted-foreground'
                              }>
                                {row.difference > 0 ? '+' : ''}{row.difference.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {(studyData.distribution.find(d => d.insignia === row.insignia)?.words || [])
                                .slice(0, 5)
                                .map((word, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {word}
                                  </Badge>
                                ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
