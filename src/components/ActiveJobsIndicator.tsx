import { useActiveJobs } from '@/hooks/useActiveJobs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export function ActiveJobsIndicator() {
  const { activeJobs } = useActiveJobs();

  if (activeJobs.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-2">
      <Card className="w-80 shadow-lg border-primary/20 bg-card/95 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <CardTitle className="text-sm">
              {activeJobs.length} anotação(ões) em execução
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeJobs.map(job => (
            <div key={job.id} className="flex items-center justify-between text-sm">
              <span className="truncate flex-1 text-muted-foreground">
                {job.corpus_type === 'marenco-verso' ? 'Teste Personalizado' : job.corpus_type}
              </span>
              <Badge variant="secondary" className="ml-2">
                {Math.round((job.progresso || 0) * 100)}%
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
