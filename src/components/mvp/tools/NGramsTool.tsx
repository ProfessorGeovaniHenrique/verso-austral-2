import React, { useState, useEffect } from "react";
import { Search, Download, Loader2, Hash, Music } from "lucide-react";
import { useFeatureTour } from "@/hooks/useFeatureTour";
import { ngramsTourSteps } from "./NGramsTool.tour";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSubcorpus } from "@/contexts/SubcorpusContext";
import { useTools } from "@/contexts/ToolsContext";
import { generateNGrams, exportNGramsToCSV } from "@/services/ngramsService";
import { NGramAnalysis, CorpusCompleto } from "@/data/types/full-text-corpus.types";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const NgramsTableComponent = React.memo(({ ngrams }: { ngrams: any[] }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">Rank</TableHead>
          <TableHead>N-Gram</TableHead>
          <TableHead className="text-right">Frequência</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ngrams.map((ngram, idx) => (
          <TableRow key={idx}>
            <TableCell>{ngram.rank}</TableCell>
            <TableCell className="font-medium">{ngram.ngram}</TableCell>
            <TableCell className="text-right">{ngram.frequencia}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}, (prevProps, nextProps) => {
  return prevProps.ngrams === nextProps.ngrams;
});

export function NGramsTool() {
  useFeatureTour('ngrams', ngramsTourSteps);
  
  const { getFilteredCorpus, currentMetadata } = useSubcorpus();
  const { ngramsState, setNgramsState } = useTools();
  const [isProcessing, setIsProcessing] = useState(false);
  const [corpus, setCorpus] = useState<CorpusCompleto | null>(null);
  const [isLoadingCorpus, setIsLoadingCorpus] = useState(false);
  
  // Usar estado do context
  const ngramSize = ngramsState.ngramSize;
  const setNgramSize = (val: 2 | 3 | 4 | 5) => setNgramsState({ ngramSize: val });
  const minFrequencia = ngramsState.minFrequencia;
  const setMinFrequencia = (val: string) => setNgramsState({ minFrequencia: val });
  const maxResults = ngramsState.maxResults;
  const setMaxResults = (val: string) => setNgramsState({ maxResults: val });
  const analysis = ngramsState.analysis;
  const setAnalysis = (val: NGramAnalysis | null) => setNgramsState({ analysis: val });
  
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
    const subcorpusLabel = currentMetadata ? `_${currentMetadata.artista.replace(/\s+/g, '_')}` : '';
    link.download = `${analysis.n}-grams${subcorpusLabel}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('N-grams exportados com sucesso');
  };
  
  return (
    <div className="space-y-6">
      {currentMetadata && (
        <Alert className="border-primary/20 bg-primary/5">
          <Music className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-3">
            <span>Analisando subcorpus: <strong className="text-primary">{currentMetadata.artista}</strong></span>
            <Badge variant="outline">{currentMetadata.totalMusicas} músicas</Badge>
          </AlertDescription>
        </Alert>
      )}
      
      {isLoadingCorpus && (
        <Card><CardContent className="pt-6"><Progress value={50} /></CardContent></Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Configuração N-grams</CardTitle>
          <CardDescription>Configure a extração de sequências de palavras</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2" data-tour="ngrams-size">
              <Label>Tamanho do N-gram</Label>
              <Select value={ngramSize.toString()} onValueChange={(v) => setNgramSize(parseInt(v) as 2 | 3 | 4 | 5)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2-grams (bigramas)</SelectItem>
                  <SelectItem value="3">3-grams (trigramas)</SelectItem>
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
              <Label>Máx. Resultados</Label>
              <Input type="number" min="10" max="1000" value={maxResults} onChange={(e) => setMaxResults(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2" data-tour="ngrams-generate">
            <Button onClick={handleGenerate} disabled={isProcessing || !corpus}>
              {isProcessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando...</> : <><Hash className="h-4 w-4 mr-2" />Gerar N-grams</>}
            </Button>
            {analysis && <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-2" />Exportar</Button>}
          </div>
        </CardContent>
      </Card>
      
      {analysis && (
        <Card data-tour="ngrams-results">
          <CardHeader>
            <CardTitle>{analysis.ngrams.length} {analysis.n}-grams encontrados</CardTitle>
            <CardDescription>{analysis.ngramsUnicos} únicos no corpus</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>N-gram</TableHead>
                  <TableHead className="text-right">Frequência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.ngrams.slice(0, 100).map((ng, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-mono">{ng.ngram}</TableCell>
                    <TableCell className="text-right">{ng.frequencia}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {analysis.ngrams.length > 100 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Mostrando 100 de {analysis.ngrams.length} n-grams. Exporte o CSV para ver todos.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
