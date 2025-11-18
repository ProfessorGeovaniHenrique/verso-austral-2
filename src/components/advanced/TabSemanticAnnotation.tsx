import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, PlayCircle, CheckCircle2, AlertCircle, Filter, Info } from "lucide-react";
import { toast } from "sonner";
import { CorpusType } from "@/data/types/corpus-tools.types";
import { AnnotationProgressModal } from "./AnnotationProgressModal";
import { AnnotationResultsView } from "./AnnotationResultsView";
import { useSubcorpus } from "@/contexts/SubcorpusContext";
import { SubcorpusIndicator } from "@/components/corpus/SubcorpusIndicator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AnnotationJob {
  id: string;
  corpus_type: string;
  status: string;
  progresso: number;
  palavras_processadas: number;
  total_palavras: number;
  palavras_anotadas: number;
  tempo_inicio: string;
  tempo_fim: string | null;
  erro_mensagem: string | null;
}

export function TabSemanticAnnotation() {
  const { selection, setSelection } = useSubcorpus();
  const [selectedCorpus, setSelectedCorpus] = useState<CorpusType>('gaucho');
  const [artistFilter, setArtistFilter] = useState<string>('');
  const [startLine, setStartLine] = useState<string>('');
  const [endLine, setEndLine] = useState<string>('');
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [currentJob, setCurrentJob] = useState<AnnotationJob | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [completedJobId, setCompletedJobId] = useState<string | null>(null);

  // FASE 2: Sincronização bidirecional com SubcorpusContext
  useEffect(() => {
    // Sync FROM SubcorpusContext TO local state
    setSelectedCorpus(selection.corpusBase);
    if (selection.mode === 'single' && selection.artistaA) {
      setArtistFilter(selection.artistaA);
    }
  }, [selection.corpusBase, selection.mode, selection.artistaA]);

  // Sync FROM local state TO SubcorpusContext
  const handleCorpusChange = (value: CorpusType) => {
    setSelectedCorpus(value);
    setSelection({
      ...selection,
      corpusBase: value,
      mode: 'complete'
    });
  };

  const handleArtistFilterChange = (value: string) => {
    setArtistFilter(value);
    if (value.trim()) {
      setSelection({
        ...selection,
        mode: 'single',
        artistaA: value.trim()
      });
    } else {
      setSelection({
        ...selection,
        mode: 'complete',
        artistaA: null
      });
    }
  };

  useEffect(() => {
    if (!currentJob?.id) return;

    const channel = supabase
      .channel(`job-${currentJob.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'annotation_jobs',
          filter: `id=eq.${currentJob.id}`
        },
        (payload) => {
          const updated = payload.new as AnnotationJob;
          setCurrentJob(updated);
          
          if (updated.status === 'concluido') {
            setIsAnnotating(false);
            setCompletedJobId(updated.id);
            
            // FASE 4: Toast melhorado com ação rápida
            toast.success('Anotação concluída!', {
              description: `${updated.palavras_anotadas} palavras anotadas com sucesso.`,
              action: {
                label: 'Ver Resultados',
                onClick: () => setShowProgress(false)
              },
              duration: 6000
            });
          } else if (updated.status === 'erro') {
            setIsAnnotating(false);
            toast.error('Erro na anotação', {
              description: updated.erro_mensagem || 'Erro desconhecido'
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentJob?.id]);

  const startAnnotation = async () => {
    try {
      setIsAnnotating(true);
      setShowProgress(true);
      
      const body: any = { corpus_type: selectedCorpus };
      
      if (artistFilter.trim()) {
        body.artist_filter = artistFilter.trim();
      }
      
      if (startLine.trim()) {
        body.start_line = parseInt(startLine);
      }
      
      if (endLine.trim()) {
        body.end_line = parseInt(endLine);
      }
      
      const { data, error } = await supabase.functions.invoke('annotate-semantic', {
        body
      });

      if (error) throw error;
      
      setCurrentJob(data.job);
      
      let description = 'O processamento está em andamento...';
      if (artistFilter) description += ` (Artista: ${artistFilter})`;
      if (startLine || endLine) description += ` (Linhas: ${startLine || '1'}-${endLine || '∞'})`;
      
      toast.success('Anotação iniciada', { description });
    } catch (error: any) {
      setIsAnnotating(false);
      setShowProgress(false);
      toast.error('Erro ao iniciar anotação', {
        description: error.message
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processando':
        return <Badge variant="default" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />Processando</Badge>;
      case 'concluido':
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle2 className="w-3 h-3" />Concluído</Badge>;
      case 'erro':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Erro</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const clearFilters = () => {
    setArtistFilter('');
    setStartLine('');
    setEndLine('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Anotação Semântica Automática</CardTitle>
          <CardDescription>
            Processa o corpus selecionado e atribui automaticamente domínios semânticos e prosódia a cada palavra através de algoritmos de processamento de linguagem natural
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Seletor de Corpus */}
          <div className="space-y-2">
            <Label>Selecionar Corpus</Label>
            <Select value={selectedCorpus} onValueChange={(value) => setSelectedCorpus(value as CorpusType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gaucho">🏞️ Corpus Gaúcho Completo</SelectItem>
                <SelectItem value="nordestino">🌵 Corpus Nordestino</SelectItem>
                <SelectItem value="marenco-verso">🎵 Luiz Marenco - Verso Austral</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtros Avançados */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Filtros Avançados (Opcional)</Label>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="artist">Filtrar por Artista</Label>
                <Input
                  id="artist"
                  placeholder="Ex: Luiz Marenco"
                  value={artistFilter}
                  onChange={(e) => setArtistFilter(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Processar apenas músicas deste artista
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startLine">Linha Inicial</Label>
                <Input
                  id="startLine"
                  type="number"
                  placeholder="1"
                  min="1"
                  value={startLine}
                  onChange={(e) => setStartLine(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Começar a partir desta linha
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endLine">Linha Final</Label>
                <Input
                  id="endLine"
                  type="number"
                  placeholder="1000"
                  min="1"
                  value={endLine}
                  onChange={(e) => setEndLine(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Parar nesta linha
                </p>
              </div>
            </div>
          </div>

          {/* Botão de Início */}
          <Button 
            onClick={startAnnotation}
            disabled={isAnnotating}
            className="w-full gap-2"
            size="lg"
          >
            {isAnnotating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processamento em andamento...
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                Iniciar Anotação Semântica
              </>
            )}
          </Button>

          {/* Informações do Job Atual */}
          {currentJob && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  {getStatusBadge(currentJob.status)}
                </div>
                
                {currentJob.status === 'processando' && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progresso</span>
                        <span className="font-mono">{currentJob.progresso}%</span>
                      </div>
                      <Progress value={currentJob.progresso} />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Processadas:</span>
                        <div className="font-mono font-medium">{currentJob.palavras_processadas}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <div className="font-mono font-medium">{currentJob.total_palavras}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Anotadas:</span>
                        <div className="font-mono font-medium">{currentJob.palavras_anotadas}</div>
                      </div>
                    </div>
                  </>
                )}

                {currentJob.status === 'concluido' && (
                  <div className="text-sm text-muted-foreground">
                    Concluído em {new Date(currentJob.tempo_fim!).toLocaleString('pt-BR')}
                  </div>
                )}

                {currentJob.status === 'erro' && currentJob.erro_mensagem && (
                  <div className="text-sm text-destructive">
                    {currentJob.erro_mensagem}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Modal de Progresso */}
      {showProgress && currentJob && (
        <AnnotationProgressModal
          open={showProgress}
          onOpenChange={setShowProgress}
          job={currentJob}
        />
      )}

      {/* Resultados */}
      {completedJobId && (
        <AnnotationResultsView jobId={completedJobId} />
      )}
    </div>
  );
}
