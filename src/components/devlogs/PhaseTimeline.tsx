import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Clock, Calendar, Target, AlertCircle } from "lucide-react";
import { ConstructionPhase } from "@/data/developer-logs/construction-log";
import { highlightText } from "@/utils/highlightText";

interface PhaseTimelineProps {
  phases: ConstructionPhase[];
  searchTerm?: string;
}

export function PhaseTimeline({ phases, searchTerm = '' }: PhaseTimelineProps) {
  const getStatusIcon = (status: ConstructionPhase['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'planned':
        return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: ConstructionPhase['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600">Concluída</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-600">Em Progresso</Badge>;
      case 'planned':
        return <Badge variant="outline">Planejada</Badge>;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        {/* Timeline vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

        {phases.map((phase, index) => (
          <div key={index} className="relative pl-16 pb-8">
            {/* Timeline dot */}
            <div className="absolute left-4 top-2 z-10 bg-background p-1 rounded-full border-2 border-border">
              {getStatusIcon(phase.status)}
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{highlightText(phase.phase, searchTerm)}</CardTitle>
                    <CardDescription className="mt-2 flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(phase.dateStart)}
                        {phase.dateEnd && ` - ${formatDate(phase.dateEnd)}`}
                      </span>
                      {getStatusBadge(phase.status)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Objetivo */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-muted-foreground">Objetivo</span>
                  </div>
                  <p className="text-sm">{highlightText(phase.objective, searchTerm)}</p>
                </div>

                {/* Decisões técnicas */}
                {phase.decisions.length > 0 && (
                  <div>
                    <span className="text-sm font-semibold text-muted-foreground">
                      {phase.decisions.length} Decisões Técnicas
                    </span>
                  </div>
                )}

                {/* Artefatos */}
                {phase.artifacts.length > 0 && (
                  <div>
                    <span className="text-sm font-semibold text-muted-foreground">
                      {phase.artifacts.length} Artefatos | {phase.artifacts.reduce((sum, a) => sum + a.linesOfCode, 0)} linhas de código
                    </span>
                  </div>
                )}

                {/* Métricas */}
                {Object.keys(phase.metrics).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(phase.metrics).map(([key, value]) => {
                      if (!value) return null;
                      const improvement = ((value.after - value.before) / value.before * 100).toFixed(0);
                      return (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {key}: {(value.before * 100).toFixed(0)}% → {(value.after * 100).toFixed(0)}%
                          <span className="ml-1 text-green-600">+{improvement}%</span>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {/* Base científica */}
                {phase.scientificBasis.length > 0 && (
                  <div>
                    <span className="text-sm font-semibold text-muted-foreground">
                      {phase.scientificBasis.length} Referências Científicas
                    </span>
                  </div>
                )}

                {/* Próximos passos (se fase in-progress) */}
                {phase.nextSteps && phase.nextSteps.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                    <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                      Próximos Passos:
                    </span>
                    <ul className="mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-400">
                      {phase.nextSteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-500">→</span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Desafios (se existirem) */}
                {phase.challenges && phase.challenges.length > 0 && (
                  <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                    <span className="text-sm font-semibold text-orange-900 dark:text-orange-300">
                      Desafios Encontrados:
                    </span>
                    <ul className="mt-2 space-y-1 text-sm text-orange-800 dark:text-orange-400">
                      {phase.challenges.map((challenge, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-orange-600 dark:text-orange-500">⚠</span>
                          {challenge}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
