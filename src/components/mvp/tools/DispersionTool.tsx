import { useState, useEffect } from "react";
import { Search, Download, Loader2, TrendingUp, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubcorpus } from "@/contexts/SubcorpusContext";
import { useTools } from "@/contexts/ToolsContext";
import { generateDispersion, exportDispersionToCSV } from "@/services/dispersionService";
import { DispersionAnalysis, CorpusCompleto } from "@/data/types/full-text-corpus.types";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";

export function DispersionTool() {
  const { getFilteredCorpus, currentMetadata } = useSubcorpus();
  const { dispersionState, setDispersionState } = useTools();
  const [isProcessing, setIsProcessing] = useState(false);
  const [corpus, setCorpus] = useState<CorpusCompleto | null>(null);
  const [isLoadingCorpus, setIsLoadingCorpus] = useState(false);
  
  // Usar estado do context
  const palavra = dispersionState.palavra;
  const setPalavra = (val: string) => setDispersionState({ palavra: val });
  const analysis = dispersionState.analysis;
  const setAnalysis = (val: DispersionAnalysis | null) => setDispersionState({ analysis: val });
  
  // Carregar corpus filtrado
  useEffect(() => {
    const loadCorpus = async () => {
      setIsLoadingCorpus(true);
      try {
        const filteredCorpus = await getFilteredCorpus();
        setCorpus(filteredCorpus);
      } catch (error) {
        console.error('Erro ao carregar corpus:', error);
        toast.error('Erro ao carregar corpus');
      } finally {
        setIsLoadingCorpus(false);
      }
    };
    
    loadCorpus();
  }, [getFilteredCorpus]);
  
  const handleAnalyze = () => {
    if (!palavra.trim()) {
      toast.error('Digite uma palavra para analisar');
      return;
    }
    
    if (!corpus) {
      toast.error('Corpus ainda não carregado');
      return;
    }
    
    setIsProcessing(true);
    
    setTimeout(() => {
      const result = generateDispersion(corpus, palavra);
      setAnalysis(result);
      setIsProcessing(false);
      
      if (result.totalOcorrencias === 0) {
        toast.warning(`Nenhuma ocorrência de "${palavra}" encontrada`);
      } else {
        toast.success(`Análise concluída: ${result.totalOcorrencias} ocorrências`);
      }
    }, 100);
  };
  
  const handleExport = () => {
    if (!analysis) {
      toast.error('Nenhuma análise para exportar');
      return;
    }
    
    const csv = exportDispersionToCSV(analysis);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const subcorpusLabel = currentMetadata ? `_${currentMetadata.artista.replace(/\s+/g, '_')}` : '';
    link.download = `dispersao_${analysis.palavra}${subcorpusLabel}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Dados exportados com sucesso');
  };
  
  const chartData = analysis?.pontos.map((p, idx) => ({
    x: p.posicaoNoCorpus * 100,
    y: idx + 1,
    artista: p.metadata.artista,
    musica: p.metadata.musica
  })) || [];
  
  const getDensityColor = (densidade: string) => {
    switch (densidade) {
      case 'Alta': return 'hsl(var(--chart-1))';
      case 'Média': return 'hsl(var(--chart-3))';
      case 'Baixa': return 'hsl(var(--chart-5))';
      default: return 'hsl(var(--muted))';
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Indicador de Subcorpus */}
      {currentMetadata && (
        <Alert className="border-primary/20 bg-primary/5">
          <Music className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-3">
            <span>
              Analisando subcorpus: <strong className="text-primary">{currentMetadata.artista}</strong>
            </span>
            <Badge variant="outline" className="gap-1">
              {currentMetadata.totalMusicas} músicas
            </Badge>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">
              {currentMetadata.totalPalavras.toLocaleString()} palavras
            </span>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Progress bar durante carregamento */}
      {isLoadingCorpus && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Carregando corpus...</span>
              </div>
              <Progress value={50} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle>Análise de Dispersão</CardTitle>
          <CardDescription>
            Visualize como uma palavra está distribuída ao longo do corpus
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="palavra-input">Palavra para análise</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="palavra-input"
                  placeholder="Digite uma palavra..."
                  value={palavra}
                  onChange={(e) => setPalavra(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleAnalyze} 
              disabled={isProcessing || !corpus || !palavra.trim()}
              className="gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4" />
                  Analisar Dispersão
                </>
              )}
            </Button>
            
            {analysis && (
              <Button variant="outline" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Resultados */}
      {analysis && (
        <div className="space-y-6">
          {/* Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{analysis.totalOcorrencias}</div>
                <p className="text-xs text-muted-foreground">Total de Ocorrências</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{analysis.musicasComPalavra}</div>
                <p className="text-xs text-muted-foreground">Músicas com a Palavra</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{analysis.coeficienteDispersao.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Coeficiente de Dispersão</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={analysis.densidade === 'Alta' ? 'default' : analysis.densidade === 'Média' ? 'secondary' : 'outline'}
                    className="text-lg"
                  >
                    {analysis.densidade}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Densidade</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Gráfico de dispersão */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de "{analysis.palavra}" no Corpus</CardTitle>
              <CardDescription>
                Cada ponto representa uma ocorrência da palavra ao longo do corpus
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    domain={[0, 100]}
                    label={{ value: 'Posição no Corpus (%)', position: 'insideBottom', offset: -10 }}
                  />
                  <YAxis type="number" domain={[0, 2]} hide />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold">{data.artista}</p>
                            <p className="text-sm text-muted-foreground">{data.musica}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Posição: {data.x.toFixed(1)}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter data={chartData} fill={getDensityColor(analysis.densidade)}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getDensityColor(analysis.densidade)} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
