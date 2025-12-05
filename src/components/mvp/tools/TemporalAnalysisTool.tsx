import { useState, useMemo, useEffect } from "react";
import { TrendingUp, Download, Loader2, Filter, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAnalysisTools } from "@/contexts/AnalysisToolsContext";
import { useCorpusCache } from "@/contexts/CorpusContext";
import { generateTemporalAnalysis, exportTemporalAnalysisToCSV, TemporalAnalysis } from "@/services/temporalAnalysisService";
import { CorpusCompleto } from "@/data/types/full-text-corpus.types";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
];

export function TemporalAnalysisTool() {
  const { studyCorpus } = useAnalysisTools();
  const corpusType = studyCorpus?.platformCorpus || 'gaucho';
  
  const [palavras, setPalavras] = useState<string[]>(['']);
  const [analyses, setAnalyses] = useState<Map<string, TemporalAnalysis>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedArtistas, setSelectedArtistas] = useState<string[]>([]);
  const [selectedAlbuns, setSelectedAlbuns] = useState<string[]>([]);
  const [anoInicio, setAnoInicio] = useState<string>('');
  const [anoFim, setAnoFim] = useState<string>('');

  const filters = useMemo(() => ({
    artistas: selectedArtistas.length > 0 ? selectedArtistas : undefined,
    albuns: selectedAlbuns.length > 0 ? selectedAlbuns : undefined,
    anoInicio: anoInicio ? parseInt(anoInicio) : undefined,
    anoFim: anoFim ? parseInt(anoFim) : undefined,
  }), [selectedArtistas, selectedAlbuns, anoInicio, anoFim]);

  const { getFullTextCache, isLoading: isCacheLoading } = useCorpusCache();
  const [corpus, setCorpus] = useState<CorpusCompleto | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const loadCorpus = async () => {
      try {
        setProgress(30);
        const cache = await getFullTextCache(corpusType, filters);
        setCorpus(cache.corpus);
        setProgress(100);
      } catch (error) {
        console.error('Erro ao carregar corpus:', error);
        toast.error('Erro ao carregar corpus');
      }
    };

    if (studyCorpus) {
      loadCorpus();
    }
  }, [corpusType, filters, getFullTextCache, studyCorpus]);

  const artistasDisponiveis = useMemo(() => {
    if (!corpus) return [];
    return Array.from(new Set(corpus.musicas.map(m => m.metadata.artista))).sort();
  }, [corpus]);

  const albunsDisponiveis = useMemo(() => {
    if (!corpus) return [];
    return Array.from(new Set(corpus.musicas.map(m => m.metadata.album))).sort();
  }, [corpus]);

  const handleAddPalavra = () => {
    if (palavras.length < 5) {
      setPalavras([...palavras, '']);
    }
  };

  const handleRemovePalavra = (index: number) => {
    if (palavras.length > 1) {
      setPalavras(palavras.filter((_, i) => i !== index));
    }
  };

  const handlePalavraChange = (index: number, value: string) => {
    const newPalavras = [...palavras];
    newPalavras[index] = value;
    setPalavras(newPalavras);
  };

  const handleAnalyze = () => {
    const validPalavras = palavras.filter(p => p.trim());
    
    if (validPalavras.length === 0) {
      toast.error('Digite pelo menos uma palavra para analisar');
      return;
    }

    if (!corpus) {
      toast.error('Corpus ainda não carregado');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      const result = generateTemporalAnalysis(corpus, validPalavras);
      setAnalyses(result);
      setIsProcessing(false);

      const totalWords = Array.from(result.values()).reduce((sum, a) => sum + a.totalOcorrencias, 0);
      if (totalWords === 0) {
        toast.warning('Nenhuma ocorrência encontrada para as palavras');
      } else {
        toast.success(`Análise concluída: ${totalWords} ocorrências totais`);
      }
    }, 100);
  };

  const handleExport = () => {
    if (analyses.size === 0) {
      toast.error('Nenhuma análise para exportar');
      return;
    }

    const csv = exportTemporalAnalysisToCSV(analyses);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analise_temporal_${corpusType}.csv`;
    link.click();

    toast.success('Dados exportados com sucesso');
  };

  // Preparar dados para o gráfico
  const chartData = useMemo(() => {
    if (analyses.size === 0) return [];

    const allYears = new Set<number>();
    analyses.forEach(analysis => {
      analysis.dataPoints.forEach(dp => allYears.add(dp.ano));
    });

    const sortedYears = Array.from(allYears).sort((a, b) => a - b);

    return sortedYears.map(ano => {
      const point: any = { ano };
      
      analyses.forEach((analysis, palavra) => {
        const dataPoint = analysis.dataPoints.find(dp => dp.ano === ano);
        point[palavra] = dataPoint ? dataPoint.frequenciaNormalizada : 0;
      });

      return point;
    });
  }, [analyses]);

  const getTendenciaColor = (tendencia: string) => {
    switch (tendencia) {
      case 'crescente': return 'hsl(var(--chart-1))';
      case 'decrescente': return 'hsl(var(--chart-5))';
      default: return 'hsl(var(--muted))';
    }
  };

  const getTendenciaIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'crescente': return '📈';
      case 'decrescente': return '📉';
      default: return '➡️';
    }
  };

  if (!studyCorpus) {
    return (
      <Alert>
        <AlertDescription>
          Selecione um corpus no seletor acima para iniciar a análise temporal.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Análise Temporal</CardTitle>
          <CardDescription>
            Visualize a evolução do uso de palavras ao longo dos anos no corpus {corpusType}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCacheLoading && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Carregando corpus...
              </p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Palavras-chave (máx. 5)</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddPalavra}
                disabled={palavras.length >= 5}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
            
            {palavras.map((palavra, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Palavra ${index + 1}...`}
                  value={palavra}
                  onChange={(e) => handlePalavraChange(index, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                />
                {palavras.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemovePalavra(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full">
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? 'Ocultar' : 'Mostrar'} Filtros Avançados
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Artista</Label>
                  <Select
                    value={selectedArtistas[0] || ''}
                    onValueChange={(v) => setSelectedArtistas(v ? [v] : [])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os artistas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {artistasDisponiveis.map(artista => (
                        <SelectItem key={artista} value={artista}>{artista}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Álbum</Label>
                  <Select
                    value={selectedAlbuns[0] || ''}
                    onValueChange={(v) => setSelectedAlbuns(v ? [v] : [])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os álbuns" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {albunsDisponiveis.map(album => (
                        <SelectItem key={album} value={album}>{album}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ano Inicial</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 1990"
                    value={anoInicio}
                    onChange={(e) => setAnoInicio(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ano Final</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 2020"
                    value={anoFim}
                    onChange={(e) => setAnoFim(e.target.value)}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={isCacheLoading || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Analisar
                </>
              )}
            </Button>

            <Button
              onClick={handleExport}
              disabled={analyses.size === 0}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {analyses.size > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from(analyses.values()).map((analysis, idx) => (
                  <Card key={analysis.palavra}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span style={{ color: CHART_COLORS[idx % CHART_COLORS.length] }}>
                          {analysis.palavra}
                        </span>
                        <span className="text-2xl">{getTendenciaIcon(analysis.tendencia)}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total:</span>
                        <Badge variant="secondary">{analysis.totalOcorrencias}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Período:</span>
                        <span className="font-medium">{analysis.anoInicio} - {analysis.anoFim}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tendência:</span>
                        <Badge 
                          style={{ 
                            backgroundColor: getTendenciaColor(analysis.tendencia),
                            color: 'white'
                          }}
                        >
                          {analysis.tendencia}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evolução Temporal</CardTitle>
              <CardDescription>
                Frequência normalizada (por 10.000 palavras) ao longo dos anos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="ano" 
                    label={{ value: 'Ano', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'Freq. Norm. (por 10k)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value: number) => value.toFixed(2)}
                    labelFormatter={(label) => `Ano: ${label}`}
                  />
                  <Legend />
                  {Array.from(analyses.keys()).map((palavra, idx) => (
                    <Line
                      key={palavra}
                      type="monotone"
                      dataKey={palavra}
                      stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
