import { Upload, MapPin, FileText, Settings, Sparkles, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WorkflowStep = 'upload' | 'mapping' | 'extraction' | 'processing' | 'enrichment' | 'results';

interface Step {
  id: WorkflowStep;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const steps: Step[] = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'mapping', label: 'Mapeamento', icon: MapPin },
  { id: 'extraction', label: 'Extração', icon: FileText },
  { id: 'processing', label: 'Processamento', icon: Settings },
  { id: 'enrichment', label: 'Enriquecimento', icon: Sparkles },
  { id: 'results', label: 'Resultados', icon: CheckCircle },
];

interface ProcessingPipelineProps {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  onStepClick?: (step: WorkflowStep) => void;
}

export function ProcessingPipeline({ currentStep, completedSteps, onStepClick }: ProcessingPipelineProps) {
  const getStepStatus = (stepId: WorkflowStep) => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'pending';
  };

  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="w-full py-8">
      <div className="flex items-center justify-between relative">
        {/* Linha de progresso */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-10">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {/* Steps */}
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;
          const isClickable = completedSteps.includes(step.id) && onStepClick;

          return (
            <div
              key={step.id}
              className="flex flex-col items-center gap-2 relative"
              style={{ width: `${100 / steps.length}%` }}
            >
              <button
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                  status === 'completed' && "bg-primary border-primary text-primary-foreground",
                  status === 'current' && "bg-background border-primary text-primary scale-110",
                  status === 'pending' && "bg-background border-muted text-muted-foreground",
                  isClickable && "cursor-pointer hover:scale-105"
                )}
              >
                <Icon className="h-5 w-5" />
              </button>

              <span
                className={cn(
                  "text-xs font-medium text-center transition-colors",
                  status === 'completed' && "text-primary",
                  status === 'current' && "text-foreground font-semibold",
                  status === 'pending' && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
