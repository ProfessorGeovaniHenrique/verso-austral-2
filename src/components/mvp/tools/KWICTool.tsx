import { useState, useEffect, useMemo } from "react";
import { Search, Download, Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useFullTextCorpus } from "@/hooks/useFullTextCorpus";
import { generateKWIC, exportKWICToCSV } from "@/services/kwicService";
import { KWICContext } from "@/data/types/full-text-corpus.types";
import { useTools } from "@/contexts/ToolsContext";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export function KWICTool() {
  const [corpusType, setCorpusType] = useState<'gaucho' | 'nordestino'>('gaucho');
  const [palavra, setPalavra] = useState('');
  const [contextoSize, setContextoSize] = useState([5]);
  const [results, setResults] = useState<KWICContext[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedArtistas, setSelectedArtistas] = useState<string[]>([]);
  const [selectedAlbuns, setSelectedAlbuns] = useState<string[]>([]);
  const [anoInicio, setAnoInicio] = useState<string>('');
  const [anoFim, setAnoFim] = useState<string>('');
  
  const { selectedWord } = useTools();
  
  const filters = useMemo(() => ({
    artistas: selectedArtistas.length > 0 ? selectedArtistas : undefined,
    albuns: selectedAlbuns.length > 0 ? selectedAlbuns : undefined,
    anoInicio: anoInicio ? parseInt(anoInicio) : undefined,
    anoFim: anoFim ? parseInt(anoFim) : undefined,
  }), [selectedArtistas, selectedAlbuns, anoInicio, anoFim]);
  
  const { corpus, isLoading, error, progress } = useFullTextCorpus(corpusType, filters);
  
  // Auto-fill word from context
  useEffect(() => {
    if (selectedWord && selectedWord !== palavra) {
      setPalavra(selectedWord);
    }
  }, [selectedWord]);
  
  // Get unique artists and albums for filters
  const artistasDisponiveis = useMemo(() => {
    if (!corpus) return [];
    return Array.from(new Set(corpus.musicas.map(m => m.metadata.artista))).sort();
  }, [corpus]);
  
  const albunsDisponiveis = useMemo(() => {
    if (!corpus) return [];
    return Array.from(new Set(corpus.musicas.map(m => m.metadata.album))).sort();
  }, [corpus]);
  
  const handleSearch = () => {
    if (!palavra.trim()) {
      toast.error('Digite uma palavra para buscar');
      return;
    }
    
    if (!corpus) {
      toast.error('Corpus ainda não carregado');
      return;
    }
    
    setIsProcessing(true);
    
    setTimeout(() => {
      const kwicResults = generateKWIC(corpus, palavra, contextoSize[0]);
      setResults(kwicResults);
      setIsProcessing(false);
      
      if (kwicResults.length === 0) {
        toast.warning(`Nenhuma ocorrência de "${palavra}" encontrada`);
      } else {
        toast.success(`${kwicResults.length} ocorrências encontradas`);
      }
    }, 100);
  };
  
  const handleExport = () => {
    if (results.length === 0) {
      toast.error('Nenhum resultado para exportar');
      return;
    }
    
    const csv = exportKWICToCSV(results);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `kwic_${palavra}_${corpusType}.csv`;
    link.click();
    
    toast.success('Resultados exportados com sucesso');
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>KWIC - Keyword in Context</CardTitle>
          <CardDescription>
            Concordanciador: visualize todas as ocorrências de uma palavra no corpus com seu contexto
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
              <Label>Palavra-chave</Label>
              <Input
                placeholder="Digite uma palavra..."
                value={palavra}
                onChange={(e) => setPalavra(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Tamanho do Contexto: {contextoSize[0]} palavras</Label>
            <Slider
              value={contextoSize}
              onValueChange={setContextoSize}
              min={3}
              max={10}
              step={1}
              className="w-full"
            />
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
              onClick={handleSearch} 
              disabled={isLoading || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Buscar
                </>
              )}
            </Button>
            
            <Button 
              onClick={handleExport} 
              variant="outline"
              disabled={results.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Resultados ({results.length} ocorrências)
            </CardTitle>
            <CardDescription>
              Palavra: <span className="font-semibold text-foreground">{palavra}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[35%]">Contexto Esquerdo</TableHead>
                    <TableHead className="w-[10%] text-center font-bold">Palavra</TableHead>
                    <TableHead className="w-[35%]">Contexto Direito</TableHead>
                    <TableHead className="w-[20%]">Fonte</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.slice(0, 100).map((result, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-right text-muted-foreground">
                        {result.contextoEsquerdo}
                      </TableCell>
                      <TableCell className="text-center font-bold text-primary">
                        {result.palavra}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {result.contextoDireito}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="space-y-0.5">
                          <div className="font-medium">{result.metadata.artista}</div>
                          <div className="text-muted-foreground">{result.metadata.musica}</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {results.length > 100 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Mostrando 100 de {results.length} resultados. Exporte para ver todos.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
