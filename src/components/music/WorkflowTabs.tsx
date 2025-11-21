import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, MapPin, FileText, Settings, Sparkles, CheckCircle } from 'lucide-react';
import { WorkflowStep } from './ProcessingPipeline';

interface WorkflowTabsProps {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  onStepChange: (step: WorkflowStep) => void;
}

const tabs = [
  { value: 'upload' as WorkflowStep, label: 'Upload', icon: Upload },
  { value: 'mapping' as WorkflowStep, label: 'Mapeamento', icon: MapPin },
  { value: 'extraction' as WorkflowStep, label: 'Extração', icon: FileText },
  { value: 'processing' as WorkflowStep, label: 'Processamento', icon: Settings },
  { value: 'enrichment' as WorkflowStep, label: 'Enriquecimento', icon: Sparkles },
  { value: 'results' as WorkflowStep, label: 'Resultados', icon: CheckCircle },
];

export function WorkflowTabs({ currentStep, completedSteps, onStepChange }: WorkflowTabsProps) {
  return (
    <Tabs value={currentStep} onValueChange={(value) => onStepChange(value as WorkflowStep)}>
      <TabsList className="w-full h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isCompleted = completedSteps.includes(tab.value);
          const isDisabled = !isCompleted && tab.value !== currentStep;
          
          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              disabled={isDisabled}
              className="flex-1 min-w-[140px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Icon className="h-4 w-4 mr-2" />
              {tab.label}
              {isCompleted && tab.value !== currentStep && (
                <CheckCircle className="h-3 w-3 ml-2 text-green-500" />
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
