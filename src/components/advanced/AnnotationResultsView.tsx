import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTools } from "@/contexts/ToolsContext";
import { useSubcorpus } from "@/contexts/SubcorpusContext";
import { toast } from "sonner";

interface AnnotatedWord {
  id: string;
  palavra: string;
  tagset_codigo: string | null;
  prosody: number | null;
  confianca: number | null;
  contexto_esquerdo: string | null;
  contexto_direito: string | null;
  lema: string | null;
}

interface SemanticTag {
  codigo: string;
  nome: string;
}

interface AnnotationResultsViewProps {
  jobId: string;
}

export function AnnotationResultsView({ jobId }: AnnotationResultsViewProps) {
  const [results, setResults] = useState<AnnotatedWord[]>([]);
  const [tagsets, setTagsets] = useState<SemanticTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [filterProsody, setFilterProsody] = useState<string>('all');
  const [filterMarkers, setFilterMarkers] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { navigateToKWIC } = useTools();
  const { selection } = useSubcorpus();

  useEffect(() => {
    loadResults();
    loadTagsets();
  }, [jobId]);

  const loadTagsets = async () => {
    const { data } = await supabase
      .from('semantic_tagset')
      .select('codigo, nome')
      .eq('status', 'aprovado')
      .order('nome');
    
    if (data) setTagsets(data);
  };

  const loadResults = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('annotated_corpus')
      .select('*')
      .eq('job_id', jobId)
      .order('posicao_no_corpus');

    if (error) {
      console.error('Error loading results:', error);
    } else {
      setResults(data || []);
    }
    setLoading(false);
  };

  const filteredResults = results.filter(word => {
    const matchesDomain = filterDomain === 'all' || word.tagset_codigo === filterDomain;
    const matchesProsody = filterProsody === 'all' || 
      (filterProsody === 'positive' && (word.prosody ?? 0) > 0) ||
      (filterProsody === 'negative' && (word.prosody ?? 0) < 0) ||
      (filterProsody === 'neutral' && word.prosody === 0);
    const matchesSearch = searchTerm === '' || 
      word.palavra.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesDomain && matchesProsody && matchesSearch;
  });

  const getProsodyIcon = (prosody: number | null) => {
    if (prosody === null) return null;
    if (prosody > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (prosody < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getProsodyLabel = (prosody: number | null) => {
    if (prosody === null) return 'N/A';
    if (prosody > 0) return `+${prosody}`;
    return `${prosody}`;
  };

  // FASE 3: Handler para navegação KWIC
  const handleWordClick = (palavra: string) => {
    navigateToKWIC(palavra, 'semantic-annotation', {
      corpusBase: selection.corpusBase,
      mode: selection.mode === 'single' ? 'artist' : 'complete',
      artist: selection.artistaA || undefined
    });
    
    toast.info(`Navegando para KWIC: "${palavra}"`, {
      description: 'Busca contextual nos resultados da anotação'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultados da Anotação</CardTitle>
        <CardDescription>
          {results.length} palavras anotadas • {filteredResults.length} exibidas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar palavra..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterDomain} onValueChange={setFilterDomain}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Domínio Semântico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os domínios</SelectItem>
              {tagsets.map(tag => (
                <SelectItem key={tag.codigo} value={tag.codigo}>
                  {tag.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterProsody} onValueChange={setFilterProsody}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Prosódia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prosódias</SelectItem>
              <SelectItem value="positive">Positiva (+1 a +3)</SelectItem>
              <SelectItem value="neutral">Neutra (0)</SelectItem>
              <SelectItem value="negative">Negativa (-1 a -3)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[500px] rounded-md border">
          <div className="p-4 space-y-2">
            {filteredResults.map((word) => (
              <Card key={word.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{word.palavra}</span>
                      {word.lema && word.lema !== word.palavra && (
                        <span className="text-sm text-muted-foreground">({word.lema})</span>
                      )}
                    </div>
                    
                    {(word.contexto_esquerdo || word.contexto_direito) && (
                      <div className="text-sm text-muted-foreground">
                        <span className="opacity-60">{word.contexto_esquerdo}</span>
                        <span className="font-medium text-foreground mx-1">{word.palavra}</span>
                        <span className="opacity-60">{word.contexto_direito}</span>
                      </div>
                    )}

                    {word.tagset_codigo && (
                      <Badge variant="secondary" className="text-xs">
                        {tagsets.find(t => t.codigo === word.tagset_codigo)?.nome || word.tagset_codigo}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1">
                      {getProsodyIcon(word.prosody)}
                      <span className="font-mono text-sm font-medium">
                        {getProsodyLabel(word.prosody)}
                      </span>
                    </div>
                    {word.confianca !== null && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(word.confianca * 100)}% confiança
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
