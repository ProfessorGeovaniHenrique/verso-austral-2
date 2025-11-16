import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Lightbulb, GitBranch, TrendingUp, AlertTriangle } from "lucide-react";
import { ConstructionPhase, TechnicalDecision } from "@/data/developer-logs/construction-log";

interface TechnicalDecisionsProps {
  phases: ConstructionPhase[];
}

export function TechnicalDecisions({ phases }: TechnicalDecisionsProps) {
  // Agrupar decisões por categoria
  const categorizedDecisions = phases.reduce((acc, phase) => {
    phase.decisions.forEach(decision => {
      const category = categorizeDecision(decision);
      if (!acc[category]) acc[category] = [];
      acc[category].push({ ...decision, phase: phase.phase, status: phase.status });
    });
    return acc;
  }, {} as Record<string, Array<TechnicalDecision & { phase: string; status: string }>>);

  function categorizeDecision(decision: TechnicalDecision): string {
    const text = decision.decision.toLowerCase();
    if (text.includes('typescript') || text.includes('estruturar') || text.includes('type')) return 'Arquitetura de Dados';
    if (text.includes('visual') || text.includes('three.js') || text.includes('ui')) return 'Interface & Visualização';
    if (text.includes('edge function') || text.includes('api') || text.includes('backend')) return 'Backend & Performance';
    if (text.includes('gramática') || text.includes('regras') || text.includes('linguís')) return 'Conhecimento Linguístico';
    if (text.includes('tagset') || text.includes('anotação') || text.includes('pos')) return 'Anotação & Análise';
    return 'Outras Decisões';
  }

  const totalDecisions = phases.reduce((sum, p) => sum + p.decisions.length, 0);
  const impactfulDecisions = phases.flatMap(p => p.decisions).filter(d => d.impact).length;

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Decisões</CardDescription>
            <CardTitle className="text-3xl">{totalDecisions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Com Impacto Mensurável</CardDescription>
            <CardTitle className="text-3xl">{impactfulDecisions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Categorias</CardDescription>
            <CardTitle className="text-3xl">{Object.keys(categorizedDecisions).length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Decisões por Categoria */}
      <Card>
        <CardHeader>
          <CardTitle>Decisões Técnicas por Categoria</CardTitle>
          <CardDescription>
            Histórico de escolhas arquiteturais e suas justificativas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {Object.entries(categorizedDecisions).map(([category, decisions]) => (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    <span className="font-semibold">{category}</span>
                    <Badge variant="outline">{decisions.length} decisões</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pl-6">
                    {decisions.map((decision, index) => (
                      <Card key={index} className="border-l-4 border-l-primary">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-4">
                            <CardTitle className="text-base">{decision.decision}</CardTitle>
                            <Badge variant="secondary" className="shrink-0">
                              {decision.phase.split(':')[0]}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Rationale */}
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Justificativa
                            </span>
                            <p className="text-sm mt-1">{decision.rationale}</p>
                          </div>

                          {/* Alternativas Consideradas */}
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Alternativas Consideradas
                            </span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {decision.alternatives.map((alt, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  <GitBranch className="w-3 h-3 mr-1" />
                                  {alt}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Por que foi escolhida */}
                          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                            <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                              ✓ Por que foi escolhida
                            </span>
                            <p className="text-sm mt-1">{decision.chosenBecause}</p>
                          </div>

                          {/* Impacto (se existir) */}
                          {decision.impact && (
                            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-green-600" />
                                <span className="text-xs font-semibold text-green-900 dark:text-green-300 uppercase tracking-wide">
                                  Impacto Mensurável
                                </span>
                              </div>
                              <p className="text-sm mt-1 text-green-800 dark:text-green-400">
                                {decision.impact}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Lições Aprendidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Lições Aprendidas
          </CardTitle>
          <CardDescription>
            Insights extraídos do processo de tomada de decisão
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                💡 Type-safety é investimento, não custo
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                Estruturar regras gramaticais em TypeScript ao invés de JSON puro trouxe ganhos enormes em DX e prevenção de bugs.
                A decisão de investir tempo na tipagem inicial economizou horas de debugging posteriores.
              </p>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
              <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">
                🎨 Beleza visual atrai, rigor científico retém
              </h4>
              <p className="text-sm text-purple-800 dark:text-purple-400">
                A visualização 3D foi fundamental para atrair usuários, mas a integração com Castilho (2010) foi o que
                transformou a ferramenta em algo cientificamente válido e pedagogicamente útil.
              </p>
            </div>

            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
              <h4 className="font-semibold text-orange-900 dark:text-orange-300 mb-2">
                ⚡ Edge Functions têm limitações importantes
              </h4>
              <p className="text-sm text-orange-800 dark:text-orange-400">
                Descobrimos que Edge Functions (Deno) não podem importar de <code className="bg-orange-100 dark:bg-orange-900 px-1 rounded">src/</code>.
                A solução foi copiar as regras gramaticais, o que trouxe zero latência mas criou duplicação de código.
                Trade-off válido para este caso de uso.
              </p>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
              <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">
                📊 Métricas guiam, não ditam
              </h4>
              <p className="text-sm text-green-800 dark:text-green-400">
                Aumentar a cobertura de verbos de 15 para 57 trouxe +13pp de precisão no POS Tagging.
                Mas o ganho real foi qualitativo: capacidade de analisar textos gauchescos com verbos regionais
                que antes eram ignorados ou anotados incorretamente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
