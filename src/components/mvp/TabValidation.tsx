import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, XCircle, AlertTriangle, PlayCircle, ChevronDown, FlaskConical } from "lucide-react";
import { runAllTests, TestSuite, TestResult } from "@/data/mockup/validation/corpusTests";

export function TabValidation() {
  const [testResults, setTestResults] = useState<TestSuite[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const results = runAllTests();
      setTestResults(results);
      setLastRun(new Date());
      setIsRunning(false);
    }, 500);
  };

  useEffect(() => {
    // Executar testes automaticamente ao carregar
    runTests();
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return <Badge className="bg-green-600">Passou</Badge>;
      case 'failed': return <Badge variant="destructive">Falhou</Badge>;
      case 'warning': return <Badge className="bg-yellow-600">Aviso</Badge>;
    }
  };

  const totalTests = testResults?.reduce((acc, suite) => acc + suite.summary.total, 0) || 0;
  const totalPassed = testResults?.reduce((acc, suite) => acc + suite.summary.passed, 0) || 0;
  const totalFailed = testResults?.reduce((acc, suite) => acc + suite.summary.failed, 0) || 0;
  const totalWarnings = testResults?.reduce((acc, suite) => acc + suite.summary.warnings, 0) || 0;

  return (
    <div className="space-y-6">
      <Card className="card-academic">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="section-header-academic flex items-center gap-2">
                <FlaskConical className="w-5 h-5" />
                Testes Automatizados do Corpus
              </CardTitle>
              <CardDescription className="section-description-academic">
                Validação automática de integridade e consistência dos dados
              </CardDescription>
            </div>
            <Button 
              onClick={runTests} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              <PlayCircle className="w-4 h-4" />
              {isRunning ? 'Executando...' : 'Executar Testes'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resumo Geral */}
          {testResults && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold">{totalTests}</div>
                    <p className="text-sm text-muted-foreground">Total de Testes</p>
                  </CardContent>
                </Card>
                <Card className="border-green-600/20 bg-green-50 dark:bg-green-950/10">
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-green-600">{totalPassed}</div>
                    <p className="text-sm text-muted-foreground">Passaram</p>
                  </CardContent>
                </Card>
                <Card className="border-red-600/20 bg-red-50 dark:bg-red-950/10">
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-red-600">{totalFailed}</div>
                    <p className="text-sm text-muted-foreground">Falharam</p>
                  </CardContent>
                </Card>
                <Card className="border-yellow-600/20 bg-yellow-50 dark:bg-yellow-950/10">
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-yellow-600">{totalWarnings}</div>
                    <p className="text-sm text-muted-foreground">Avisos</p>
                  </CardContent>
                </Card>
              </div>

              {lastRun && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Última execução: {lastRun.toLocaleString('pt-BR')}
                    {totalFailed === 0 && totalWarnings === 0 && ' - ✅ Todos os testes passaram!'}
                  </AlertDescription>
                </Alert>
              )}

              {/* Suites de Testes */}
              <div className="space-y-4">
                {testResults.map((suite, idx) => (
                  <Collapsible key={idx} defaultOpen={suite.summary.failed > 0}>
                    <Card className={
                      suite.summary.failed > 0 
                        ? 'border-red-600/20' 
                        : suite.summary.warnings > 0 
                        ? 'border-yellow-600/20' 
                        : 'border-green-600/20'
                    }>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <ChevronDown className="w-4 h-4" />
                              <CardTitle className="text-lg">{suite.name}</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {suite.summary.passed}/{suite.summary.total}
                              </Badge>
                              {suite.summary.failed > 0 && (
                                <Badge variant="destructive">{suite.summary.failed} falhas</Badge>
                              )}
                              {suite.summary.warnings > 0 && (
                                <Badge className="bg-yellow-600">{suite.summary.warnings} avisos</Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-2 pt-0">
                          {suite.tests.map((test, testIdx) => (
                            <div 
                              key={testIdx}
                              className={`p-4 rounded-lg border ${
                                test.status === 'passed' 
                                  ? 'bg-green-50 dark:bg-green-950/10 border-green-600/20' 
                                  : test.status === 'failed'
                                  ? 'bg-red-50 dark:bg-red-950/10 border-red-600/20'
                                  : 'bg-yellow-50 dark:bg-yellow-950/10 border-yellow-600/20'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1">
                                  {getStatusIcon(test.status)}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium">{test.name}</span>
                                      {getStatusBadge(test.status)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{test.message}</p>
                                    {test.details && (test.status === 'failed' || test.status === 'warning') && (
                                      <details className="mt-2">
                                        <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                                          Ver detalhes
                                        </summary>
                                        <pre className="mt-2 p-2 bg-muted/50 rounded text-xs overflow-auto max-h-32">
                                          {JSON.stringify(test.details, null, 2)}
                                        </pre>
                                      </details>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            </>
          )}

          {isRunning && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                <p className="text-muted-foreground">Executando testes...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
