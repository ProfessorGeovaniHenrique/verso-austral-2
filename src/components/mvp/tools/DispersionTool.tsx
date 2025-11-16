import { useState, useMemo } from "react";
import { Search, Download, Loader2, TrendingUp, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useFullTextCorpus } from "@/hooks/useFullTextCorpus";
import { generateDispersion, exportDispersionToCSV } from "@/services/dispersionService";
import { DispersionAnalysis } from "@/data/types/full-text-corpus.types";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";

export function DispersionTool() {
  const [corpusType, setCorpusType] = useState<'gaucho' | 'nordestino'>('gaucho');
  const [palavra, setPalavra] = useState('');
  const [analysis, setAnalysis] = useState<DispersionAnalysis | null>(null);
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
  
  const { corpus, isLoading, error, progress } = useFullTextCorpus(corpusType, filters);
  
  const artistasDisponiveis = useMemo(() => {
    if (!corpus) return [];
    return Array.from(new Set(corpus.musicas.map(m => m.metadata.artista))).sort();
  }, [corpus]);
  
  const albunsDisponiveis = useMemo(() => {
    if (!corpus) return [];
    return Array.from(new Set(corpus.musicas.map(m => m.metadata.album))).sort();
  }, [corpus]);
  
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
    link.download = `dispersao_${palavra}_${corpusType}.csv`;
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
      <Card>
        <CardHeader>
          <CardTitle>Análise de Dispersão</CardTitle>
          <CardDescription>
            Visualize como uma palavra está distribuída ao longo do corpus
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando corpus...
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
          
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Corpus</Label>
              <Select value={corpusType} onValueChange={(v) => setCorpusType(v as 'gaucho' | 'nordestino')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gaucho">🎸 Corpus Gaúcho</SelectItem>
                  <SelectItem value="nordestino">🪘 Corpus Nordestino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Palavra</Label>
              <Input
                placeholder="Digite uma palavra..."
                value={palavra}
                onChange={(e) => setPalavra(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              />
            </div>
          </div>
          
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full">
                <Filter className="mr-2 h-4 w-4" />
                Filtros Avançados
                {(selectedArtistas.length > 0 || selectedAlbuns.length > 0 || anoInicio || anoFim) && (
                  <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                    Ativos
                  </span>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Filtrar por Artista</Label>
                  <Select 
                    value={selectedArtistas[0] || ''} 
                    onValueChange={(v) => setSelectedArtistas(v ? [v] : [])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os artistas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os artistas</SelectItem>
                      {artistasDisponiveis.map(artista => (
                        <SelectItem key={artista} value={artista}>{artista}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Filtrar por Álbum</Label>
                  <Select 
                    value={selectedAlbuns[0] || ''} 
                    onValueChange={(v) => setSelectedAlbuns(v ? [v] : [])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os álbuns" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os álbuns</SelectItem>
                      {albunsDisponiveis.map(album => (
                        <SelectItem key={album} value={album}>{album}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Ano Início</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 1990"
                    value={anoInicio}
                    onChange={(e) => setAnoInicio(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Ano Fim</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 2020"
                    value={anoFim}
                    onChange={(e) => setAnoFim(e.target.value)}
                  />
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedArtistas([]);
                  setSelectedAlbuns([]);
                  setAnoInicio('');
                  setAnoFim('');
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </CollapsibleContent>
          </Collapsible>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleAnalyze} 
              disabled={isLoading || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Analisar
                </>
              )}
            </Button>
            
            <Button 
              onClick={handleExport} 
              variant="outline"
              disabled={!analysis}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {analysis && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Estatísticas de Dispersão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total de Ocorrências</p>
                  <p className="text-2xl font-bold">{analysis.totalOcorrencias}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Músicas com a Palavra</p>
                  <p className="text-2xl font-bold">{analysis.musicasComPalavra}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Coeficiente de Dispersão</p>
                  <p className="text-2xl font-bold">{analysis.coeficienteDispersao.toFixed(3)}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Densidade</p>
                  <Badge 
                    variant={analysis.densidade === 'Alta' ? 'default' : analysis.densidade === 'Média' ? 'secondary' : 'outline'}
                    className="text-base px-3 py-1"
                  >
                    {analysis.densidade}
                  </Badge>
                </div>
              </div>
              
              <div className="mt-4 p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
                <p className="font-medium mb-1">Interpretação:</p>
                <p>
                  {analysis.densidade === 'Alta' && 'A palavra está distribuída de forma equilibrada ao longo do corpus.'}
                  {analysis.densidade === 'Média' && 'A palavra tem uma distribuição moderada, com algumas concentrações.'}
                  {analysis.densidade === 'Baixa' && 'A palavra está concentrada em partes específicas do corpus.'}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Gráfico de Dispersão</CardTitle>
              <CardDescription>
                Distribuição da palavra "{analysis.palavra}" ao longo do corpus
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Posição" 
                    unit="%"
                    domain={[0, 100]}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Ocorrência"
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    content={({ payload }) => {
                      if (payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div className="p-2 space-y-1">
                            <p className="font-medium">{data.artista}</p>
                            <p className="text-sm text-muted-foreground">{data.musica}</p>
                            <p className="text-xs">Posição: {data.x.toFixed(1)}%</p>
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
        </>
      )}
    </div>
  );
}
