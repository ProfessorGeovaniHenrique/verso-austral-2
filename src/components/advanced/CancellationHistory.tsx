import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { XCircle } from 'lucide-react';

export function CancellationHistory() {
  const { data: cancelledJobs, isLoading } = useQuery({
    queryKey: ['cancelled-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dictionary_import_jobs')
        .select('*')
        .eq('status', 'cancelado')
        .order('cancelled_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000 // Atualizar a cada 30s
  });

  if (isLoading) {
    return null;
  }

  if (!cancelledJobs || cancelledJobs.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <XCircle className="h-5 w-5 text-destructive" />
          Histórico de Cancelamentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {cancelledJobs.map(job => (
              <div 
                key={job.id} 
                className="border-l-2 border-destructive pl-3 py-2 space-y-1"
              >
                <p className="text-sm font-medium">{job.tipo_dicionario}</p>
                <p className="text-xs text-muted-foreground">
                  Cancelado {formatDistanceToNow(new Date(job.cancelled_at), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  Progresso ao cancelar: {job.progresso}% ({job.verbetes_inseridos}/{job.total_verbetes} verbetes)
                </p>
                {job.cancellation_reason && (
                  <p className="text-xs italic text-muted-foreground mt-1">
                    "{job.cancellation_reason}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
