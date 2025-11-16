import { useState, useMemo } from "react";
import { Search, Download, Loader2, Hash, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useFullTextCorpus } from "@/hooks/useFullTextCorpus";
import { generateNGrams, exportNGramsToCSV } from "@/services/ngramsService";
import { NGramAnalysis } from "@/data/types/full-text-corpus.types";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export function NGramsTool() {
  const [corpusType, setCorpusType] = useState<'gaucho' | 'nordestino'>('gaucho');
  const [ngramSize, setNgramSize] = useState<2 | 3 | 4 | 5>(2);
  const [minFrequencia, setMinFrequencia] = useState<string>('2');
  const [maxResults, setMaxResults] = useState<string>('100');
  const [analysis, setAnalysis] = useState<NGramAnalysis | null>(null);
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
  
  const handleGenerate = () => {
    if (!corpus) {
      toast.error('Corpus ainda não carregado');
      return;
    }
    
    setIsProcessing(true);
    
    setTimeout(() => {
      try {
        const result = generateNGrams(corpus, ngramSize, parseInt(minFrequencia), parseInt(maxResults));
        setAnalysis(result);
        setIsProcessing(false);
        
        if (result.ngrams.length === 0) {
          toast.warning(`Nenhum ${ngramSize}-gram encontrado`);
        } else {
          toast.success(`${result.ngrams.length} ${ngramSize}-grams gerados`);
        }
      } catch (err) {
        console.error(err);
        toast.error('Erro ao gerar N-grams');
        setIsProcessing(false);
      }
    }, 100);
  };
  
  const handleExport = () => {
    if (!analysis) {
      toast.error('Nenhuma análise para exportar');
      return;
    }
    
    const csv = exportNGramsToCSV(analysis);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${ngramSize}grams_${corpusType}.csv`;
    link.click();
    
    toast.success('N-grams exportados');
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Análise de N-grams</CardTitle>
          <CardDescription>Identifique sequências frequentes no corpus</CardDescription>
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
          
          {error && <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Corpus</Label>
              <Select value={corpusType} onValueChange={(v) => setCorpusType(v as 'gaucho' | 'nordestino')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gaucho">🎸 Corpus Gaúcho</SelectItem>
                  <SelectItem value="nordestino">🪘 Corpus Nordestino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Tamanho do N-gram</Label>
              <Select value={String(ngramSize)} onValueChange={(v) => setNgramSize(parseInt(v) as 2 | 3 | 4 | 5)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2-grams</SelectItem>
                  <SelectItem value="3">3-grams</SelectItem>
                  <SelectItem value="4">4-grams</SelectItem>
                  <SelectItem value="5">5-grams</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Frequência Mínima</Label>
              <Input type="number" min="1" value={minFrequencia} onChange={(e) => setMinFrequencia(e.target.value)} />
            </div>
            
            <div className="space-y-2">
              <Label>Máximo de Resultados</Label>
              <Input type="number" min="10" max="1000" step="10" value={maxResults} onChange={(e) => setMaxResults(e.target.value)} />
            </div>
          </div>
          
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full">
                <Filter className="mr-2 h-4 w-4" />Filtros Avançados
                {(selectedArtistas.length > 0 || selectedAlbuns.length > 0 || anoInicio || anoFim) && (
                  <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">Ativos</span>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Artista</Label>
                  <Select value={selectedArtistas[0] || ''} onValueChange={(v) => setSelectedArtistas(v ? [v] : [])}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {artistasDisponiveis.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Álbum</Label>
                  <Select value={selectedAlbuns[0] || ''} onValueChange={(v) => setSelectedAlbuns(v ? [v] : [])}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {albunsDisponiveis.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ano Início</Label>
                  <Input type="number" placeholder="Ex: 1990" value={anoInicio} onChange={(e) => setAnoInicio(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Ano Fim</Label>
                  <Input type="number" placeholder="Ex: 2020" value={anoFim} onChange={(e) => setAnoFim(e.target.value)} />
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedArtistas([]); setSelectedAlbuns([]); setAnoInicio(''); setAnoFim(''); }} className="w-full">Limpar Filtros</Button>
            </CollapsibleContent>
          </Collapsible>
          
          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={isLoading || isProcessing} className="flex-1">
              {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando...</> : <><Hash className="mr-2 h-4 w-4" />Gerar</>}
            </Button>
            <Button onClick={handleExport} variant="outline" disabled={!analysis}><Download className="mr-2 h-4 w-4" />CSV</Button>
          </div>
        </CardContent>
      </Card>
      
      {analysis && (
        <Card>
          <CardHeader><CardTitle>{analysis.ngrams.length} resultados</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Rank</TableHead>
                  <TableHead>N-gram</TableHead>
                  <TableHead className="w-[120px] text-right">Freq</TableHead>
                  <TableHead>Exemplo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.ngrams.map((ng, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-mono font-semibold">{ng.ngram}</TableCell>
                    <TableCell className="text-right"><Badge variant="secondary">{ng.frequencia}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ng.ocorrencias && ng.ocorrencias[0] ? ng.ocorrencias[0].contexto.substring(0, 60) + '...' : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
