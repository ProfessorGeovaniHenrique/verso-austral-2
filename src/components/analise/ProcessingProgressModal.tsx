import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FileText, Target, BarChart3, Layers, Download, Cog, GitCompare, CheckCircle2, Loader2 } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface PipelineStep {
  id: string;
  label: string;
  icon: LucideIcon;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
}

interface ProcessingProgressModalProps {
  open: boolean;
  ceSteps: PipelineStep[];
  crSteps: PipelineStep[];
  studySongTitle?: string;
  studyArtist?: string;
  referenceCorpusName?: string;
  estimatedTime?: string;
}

export function ProcessingProgressModal({
  open,
  ceSteps,
  crSteps,
  studySongTitle,
  studyArtist,
  referenceCorpusName,
  estimatedTime = '~15 segundos'
}: ProcessingProgressModalProps) {
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'error':
        return <CheckCircle2 className="h-4 w-4 text-destructive" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
    }
  };

  const renderPipelineStep = (step: PipelineStep) => {
    const Icon = step.icon;
    return (
      <div key={step.id} className="space-y-2">
        <div className="flex items-center gap-3">
          {getStatusIcon(step.status)}
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{step.label}</span>
          {step.status === 'processing' && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {step.progress}%
            </Badge>
          )}
        </div>
        {(step.status === 'processing' || step.status === 'completed') && (
          <Progress value={step.progress} className="h-1" />
        )}
      </div>
    );
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-2xl [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔬 Processando Análise Semântica
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Corpus de Estudo */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="default">CE</Badge>
              <h3 className="font-semibold text-sm">CORPUS DE ESTUDO</h3>
            </div>
            
            <p className="text-sm text-muted-foreground">
              "{studySongTitle}" - {studyArtist}
            </p>

            <div className="space-y-3 pl-2 border-l-2 border-primary/20">
              {ceSteps.map(renderPipelineStep)}
            </div>
          </div>

          {/* Divisor */}
          <div className="border-t" />

          {/* Corpus de Referência */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">CR</Badge>
              <h3 className="font-semibold text-sm">CORPUS DE REFERÊNCIA</h3>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {referenceCorpusName}
            </p>

            <div className="space-y-3 pl-2 border-l-2 border-muted">
              {crSteps.map(renderPipelineStep)}
            </div>
          </div>

          {/* Tempo estimado */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Tempo estimado: {estimatedTime}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}