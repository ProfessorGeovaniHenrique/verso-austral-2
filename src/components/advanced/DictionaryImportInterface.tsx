import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BookOpen, FileText, Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useDictionaryImportJobs } from '@/hooks/useDictionaryImportJobs';

export function DictionaryImportInterface() {
  const [isImporting, setIsImporting] = useState(false);
  const { data: jobs } = useDictionaryImportJobs();
  const resultsRef = useRef<HTMLDivElement>(null);

  const importDialectalVolume = async (volumeNum: 'I' | 'II') => {
    setIsImporting(true);
    try {
      const fileName = volumeNum === 'I' 
        ? '/src/data/dictionaries/dialectal-volume-I-raw.txt' 
        : '/src/data/dictionaries/dialectal-volume-II-raw.txt';
      
      const response = await fetch(fileName);
      if (!response.ok) throw new Error('Falha ao carregar arquivo');
      
      const rawContent = await response.text();
      const { preprocessDialectalText, getPreprocessingStats } = await import('@/lib/preprocessDialectalText');
      const processedContent = preprocessDialectalText(rawContent, volumeNum);
      const stats = getPreprocessingStats(processedContent);
      
      toast.info(`Volume ${volumeNum}: ${stats.estimatedVerbetes} verbetes. Processando em background...`);

      const { data, error } = await supabase.functions.invoke('process-dialectal-dictionary', {
        body: { fileContent: processedContent, volumeNum }
      });

      if (error) throw error;
      toast.success(`Importação iniciada! Job ID: ${data.jobId}`);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 500);
    } catch (error: any) {
      toast.error(`Erro ao iniciar importação do Volume ${volumeNum}`);
    } finally {
      setIsImporting(false);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'iniciado': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processando': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'concluido': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'erro': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Importação de Dicionários</h2>
          <p className="text-muted-foreground">Importe dicionários para a base de conhecimento</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Dialetal Vol. I
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => importDialectalVolume('I')} disabled={isImporting} className="w-full">
                {isImporting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando...</> : 'Importar'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Dialetal Vol. II
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => importDialectalVolume('II')} disabled={isImporting} className="w-full">
                {isImporting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando...</> : 'Importar'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {jobs && jobs.length > 0 && (
        <div ref={resultsRef} className="space-y-4">
          {jobs.map(job => (
            <Card key={job.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(job.status)}
                    {job.tipo_dicionario}
                  </CardTitle>
                  <Badge>{job.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={job.progresso} />
                <p className="text-sm mt-2">Progresso: {job.progresso}%</p>
                {job.erro_mensagem && (
                  <p className="text-sm text-destructive mt-2">{job.erro_mensagem}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
