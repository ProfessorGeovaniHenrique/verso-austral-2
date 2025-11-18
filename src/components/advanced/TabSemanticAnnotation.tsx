import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlayCircle, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { CorpusType } from "@/data/types/corpus-tools.types";
import { AnnotationProgressModal } from "./AnnotationProgressModal";
import { AnnotationResultsView } from "./AnnotationResultsView";
import { useSubcorpus } from "@/contexts/SubcorpusContext";
import { DualCorpusSelector } from "./DualCorpusSelector";
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
  cultural_markers_found?: number;
}

export function TabSemanticAnnotation() {
  const { selection, setSelection } = useSubcorpus();
  
  const [estudoCorpus, setEstudoCorpus] = useState<CorpusType>('gaucho');
  const [estudoMode, setEstudoMode] = useState<'complete' | 'artist'>('complete');
  const [estudoArtist, setEstudoArtist] = useState<string>('');
  
  const [refCorpus, setRefCorpus] = useState<CorpusType>('nordestino');
  const [refMode, setRefMode] = useState<'complete' | 'artist'>('complete');
  const [refArtist, setRefArtist] = useState<string>('');
  
  const [balanceRatio, setBalanceRatio] = useState<number>(1.0);
  
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [currentJob, setCurrentJob] = useState<AnnotationJob | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [completedJobId, setCompletedJobId] = useState<string | null>(null);

  useEffect(() => {
    setEstudoCorpus(selection.corpusBase);
    setEstudoMode(selection.mode === 'single' ? 'artist' : 'complete');
    if (selection.mode === 'single' && selection.artistaA) {
      setEstudoArtist(selection.artistaA);
    }
  }, [selection]);

  const handleInvertCorpora = () => {
    const tempCorpus = estudoCorpus;
    const tempMode = estudoMode;
    const tempArtist = estudoArtist;
    
    setEstudoCorpus(refCorpus);
    setEstudoMode(refMode);
    setEstudoArtist(refArtist);
    
    setRefCorpus(tempCorpus);
    setRefMode(tempMode);
    setRefArtist(tempArtist);
    
    setSelection({
      ...selection,
      corpusBase: refCorpus,
      mode: refMode === 'artist' ? 'single' : 'complete',
      artistaA: refMode === 'artist' ? refArtist : null
    });
  };

  useEffect(() => {
    if (!currentJob?.id) return;

    const channel = supabase
      .channel(`job-${currentJob.id}`)
      .on('postgres_changes', {
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
            
            const markersInfo = updated.cultural_markers_found 
              ? ` | 🏆 ${updated.cultural_markers_found} marcadores culturais`
              : '';
            
            toast.success('Anotação concluída!', {
              description: `${updated.palavras_anotadas} palavras${markersInfo}`,
              action: { label: 'Ver Resultados', onClick: () => setShowProgress(false) },
              duration: 8000
            });
          } else if (updated.status === 'erro') {
            setIsAnnotating(false);
            toast.error('Erro', { description: updated.erro_mensagem || 'Erro desconhecido' });
          }
        }
      ).subscribe();

    return () => { channel.unsubscribe(); };
  }, [currentJob?.id]);

  const startAnnotation = async () => {
    try {
      setIsAnnotating(true);
      setShowProgress(true);
      
      const body: any = { 
        corpus_type: estudoCorpus,
        reference_corpus: {
          corpus_type: refCorpus,
          size_ratio: balanceRatio
        }
      };
      
      if (estudoMode === 'artist' && estudoArtist.trim()) {
        body.artist_filter = estudoArtist.trim();
      }
      
      if (refMode === 'artist' && refArtist.trim()) {
        body.reference_corpus.artist_filter = refArtist.trim();
      }
      
      const { data, error } = await supabase.functions.invoke('annotate-semantic', { body });
      if (error) throw error;
      
      setCurrentJob(data.job);
      toast.success('Anotação iniciada');
    } catch (error: any) {
      setIsAnnotating(false);
      setShowProgress(false);
      toast.error('Erro', { description: error.message });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processando': return <Badge className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />Processando</Badge>;
      case 'concluido': return <Badge className="gap-1 bg-green-600"><CheckCircle2 className="w-3 h-3" />Concluído</Badge>;
      case 'erro': return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Erro</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Anotação Semântica Comparativa</CardTitle>
          <CardDescription>
            Identifica marcadores culturais através de análise estatística (Log-Likelihood e Mutual Information)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <DualCorpusSelector
            estudoCorpus={estudoCorpus} onEstudoCorpusChange={setEstudoCorpus}
            estudoMode={estudoMode} onEstudoModeChange={setEstudoMode}
            estudoArtist={estudoArtist} onEstudoArtistChange={setEstudoArtist}
            refCorpus={refCorpus} onRefCorpusChange={setRefCorpus}
            refMode={refMode} onRefModeChange={setRefMode}
            refArtist={refArtist} onRefArtistChange={setRefArtist}
            balanceRatio={balanceRatio} onBalanceRatioChange={setBalanceRatio}
            onInvert={handleInvertCorpora} disabled={isAnnotating}
          />
          
          <Card className="border-dashed border-2 bg-muted/20">
            <CardContent className="pt-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm text-muted-foreground">Upload de Corpus Personalizado</p>
                  <p className="text-xs text-muted-foreground">Funcionalidade em desenvolvimento</p>
                </div>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" disabled><Upload className="h-4 w-4 mr-2" />Upload</Button>
                  </TooltipTrigger>
                  <TooltipContent>Formato .txt estruturado | Max 50MB | UTF-8</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardContent>
          </Card>
          
          <div className="flex justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {isAnnotating ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Processando...</span> : 'Pronto'}
            </div>
            <Button onClick={startAnnotation} disabled={isAnnotating} size="lg" className="gap-2">
              <PlayCircle className="w-5 h-5" />{isAnnotating ? 'Processando...' : 'Iniciar Anotação'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {currentJob && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Status</CardTitle>
              {getStatusBadge(currentJob.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: `${currentJob.progresso}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div><p className="text-muted-foreground">Processadas</p><p className="font-bold text-lg">{currentJob.palavras_processadas || 0}</p></div>
              <div><p className="text-muted-foreground">Anotadas</p><p className="font-bold text-lg text-primary">{currentJob.palavras_anotadas || 0}</p></div>
              <div><p className="text-muted-foreground">Marcadores 🏆</p><p className="font-bold text-lg text-green-600">{currentJob.cultural_markers_found || 0}</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      {showProgress && currentJob && <AnnotationProgressModal job={currentJob} open={showProgress} onOpenChange={setShowProgress} />}
      {completedJobId && <AnnotationResultsView jobId={completedJobId} />}
    </div>
  );
}