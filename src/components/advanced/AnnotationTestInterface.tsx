import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Sparkles, BookOpen, FileText } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAnnotationJobMonitor } from '@/hooks/useAnnotationJobMonitor';

const LETRA_TESTE = `A calma do tarumã, ganhou sombra mais copada
Pela várzea espichada com o sol da tarde caindo
Um pañuelo maragato se abriu no horizonte
Trazendo um novo reponte, prá um fim de tarde bem lindo`;

interface AnnotationResult {
  palavra: string;
  tagset_codigo: string;
  prosody: number;
  confianca: number;
}

export function AnnotationTestInterface() {
  const [texto, setTexto] = useState(LETRA_TESTE);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [results, setResults] = useState<AnnotationResult[]>([]);
  
  const { job } = useAnnotationJobMonitor(jobId);

  useEffect(() => {
    if (!job) return;
    if (job.status === 'completed') {
      loadResults(job.id);
      setIsAnnotating(false);
    } else if (job.status === 'failed') {
      setIsAnnotating(false);
    }
  }, [job]);

  const startAnnotation = async () => {
    setIsAnnotating(true);
    setResults([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('annotate-semantic', {
        body: { corpus_type: 'marenco-verso', custom_text: texto }
      });

      if (error) throw error;
      setJobId(data.job.id);
      toast.success('Anotação iniciada! O progresso será monitorado em tempo real.');
    } catch (error) {
      console.error('Erro:', error);
      setIsAnnotating(false);
      toast.error('Erro ao iniciar anotação');
    }
  };

  const loadResults = async (jobId: string) => {
    const { data } = await supabase
      .from('annotated_corpus')
      .select('*')
      .eq('job_id', jobId);
    if (data) setResults(data as any);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Teste de Anotação Semântica
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} className="min-h-[200px]" />
        <Button onClick={startAnnotation} disabled={isAnnotating}>
          {isAnnotating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Anotando...</> : 'Iniciar'}
        </Button>
        {job && job.status === 'processing' && (
          <div className="text-sm">Progresso: {Math.round((job.progresso || 0) * 100)}%</div>
        )}
        {results.length > 0 && <div className="text-sm">{results.length} palavras anotadas</div>}
      </CardContent>
    </Card>
  );
}
