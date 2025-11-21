import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { constructionLog } from "@/data/developer-logs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EditableSection } from "./EditableSection";
import { useDevHistoryPersistence } from "@/hooks/useDevHistoryPersistence";

interface PhaseTimelineProps {
  editMode?: boolean;
}

export function PhaseTimeline({ editMode = false }: PhaseTimelineProps) {
  const { saveOverride, restoreOriginal, mergePhaseWithOverrides, hasOverride } = useDevHistoryPersistence();

  const generatePhaseId = (phaseName: string) => {
    return phaseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const handleSaveField = async (phaseId: string, fieldPath: string, originalValue: string, newValue: string) => {
    await saveOverride(phaseId, fieldPath, originalValue, newValue);
  };

  const handleRestoreField = async (phaseId: string, fieldPath: string) => {
    await restoreOriginal(phaseId, fieldPath);
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "in-progress":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500">Concluída</Badge>;
      case "in-progress":
        return <Badge variant="default" className="bg-yellow-500">Em Progresso</Badge>;
      default:
        return <Badge variant="outline">Planejada</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {constructionLog.map((phase, index) => {
        const mergedPhase = mergePhaseWithOverrides(phase);
        const phaseId = generatePhaseId(phase.phase);
        
        return (
        <Card key={phase.phase} className="relative">
          {/* Timeline connector */}
          {index < constructionLog.length - 1 && (
            <div className="absolute left-[2.25rem] top-[4rem] h-[calc(100%+1.5rem)] w-0.5 bg-border" />
          )}
          
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="relative z-10 bg-background p-1">
                {getStatusIcon(phase.status)}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">
                    {phase.phase}
                  </CardTitle>
                  {getStatusLabel(phase.status)}
                </div>
                <CardDescription className="text-sm">
                  {format(new Date(phase.dateStart), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  {phase.dateEnd && ` - ${format(new Date(phase.dateEnd), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 ml-9">
            <div>
              <h4 className="font-semibold mb-2">Objetivo</h4>
              <EditableSection
                value={mergedPhase.objective}
                onSave={(newValue) => handleSaveField(phaseId, 'objective', phase.objective, newValue)}
                onRestore={() => handleRestoreField(phaseId, 'objective')}
                editable={editMode}
                hasOverride={hasOverride(phaseId, 'objective')}
                className="text-muted-foreground"
              />
            </div>

            {phase.decisions.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Decisões Técnicas Principais</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {phase.decisions.slice(0, 3).map((decision, idx) => (
                    <li key={idx}>{decision.decision}</li>
                  ))}
                </ul>
              </div>
            )}

            {phase.artifacts.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Artefatos Criados</h4>
                <div className="flex flex-wrap gap-2">
                  {phase.artifacts.slice(0, 5).map((artifact, idx) => (
                    <Badge key={idx} variant="outline">{artifact.file}</Badge>
                  ))}
                  {phase.artifacts.length > 5 && (
                    <Badge variant="secondary">+{phase.artifacts.length - 5} mais</Badge>
                  )}
                </div>
              </div>
            )}

            {phase.metrics && Object.keys(phase.metrics).length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Métricas</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {Object.entries(phase.metrics)
                    .filter(([_, value]) => value !== undefined)
                    .slice(0, 4)
                    .map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <p className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                        <p className="font-mono">
                          {value!.before} → {value!.after}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {phase.scientificBasis.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Base Científica</h4>
                <div className="flex flex-wrap gap-2">
                  {phase.scientificBasis.slice(0, 3).map((ref, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {ref.source}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
}
