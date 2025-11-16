/**
 * 🔤 FERRAMENTA DE N-GRAMS DIALETAIS
 * 
 * Identifica e analisa expressões multi-palavra típicas da cultura gaúcha
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Search, 
  Sparkles,
  BookOpen,
  TrendingUp,
  Award,
  Info
} from 'lucide-react';
import { useFullTextCorpus } from '@/hooks/useFullTextCorpus';
import { generateNGrams } from '@/services/ngramsService';
import { analyzeDialectalNGrams, filterByCategory, filterByType, getDialectalNGramsStats, DialectalNGram } from '@/services/dialectalNGramsService';
import { toast } from 'sonner';
import { CorpusType, CORPUS_CONFIG } from '@/data/types/corpus-tools.types';

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
  expressao_fixa: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  colocacao_forte: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  colocacao_media: 'bg-slate-500/10 text-slate-700 border-slate-500/20'
};

const TIPO_LABELS = {
  expressao_fixa: 'Expressão Fixa',
  colocacao_forte: 'Colocação Forte',
  colocacao_media: 'Colocação Média'
};

export function DialectalNGramsTool() {
  const [corpusEstudo, setCorpusEstudo] = useState<CorpusType>('gaucho');
  const [corpusReferencia, setCorpusReferencia] = useState<CorpusType>('nordestino');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('todos');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [filterTamanho, setFilterTamanho] = useState('todos');
  const [dialectalNGrams, setDialectalNGrams] = useState<DialectalNGram[]>([]);
  const [isProcessed, setIsProcessed] = useState(false);

  const { corpus, isLoading, error } = useFullTextCorpus(corpusEstudo);

  const handleAnalyze = () => {
    if (corpusEstudo === corpusReferencia) {
      toast.error('Os corpus de estudo e referência devem ser diferentes!');
      return;
    }

    if (!corpus || corpus.musicas.length === 0) {
      toast.error('Corpus não carregado. Aguarde o carregamento.');
      return;
    }

    // Gera N-grams (2, 3 e 4 palavras)
    const ngrams2 = generateNGrams(corpus, 2);
    const ngrams3 = generateNGrams(corpus, 3);
    const ngrams4 = generateNGrams(corpus, 4);

    const allNGrams = [...ngrams2.ngrams, ...ngrams3.ngrams, ...ngrams4.ngrams];

    // Analisa N-grams dialetais
    const dialectal = analyzeDialectalNGrams(allNGrams);
    setDialectalNGrams(dialectal);
    setIsProcessed(true);

    toast.success(`${dialectal.length} expressões dialetais identificadas!`);
  };

  // Filtros aplicados
  const filteredNGrams = useMemo(() => {
    let filtered = dialectalNGrams;

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(ng => 
        ng.ngram.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por categoria
    filtered = filterByCategory(filtered, filterCategoria);

    // Filtro por tipo
    filtered = filterByType(filtered, filterTipo);

    // Filtro por tamanho (quantidade de palavras)
    if (filterTamanho !== 'todos') {
      const tamanho = parseInt(filterTamanho);
      filtered = filtered.filter(ng => ng.ngram.split(' ').length === tamanho);
    }

    return filtered;
  }, [dialectalNGrams, searchTerm, filterCategoria, filterTipo, filterTamanho]);

  const stats = useMemo(() => {
    if (dialectalNGrams.length === 0) return null;
    return getDialectalNGramsStats(dialectalNGrams);
  }, [dialectalNGrams]);

  const exportToCSV = () => {
    if (dialectalNGrams.length === 0) return;

    const headers = ['Expressão', 'Tipo', 'Frequência', 'Score', 'Categoria', 'Palavras Dialetais', 'Definição'];
    const rows = dialectalNGrams.map(ng => [
      ng.ngram,
      TIPO_LABELS[ng.tipo],
      ng.frequencia,
      ng.score.toFixed(1),
      ng.categoria ? CATEGORIA_LABELS[ng.categoria as keyof typeof CATEGORIA_LABELS] : '',
      ng.palavrasDialetais.join('; '),
      ng.definicao || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ngrams-dialetais.csv';
    a.click();

    toast.success('N-grams exportados com sucesso!');
  };

  return (
    <div className="space-y-6">
      {/* Card inicial com seleção de corpus */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Análise de N-grams Dialetais
          </CardTitle>
          <CardDescription>
            Identifica expressões multi-palavra típicas da cultura gaúcha
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Corpus de Estudo</label>
              <Select 
                value={corpusEstudo} 
                onValueChange={(value: CorpusType) => {
                  setCorpusEstudo(value);
                  setIsProcessed(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CORPUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.icon} {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Corpus de Referência</label>
              <Select 
                value={corpusReferencia} 
                onValueChange={(value: CorpusType) => {
                  setCorpusReferencia(value);
                  setIsProcessed(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CORPUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.icon} {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleAnalyze}
            disabled={isLoading || !corpus || corpusEstudo === corpusReferencia}
            className="w-full"
          >
            <Search className="mr-2 h-4 w-4" />
            Analisar Expressões Dialetais
          </Button>

          {error && (
            <Alert variant="destructive" className="mt-4">
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

      {/* Resultados */}
      {isProcessed && (
        <>
          {/* Header com corpus info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    Expressões Dialetais - {CORPUS_CONFIG[corpusEstudo].label}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {dialectalNGrams.length} expressões identificadas
                  </p>
                </div>
                <Button onClick={exportToCSV} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  Total de Expressões
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Expressões identificadas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-purple-600" />
                  Expressões Fixas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {stats.expressoesFixes}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Do dicionário pampeano
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Colocações Fortes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {stats.colocacoesFortes}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Alta associação
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-slate-600" />
                  Média de Frequência
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-600">
                  {stats.mediaFrequencia}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ocorrências por expressão
                </p>
              </CardContent>
            </Card>
          </div>
          )}

          {/* Tabela */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Expressões Dialetais ({filteredNGrams.length})</CardTitle>
                <Button onClick={exportToCSV} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>

              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar expressão..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={filterTamanho} onValueChange={setFilterTamanho}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Tamanho" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="todos">Todos os tamanhos</SelectItem>
                    <SelectItem value="2">Bigramas (2 palavras)</SelectItem>
                    <SelectItem value="3">Trigramas (3 palavras)</SelectItem>
                    <SelectItem value="4">Quadrigramas (4 palavras)</SelectItem>
                  </SelectContent>
                </Select>

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
                    <SelectItem value="expressao_fixa">Expressão Fixa</SelectItem>
                    <SelectItem value="colocacao_forte">Colocação Forte</SelectItem>
                    <SelectItem value="colocacao_media">Colocação Média</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Expressão</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Freq.</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Palavras Dialetais</TableHead>
                      <TableHead>Definição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNGrams.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhuma expressão encontrada com os filtros aplicados
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredNGrams.map((ng, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{ng.ngram}</TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className={TIPO_COLORS[ng.tipo]}>
                                    {TIPO_LABELS[ng.tipo]}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  {ng.tipo === 'expressao_fixa' && (
                                    <p className="text-xs">
                                      <strong>Expressão Fixa:</strong> Fórmula consolidada que consta no Dicionário Pampeano. 
                                      Exemplo: "tomar um mate", "fazer rodeio".
                                    </p>
                                  )}
                                  {ng.tipo === 'colocacao_forte' && (
                                    <p className="text-xs">
                                      <strong>Colocação Forte:</strong> Combinação com alta frequência e forte associação estatística. 
                                      As palavras aparecem juntas muito mais do que o esperado ao acaso.
                                    </p>
                                  )}
                                  {ng.tipo === 'colocacao_media' && (
                                    <p className="text-xs">
                                      <strong>Colocação Média:</strong> Combinação com frequência moderada que contém palavras dialetais. 
                                      A associação é relevante, mas menos consistente.
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {ng.frequencia}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2">
                              <Progress value={(ng.score / 150) * 100} className="h-2 w-16" />
                              <span className="font-mono text-sm">{ng.score.toFixed(0)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {ng.categoria && (
                              <span className="text-sm text-muted-foreground">
                                {CATEGORIA_LABELS[ng.categoria as keyof typeof CATEGORIA_LABELS]}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {ng.palavrasDialetais.map((palavra, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {palavra}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-md">
                            {ng.definicao && (
                              <span className="text-sm text-muted-foreground line-clamp-2">
                                {ng.definicao}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Info Box */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Como funciona:</strong> A ferramenta gera N-grams de 2, 3 e 4 palavras 
              a partir do corpus selecionado e identifica aqueles que contêm marcas dialetais gaúchas. 
              <strong> Expressões Fixas</strong> são fórmulas que constam no Dicionário Pampeano. 
              <strong> Colocações</strong> são combinações frequentes com palavras dialetais, 
              classificadas pela força da associação estatística.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
