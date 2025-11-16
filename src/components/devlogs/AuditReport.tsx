import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  backendBugs, 
  frontendBugs, 
  architectureBugs, 
  refactoringStrategy,
  executiveSummary,
  actionPlan,
  validationChecklist,
  type BugReport 
} from "@/data/developer-logs/audit-report-2024-11";
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Shield,
  Zap,
  Target,
  TrendingUp,
  Wrench
} from "lucide-react";

export function AuditReport() {
  const getSeverityColor = (severidade: string) => {
    switch (severidade) {
      case 'crítica': return 'destructive';
      case 'alta': return 'default';
      case 'média': return 'secondary';
      case 'baixa': return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severidade: string) => {
    switch (severidade) {
      case 'crítica': return <XCircle className="h-4 w-4" />;
      case 'alta': return <AlertTriangle className="h-4 w-4" />;
      case 'média': return <Clock className="h-4 w-4" />;
      case 'baixa': return <CheckCircle2 className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (categoria: string) => {
    switch (categoria) {
      case 'segurança': return <Shield className="h-4 w-4" />;
      case 'performance': return <Zap className="h-4 w-4" />;
      case 'funcional': return <Wrench className="h-4 w-4" />;
      case 'ux': return <Target className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const BugCard = ({ bug }: { bug: BugReport }) => (
    <Card key={bug.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant={getSeverityColor(bug.severidade)}>
                {getSeverityIcon(bug.severidade)}
                {bug.severidade.toUpperCase()}
              </Badge>
              <Badge variant="outline">
                {getCategoryIcon(bug.categoria)}
                {bug.categoria}
              </Badge>
              <Badge variant="secondary">#{bug.id}</Badge>
            </div>
            <CardTitle className="text-lg">{bug.descrição}</CardTitle>
          </div>
        </div>
        <CardDescription>
          <span className="font-mono text-xs">{bug.arquivo}</span>
          {bug.linha && <span className="ml-2 text-xs">linha {bug.linha}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-semibold mb-1">🎯 Impacto:</p>
          <p className="text-sm text-muted-foreground">{bug.impacto}</p>
        </div>
        
        <div>
          <p className="text-sm font-semibold mb-1">💡 Solução:</p>
          <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
            <code>{bug.solução}</code>
          </pre>
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Esforço:</span>
            <Badge variant="outline">{bug.esforço}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Prioridade:</span>
            <Badge>{bug.prioridade}/5</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Status: CRÍTICO - Otimização de Recursos Obrigatória</AlertTitle>
        <AlertDescription>
          Esta auditoria preventiva identificou {executiveSummary.totalBugs} bugs potenciais antes de produção.
          Economia estimada: <strong>{executiveSummary.economiaEstimada.creditosPrevenidos}</strong> e <strong>{executiveSummary.economiaEstimada.tempoPoupado}</strong> de debugging.
        </AlertDescription>
      </Alert>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Bugs</CardDescription>
            <CardTitle className="text-3xl">{executiveSummary.totalBugs}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={(executiveSummary.distribuicaoPorSeveridade.crítica / executiveSummary.totalBugs) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {executiveSummary.distribuicaoPorSeveridade.crítica} críticos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Backend</CardDescription>
            <CardTitle className="text-3xl">{executiveSummary.bugsBackend}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={(executiveSummary.bugsBackend / executiveSummary.totalBugs) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round((executiveSummary.bugsBackend / executiveSummary.totalBugs) * 100)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Frontend</CardDescription>
            <CardTitle className="text-3xl">{executiveSummary.bugsFrontend}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={(executiveSummary.bugsFrontend / executiveSummary.totalBugs) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round((executiveSummary.bugsFrontend / executiveSummary.totalBugs) * 100)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Esforço Total</CardDescription>
            <CardTitle className="text-2xl">{executiveSummary.esforcoTotal}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Prazo: {executiveSummary.prazoTotal}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="backend" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="backend">Backend ({backendBugs.length})</TabsTrigger>
          <TabsTrigger value="frontend">Frontend ({frontendBugs.length})</TabsTrigger>
          <TabsTrigger value="architecture">Arquitetura ({architectureBugs.length})</TabsTrigger>
          <TabsTrigger value="strategy">Estratégia</TabsTrigger>
          <TabsTrigger value="action">Plano de Ação</TabsTrigger>
        </TabsList>

        <TabsContent value="backend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🔴 Bugs Backend - Prioridade Crítica</CardTitle>
              <CardDescription>
                Edge functions, database queries e integrations com problemas identificados
              </CardDescription>
            </CardHeader>
          </Card>
          <div className="space-y-4">
            {backendBugs
              .sort((a, b) => a.prioridade - b.prioridade)
              .map(bug => <BugCard key={bug.id} bug={bug} />)}
          </div>
        </TabsContent>

        <TabsContent value="frontend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🟡 Bugs Frontend - Prioridade Alta</CardTitle>
              <CardDescription>
                Hooks, componentes e gestão de estado com problemas identificados
              </CardDescription>
            </CardHeader>
          </Card>
          <div className="space-y-4">
            {frontendBugs
              .sort((a, b) => a.prioridade - b.prioridade)
              .map(bug => <BugCard key={bug.id} bug={bug} />)}
          </div>
        </TabsContent>

        <TabsContent value="architecture" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🟢 Melhorias Arquiteturais - Prioridade Média</CardTitle>
              <CardDescription>
                Otimizações de design, cache e padrões arquiteturais
              </CardDescription>
            </CardHeader>
          </Card>
          <div className="space-y-4">
            {architectureBugs
              .sort((a, b) => a.prioridade - b.prioridade)
              .map(bug => <BugCard key={bug.id} bug={bug} />)}
          </div>
        </TabsContent>

        <TabsContent value="strategy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Estratégia de Refatoração Econômica
              </CardTitle>
              <CardDescription>
                Plano estruturado em 4 fases para máxima economia de créditos
              </CardDescription>
            </CardHeader>
          </Card>
          
          {refactoringStrategy.map(fase => (
            <Card key={fase.fase}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <Badge className="mb-2">Fase {fase.fase}</Badge>
                    <CardTitle>{fase.titulo}</CardTitle>
                  </div>
                  <Badge variant="outline">{fase.esforço_total}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-2">Objetivos:</p>
                  <ul className="space-y-1">
                    {fase.objetivos.map((obj, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <p className="text-sm font-semibold mb-2">Componentes afetados:</p>
                  <div className="flex flex-wrap gap-1">
                    {fase.componentes.map((comp, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs font-mono">
                        {comp}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Economia de Créditos</p>
                    <p className="text-sm font-semibold">{fase.economia_créditos}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Prazo Sugerido</p>
                    <p className="text-sm font-semibold">{fase.prazo_sugerido}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="action" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Plano de Ação Imediato - 4 Semanas
              </CardTitle>
              <CardDescription>
                Cronograma detalhado com tarefas priorizadas
              </CardDescription>
            </CardHeader>
          </Card>

          {Object.entries(actionPlan).map(([key, semana]) => (
            <Card key={key}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <Badge 
                      variant={
                        semana.prioridade === 'CRÍTICA' ? 'destructive' :
                        semana.prioridade === 'ALTA' ? 'default' : 'secondary'
                      }
                      className="mb-2"
                    >
                      {semana.prioridade}
                    </Badge>
                    <CardTitle>{semana.titulo}</CardTitle>
                    <CardDescription className="mt-1">
                      Responsável: {semana.responsável} • Prazo: {semana.prazo}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {semana.tarefas.map((tarefa, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs">{idx + 1}</span>
                      </div>
                      <span>{tarefa}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}

          {/* Validation Checklists */}
          <Card>
            <CardHeader>
              <CardTitle>✅ Checklists de Validação</CardTitle>
              <CardDescription>Critérios de aceitação para cada fase</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold mb-2">Backend</p>
                <ul className="space-y-1">
                  {validationChecklist.backend.map((item, idx) => (
                    <li key={idx} className="text-sm font-mono">{item}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <p className="font-semibold mb-2">Frontend</p>
                <ul className="space-y-1">
                  {validationChecklist.frontend.map((item, idx) => (
                    <li key={idx} className="text-sm font-mono">{item}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <p className="font-semibold mb-2">Qualidade</p>
                <ul className="space-y-1">
                  {validationChecklist.qualidade.map((item, idx) => (
                    <li key={idx} className="text-sm font-mono">{item}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Recomendações Prioritárias */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Recomendações Prioritárias - Implementar Imediatamente</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 space-y-1">
                {executiveSummary.recomendacoesPrioritarias.map((rec, idx) => (
                  <li key={idx} className="text-sm font-medium">{rec}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      {/* Footer Summary */}
      <Card className="bg-primary/5">
        <CardHeader>
          <CardTitle>💰 Resumo de Economia de Créditos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <strong>Créditos Prevenidos:</strong> {executiveSummary.economiaEstimada.creditosPrevenidos}
          </p>
          <p className="text-sm">
            <strong>Tempo Poupado:</strong> {executiveSummary.economiaEstimada.tempoPoupado}
          </p>
          <p className="text-sm">
            <strong>Riscos Eliminados:</strong> {executiveSummary.economiaEstimada.riscosEliminados}
          </p>
          <p className="text-sm mt-4 text-muted-foreground italic">
            "Cada crédito usado em correção é um crédito que não temos para crescer. 
            Nossa sobrevivência depende da excelência na primeira tentativa."
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
