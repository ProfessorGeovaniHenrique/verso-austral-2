/**
 * 🚀 WORKFLOW DE ANÁLISE AVANÇADA
 * 
 * Fluxo sequencial guiado:
 * 1. Etiquetagem Semântica
 * 2. Domínios Semânticos
 * 3. Análise Temporal
 * 4. Análise Cultural
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Sparkles, Cloud, TrendingUp, MapPin } from 'lucide-react';
import { SemanticDomainsCloud } from './SemanticDomainsCloud';
import { TemporalAnalysisTool } from './TemporalAnalysisTool';
import { DialectalAnalysisTool } from './DialectalAnalysisTool';
import { useAnnotationGate } from '@/hooks/useAnnotationGate';

type WorkflowStep = 'annotation' | 'domains' | 'temporal' | 'cultural';

interface StepConfig {
  id: WorkflowStep;
  label: string;
  icon: any;
  description: string;
  requiresPrevious: boolean;
}

const WORKFLOW_STEPS: StepConfig[] = [
  {
    id: 'annotation',
    label: 'Etiquetagem Semântica',
    icon: Sparkles,
    description: 'Processe o corpus automaticamente para identificar domínios',
    requiresPrevious: false
  },
  {
    id: 'domains',
    label: 'Domínios Semânticos',
    icon: Cloud,
    description: 'Visualize a distribuição dos domínios identificados',
    requiresPrevious: true
  },
  {
    id: 'temporal',
    label: 'Análise Temporal',
    icon: TrendingUp,
    description: 'Analise a evolução temporal das palavras',
    requiresPrevious: true
  },
  {
    id: 'cultural',
    label: 'Análise Cultural',
    icon: MapPin,
    description: 'Detecte marcas dialetais e insígnias culturais',
    requiresPrevious: true
  }
];

export function AdvancedAnalysisWorkflow() {
  const [activeStep, setActiveStep] = useState<WorkflowStep>('annotation');
  const { hasProcessedCorpus } = useAnnotationGate();

  const getStepStatus = (step: StepConfig) => {
    if (step.id === 'annotation') {
      return hasProcessedCorpus ? 'completed' : 'current';
    }
    return hasProcessedCorpus ? 'available' : 'locked';
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            {WORKFLOW_STEPS.map((step, index) => {
              const status = getStepStatus(step);
              const Icon = step.icon;
              const isActive = activeStep === step.id;
              const isCompleted = status === 'completed';
              const isLocked = status === 'locked';

              return (
                <div key={step.id} className="flex-1">
                  <button
                    onClick={() => !isLocked && setActiveStep(step.id)}
                    disabled={isLocked}
                    className={`
                      w-full text-left p-4 rounded-lg transition-all
                      ${isActive ? 'bg-primary/10 border-2 border-primary' : 'border-2 border-transparent'}
                      ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50 cursor-pointer'}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        p-2 rounded-full
                        ${isCompleted ? 'bg-green-500/20 text-green-600' : ''}
                        ${isActive && !isCompleted ? 'bg-primary/20 text-primary' : ''}
                        ${isLocked ? 'bg-muted text-muted-foreground' : ''}
                      `}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            Passo {index + 1}
                          </span>
                          {isCompleted && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Concluído
                            </Badge>
                          )}
                          {isLocked && (
                            <Badge variant="outline" className="text-muted-foreground">
                              Bloqueado
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium mt-1">{step.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </button>

                  {index < WORKFLOW_STEPS.length - 1 && (
                    <div className="flex items-center justify-center my-2">
                      <div className={`h-1 w-full ${hasProcessedCorpus ? 'bg-green-500/30' : 'bg-border'}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Tabs value={activeStep} onValueChange={(v) => setActiveStep(v as WorkflowStep)}>
        <TabsContent value="annotation" className="mt-0">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Etiquetagem Semântica - Em desenvolvimento</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domains" className="mt-0">
          <SemanticDomainsCloud />
        </TabsContent>

        <TabsContent value="temporal" className="mt-0">
          <TemporalAnalysisTool />
        </TabsContent>

        <TabsContent value="cultural" className="mt-0">
          <DialectalAnalysisTool />
        </TabsContent>
      </Tabs>
    </div>
  );
}
