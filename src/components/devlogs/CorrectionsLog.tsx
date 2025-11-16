import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { corrections, summaryMetrics, nextSteps } from "@/data/developer-logs/changelog-corrections-nov2024";
import { CheckCircle2, AlertTriangle, TrendingUp, Target, Code2, Zap } from "lucide-react";

export function CorrectionsLog() {
  const getCategoryIcon = (categoria: string) => {
    switch (categoria) {
      case 'security': return '🔒';
      case 'performance': return '⚡';
      case 'bugfix': return '🐛';
      case 'optimization': return '📈';
      default: return '🔧';
    }
  };

  const getSeverityColor = (severidade: string) => {
    switch (severidade) {
      case 'crítica': return 'destructive';
      case 'alta': return 'default';
      case 'média': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Métricas Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Correções Totais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{summaryMetrics.totalCorrections}</span>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Issues Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{summaryMetrics.criticalIssuesFixed}</span>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Créditos Economizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{summaryMetrics.estimatedCreditsSaved}</span>
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Melhoria Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{summaryMetrics.performanceImprovement}</span>
              <Zap className="w-5 h-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Executivo */}
      <Alert>
        <Target className="h-4 w-4" />
        <AlertDescription>
          <strong>Protocolo de Economia de Créditos aplicado com sucesso:</strong> 
          <ul className="mt-2 space-y-1 text-sm">
            <li>✅ {summaryMetrics.securityIssuesFixed} vulnerabilidade de segurança corrigida</li>
            <li>✅ {summaryMetrics.memoryLeaksFixed} memory leaks eliminados</li>
            <li>✅ Redução de {summaryMetrics.estimatedBugReduction} em bugs</li>
            <li>✅ {summaryMetrics.componentsAffected} componentes otimizados</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Lista de Correções */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Code2 className="w-5 h-5" />
          Correções Implementadas
        </h3>

        {corrections.map((correction) => (
          <Card key={correction.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{getCategoryIcon(correction.categoria)}</span>
                    <Badge variant="outline">{correction.id}</Badge>
                    <Badge variant={getSeverityColor(correction.severidade) as any}>
                      {correction.severidade}
                    </Badge>
                    <Badge variant="secondary">{correction.categoria}</Badge>
                    {correction.testeRealizado && (
                      <Badge variant="outline" className="bg-green-50">
                        ✅ Testado
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">{correction.descricao}</CardTitle>
                  <CardDescription className="mt-1">{correction.data}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Problema Original */}
              <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-900">
                <h4 className="font-semibold text-red-900 dark:text-red-300 mb-2">
                  ❌ Problema Original
                </h4>
                <p className="text-sm text-red-800 dark:text-red-400 whitespace-pre-line">
                  {correction.problemaOriginal}
                </p>
              </div>

              {/* Solução Implementada */}
              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-900">
                <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">
                  ✅ Solução Implementada
                </h4>
                <pre className="text-sm text-green-800 dark:text-green-400 whitespace-pre-wrap font-mono">
                  {correction.solucaoImplementada}
                </pre>
              </div>

              {/* Componentes Afetados */}
              <div>
                <h4 className="font-semibold mb-2 text-sm text-muted-foreground">
                  📦 Componentes Afetados:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {correction.componentes.map((comp, idx) => (
                    <Badge key={idx} variant="outline" className="font-mono text-xs">
                      {comp}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Impacto</p>
                  <p className="text-sm">{correction.impactoEconomia}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Economia Estimada</p>
                  <p className="text-sm font-bold text-green-600">{correction.creditosEconomizados}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Próximos Passos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Próximos Passos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {nextSteps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-primary font-bold">{idx + 1}.</span>
                <span className="text-sm">{step}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
