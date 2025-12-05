/**
 * 🗺️ FERRAMENTA DE ANÁLISE DIALETAL
 * 
 * Detecta e categoriza marcas linguísticas regionais, expressões gaúchas e arcaísmos
 * utilizando o Dicionário da Cultura Pampeana Sul-Rio-Grandense
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Download, 
  Search, 
  Filter, 
  BookOpen, 
  Clock, 
  MapPin, 
  TrendingUp,
  Award,
  Sparkles,
  BarChart3,
  Calendar
} from 'lucide-react';
import { useKeywords } from '@/hooks/useKeywords';
import { useAnalysisTools } from '@/contexts/AnalysisToolsContext';
import { generateDialectalAnalysis } from '@/services/dialectalDictionaryService';
import { toast } from 'sonner';
import { DialectalWordCloud } from './DialectalWordCloud';

const CATEGORIA_LABELS = {
  lida_campeira: 'Lida Campeira',
  fauna: 'Fauna',
  flora: 'Flora',
  vestuario: 'Vestuário',
  culinaria: 'Culinária',
  musica: 'Música',
  habitacao: 'Habitação',
  clima: 'Clima',
  social: 'Social',
  geral: 'Geral'
};

const TIPO_COLORS = {
  regionalismo: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  arcaismo: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  platinismo: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  lexical: 'bg-slate-500/10 text-slate-700 border-slate-500/20',
  expressao: 'bg-green-500/10 text-green-700 border-green-500/20'
};

export function DialectalAnalysisTool() {
  const { studyCorpus, referenceCorpus } = useAnalysisTools();
  const corpusEstudo = studyCorpus?.platformCorpus || 'gaucho';
  const corpusReferencia = referenceCorpus?.platformCorpus || 'nordestino';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('todos');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [analysis, setAnalysis] = useState<ReturnType<typeof generateDialectalAnalysis> | null>(null);
  
  const { isLoading, error, processKeywords } = useKeywords();

  const handleAnalyze = async () => {
    if (corpusEstudo === corpusReferencia) {
      toast.error('Os corpus de estudo e referência devem ser diferentes');
      return;
    }

    await processKeywords(corpusEstudo, corpusReferencia);
  };

  // Filtros aplicados
  const filteredMarcas = useMemo(() => {
    if (!analysis) return [];
    
    return analysis.marcasDialetais.filter(marca => {
      const matchSearch = marca.termo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategoria = filterCategoria === 'todos' || marca.categoria === filterCategoria;
      const matchTipo = filterTipo === 'todos' || marca.tipo === filterTipo;
      
      return matchSearch && matchCategoria && matchTipo;
    });
  }, [analysis, searchTerm, filterCategoria, filterTipo]);

  const exportToCSV = () => {
    if (!analysis) return;
    
    const headers = ['Termo', 'Tipo', 'Categoria', 'Score', 'LL', 'MI', 'Origem', 'Status', 'Definição'];
    const rows = analysis.marcasDialetais.map(m => [
      m.termo,
      m.tipo,
      m.categoria,
      m.score.toFixed(2),
      m.ll.toFixed(2),
      m.mi.toFixed(2),
      m.origem || '',
      m.statusTemporal || '',
      m.definicao || ''
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analise-dialetal-${corpusEstudo}.csv`;
    a.click();
    
    toast.success('Análise exportada com sucesso!');
  };

  if (!studyCorpus || !referenceCorpus) {
    return (
      <Alert>
        <AlertDescription>
          Selecione os corpus de estudo e referência nos seletores acima para iniciar a análise dialetal.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com seleção de corpus */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Análise Dialetal
          </CardTitle>
          <CardDescription>
            Detecção automática de marcas linguísticas regionais usando o Dicionário da Cultura Pampeana.
            Comparando: {corpusEstudo} vs {corpusReferencia}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleAnalyze} 
            disabled={isLoading || corpusEstudo === corpusReferencia}
            className="w-full"
          >
            {isLoading ? (
              <>Analisando...</>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Detectar Marcas Dialetais
              </>
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {/* Results */}
      {analysis && !isLoading && (
        <>
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  Total de Marcas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analysis.estatisticas.totalMarcas}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analysis.estatisticas.coberturaDicionario}% no dicionário
                </p>
                <Progress value={Number(analysis.estatisticas.coberturaDicionario)} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Arcaísmos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">
                  {analysis.estatisticas.arcaismos}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Palavras antigas em desuso
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-purple-600" />
                  Platinismos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {analysis.estatisticas.platinismos}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Palavras de origem platina
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Regionalismos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {analysis.estatisticas.regionalismos}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Palavras distintivas brasileiras
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs: Tabela / Visualizações */}
          <Tabs defaultValue="table" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="table">
                <Filter className="h-4 w-4 mr-2" />
                Tabela
              </TabsTrigger>
              <TabsTrigger value="wordcloud">
                <Sparkles className="h-4 w-4 mr-2" />
                Nuvem
              </TabsTrigger>
              <TabsTrigger value="heatmap">
                <BarChart3 className="h-4 w-4 mr-2" />
                Heatmap
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <Calendar className="h-4 w-4 mr-2" />
                Timeline
              </TabsTrigger>
            </TabsList>

            {/* Tabela Interativa */}
            <TabsContent value="table" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Marcas Dialetais ({filteredMarcas.length})</CardTitle>
                    <Button onClick={exportToCSV} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar CSV
                    </Button>
                  </div>
                  
                  {/* Filtros */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar termo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="todos">Todas as categorias</SelectItem>
                        {Object.entries(CATEGORIA_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filterTipo} onValueChange={setFilterTipo}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="todos">Todos os tipos</SelectItem>
                        <SelectItem value="regionalismo">Regionalismo</SelectItem>
                        <SelectItem value="arcaismo">Arcaísmo</SelectItem>
                        <SelectItem value="platinismo">Platinismo</SelectItem>
                        <SelectItem value="lexical">Léxico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Termo</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead className="text-right">Score</TableHead>
                          <TableHead className="text-right">LL</TableHead>
                          <TableHead>Origem</TableHead>
                          <TableHead>Definição</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMarcas.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                              Nenhuma marca dialetal encontrada com os filtros aplicados
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredMarcas.slice(0, 50).map((marca, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{marca.termo}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={TIPO_COLORS[marca.tipo]}>
                                  {marca.tipo}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  {CATEGORIA_LABELS[marca.categoria as keyof typeof CATEGORIA_LABELS]}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {marca.score.toFixed(1)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {marca.ll.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                {marca.origem && (
                                  <Badge variant="secondary" className="text-xs">
                                    {marca.origem}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="max-w-md">
                                {marca.definicao ? (
                                  <div className="flex items-start gap-2">
                                    <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-muted-foreground line-clamp-2">
                                      {marca.definicao}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">
                                    Sem definição
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {filteredMarcas.length > 50 && (
                    <p className="text-sm text-muted-foreground text-center mt-4">
                      Mostrando 50 de {filteredMarcas.length} resultados
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Nuvem de Palavras */}
            <TabsContent value="wordcloud">
              <Card>
                <CardHeader>
                  <CardTitle>Nuvem de Palavras Dialetais</CardTitle>
                  <CardDescription>
                    Tamanho proporcional ao score de relevância
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analysis.marcasDialetais.length > 0 ? (
                    <DialectalWordCloud marcas={analysis.marcasDialetais} />
                  ) : (
                    <div className="text-center text-muted-foreground py-12">
                      Nenhuma marca dialetal para visualizar
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Placeholder para Heatmap */}
            <TabsContent value="heatmap">
              <Card>
                <CardHeader>
                  <CardTitle>Heatmap de Categorias</CardTitle>
                  <CardDescription>
                    Visualização em construção
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-muted-foreground py-12">
                    Visualização de heatmap em desenvolvimento
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Placeholder para Timeline */}
            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <CardTitle>Timeline de Arcaísmos</CardTitle>
                  <CardDescription>
                    Visualização em construção
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-muted-foreground py-12">
                    Visualização de timeline em desenvolvimento
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
