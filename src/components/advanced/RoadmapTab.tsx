import { futureFeatures, roadmapStats, type FutureFeature } from '@/data/metadata-enrichment-roadmap';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { ExternalLink } from 'lucide-react';

export function RoadmapTab() {
  const getPriorityVariant = (priority: FutureFeature['priority']) => {
    switch(priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
    }
  };

  const getStatusVariant = (status: FutureFeature['status']) => {
    switch(status) {
      case 'proposed': return 'outline';
      case 'planned': return 'secondary';
      case 'in-progress': return 'default';
      case 'blocked': return 'destructive';
    }
  };

  const getStatusLabel = (status: FutureFeature['status']) => {
    const labels = {
      proposed: 'Proposta',
      planned: 'Planejada',
      'in-progress': 'Em Progresso',
      blocked: 'Bloqueada'
    };
    return labels[status];
  };

  const getPriorityLabel = (priority: FutureFeature['priority']) => {
    const labels = {
      critical: 'Crítica',
      high: 'Alta',
      medium: 'Média',
      low: 'Baixa'
    };
    return labels[priority];
  };

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle>🗺️ Roadmap de Features</CardTitle>
          <CardDescription>
            Features futuras documentadas para implementação posterior. Sistema extensível para não perder contexto técnico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{roadmapStats.totalFeatures}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{roadmapStats.byStatus.proposed}</div>
              <div className="text-xs text-muted-foreground">Propostas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{roadmapStats.byStatus.planned}</div>
              <div className="text-xs text-muted-foreground">Planejadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{roadmapStats.byStatus.inProgress}</div>
              <div className="text-xs text-muted-foreground">Em Progresso</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features List */}
      <Accordion type="single" collapsible className="space-y-4">
        {futureFeatures.map((feature) => (
          <AccordionItem key={feature.id} value={feature.id} className="border-0">
            <Card>
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-left">{feature.title}</h3>
                    <Badge variant={getStatusVariant(feature.status)}>
                      {getStatusLabel(feature.status)}
                    </Badge>
                    <Badge variant={getPriorityVariant(feature.priority)}>
                      {getPriorityLabel(feature.priority)}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    ⏱️ {feature.estimatedTime}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <CardContent className="pt-4 space-y-6">
                  {/* Description */}
                  <div>
                    <h4 className="font-semibold mb-2 text-foreground">📝 Descrição</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>

                  {/* Rationale */}
                  <div>
                    <h4 className="font-semibold mb-2 text-foreground">💡 Justificativa</h4>
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                      {feature.rationale}
                    </pre>
                  </div>

                  {/* Technical Details */}
                  <div>
                    <h4 className="font-semibold mb-2 text-foreground">🔧 Detalhes Técnicos</h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium text-foreground">Dependências:</span>
                        <ul className="list-disc list-inside ml-4 text-muted-foreground mt-1">
                          {feature.technicalDetails.dependencies.map((dep, i) => (
                            <li key={i}>{dep}</li>
                          ))}
                        </ul>
                      </div>
                      {feature.technicalDetails.apiKeys && feature.technicalDetails.apiKeys.length > 0 && (
                        <div>
                          <span className="font-medium text-foreground">API Keys necessárias:</span>
                          <ul className="list-disc list-inside ml-4 text-muted-foreground mt-1">
                            {feature.technicalDetails.apiKeys.map((key, i) => (
                              <li key={i}><code className="bg-muted px-1.5 py-0.5 rounded text-xs">{key}</code></li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {feature.technicalDetails.endpoints && feature.technicalDetails.endpoints.length > 0 && (
                        <div>
                          <span className="font-medium text-foreground">Endpoints:</span>
                          <ul className="list-disc list-inside ml-4 text-muted-foreground mt-1">
                            {feature.technicalDetails.endpoints.map((endpoint, i) => (
                              <li key={i}><code className="bg-muted px-1.5 py-0.5 rounded text-xs break-all">{endpoint}</code></li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {feature.technicalDetails.schemas && feature.technicalDetails.schemas.length > 0 && (
                        <div>
                          <span className="font-medium text-foreground">Schemas afetados:</span>
                          <ul className="list-disc list-inside ml-4 text-muted-foreground mt-1">
                            {feature.technicalDetails.schemas.map((schema, i) => (
                              <li key={i}>{schema}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Implementation */}
                  <div>
                    <h4 className="font-semibold mb-2 text-foreground">🚀 Plano de Implementação</h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium text-foreground">Fase:</span>
                        <span className="ml-2 text-muted-foreground">{feature.implementation.phase}</span>
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Arquivos a modificar:</span>
                        <ul className="list-disc list-inside ml-4 text-muted-foreground mt-1">
                          {feature.implementation.files.map((file, i) => (
                            <li key={i}><code className="bg-muted px-1.5 py-0.5 rounded text-xs break-all">{file}</code></li>
                          ))}
                        </ul>
                      </div>
                      {feature.implementation.keyFunctions && feature.implementation.keyFunctions.length > 0 && (
                        <div>
                          <span className="font-medium text-foreground">Funções chave:</span>
                          <ul className="list-disc list-inside ml-4 text-muted-foreground mt-1">
                            {feature.implementation.keyFunctions.map((fn, i) => (
                              <li key={i}>{fn}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Challenges */}
                  {feature.challenges && feature.challenges.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-foreground">⚠️ Desafios</h4>
                      <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground space-y-1">
                        {feature.challenges.map((challenge, i) => (
                          <li key={i}>{challenge}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* References */}
                  {feature.references && feature.references.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-foreground">📚 Referências</h4>
                      <ul className="space-y-2">
                        {feature.references.map((ref, i) => (
                          <li key={i}>
                            <a 
                              href={ref} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 break-all"
                            >
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              {ref}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Blocked Reason */}
                  {feature.blockedReason && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      <h4 className="font-semibold mb-1 text-destructive">🚫 Motivo do Bloqueio</h4>
                      <p className="text-sm text-muted-foreground">{feature.blockedReason}</p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="pt-4 border-t text-xs text-muted-foreground">
                    Proposta por <span className="font-medium text-foreground">{feature.proposedBy}</span> em <span className="font-medium text-foreground">{feature.proposedAt}</span>
                  </div>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Empty State */}
      {futureFeatures.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhuma feature futura documentada ainda.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
