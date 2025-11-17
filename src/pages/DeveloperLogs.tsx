import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhaseTimeline } from "@/components/devlogs/PhaseTimeline";
import { GrammarIntegration } from "@/components/devlogs/GrammarIntegration";
import { TechnicalDecisions } from "@/components/devlogs/TechnicalDecisions";
import { MetricsEvolution } from "@/components/devlogs/MetricsEvolution";
import { SearchBar } from "@/components/devlogs/SearchBar";
import { AuditReport } from "@/components/devlogs/AuditReport";
import { CorrectionsLog } from "@/components/devlogs/CorrectionsLog";
import { AIAssistant } from "@/components/devlogs/AIAssistant";
import { CodeScannerInterface } from "@/components/devlogs/CodeScannerInterface";
import { constructionLog, projectStats, getCompletedPhases, getInProgressPhases } from "@/data/developer-logs/construction-log";
import { scientificChangelog, scientificStats } from "@/data/developer-logs/changelog-scientific";
import { FileText, GitBranch, TrendingUp, BookOpen, Target, ArrowLeft, Download, Bug, Bot, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { exportDeveloperLogsToPDF } from "@/utils/exportDeveloperLogs";
import { useState, useMemo } from "react";
import { matchesSearch } from "@/utils/highlightText";

export default function DeveloperLogs() {
  const navigate = useNavigate();
  const completedPhases = getCompletedPhases();
  const inProgressPhases = getInProgressPhases();

  // Estados de busca e filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Estado para controlar análise rápida e aba ativa
  const [triggerAnalysis, setTriggerAnalysis] = useState<'audit' | 'performance' | 'errors' | null>(null);
  const [activeTab, setActiveTab] = useState('ai-assistant');

  // Filtrar fases baseado nos filtros
  const filteredPhases = useMemo(() => {
    return constructionLog.filter(phase => {
      // Filtro de status
      if (statusFilter !== 'all' && phase.status !== statusFilter) return false;

      // Filtro de fase
      if (phaseFilter !== 'all') {
        const phaseNumber = phase.phase.match(/Fase (\d+)/)?.[1];
        if (phaseNumber !== phaseFilter) return false;
      }

      // Filtro de busca
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        const phaseText = `${phase.phase} ${phase.objective} ${phase.decisions.map(d => d.decision).join(' ')}`;
        return phaseText.toLowerCase().includes(searchLower);
      }

      return true;
    });
  }, [searchTerm, phaseFilter, statusFilter]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setPhaseFilter('all');
    setStatusFilter('all');
  };

  const handleExportReport = () => {
    exportDeveloperLogsToPDF();
  };

  const handleQuickAnalysis = (type: 'audit' | 'performance' | 'errors') => {
    setActiveTab('ai-assistant'); // Muda para aba IA
    setTriggerAnalysis(type); // Dispara análise
  };

  const handleAnalysisComplete = () => {
    setTriggerAnalysis(null); // Limpa o trigger após análise
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard-mvp")}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">📋 Developer Logs</h1>
                <p className="text-muted-foreground mt-1">
                  Documentação completa do processo de construção da plataforma
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm">
                Atualizado em: {new Date().toLocaleDateString('pt-BR')}
              </Badge>
              
              {/* Botões de análise rápida */}
              <Button 
                onClick={() => handleQuickAnalysis('audit')} 
                variant="default"
                className="gap-2"
              >
                <Bot className="w-4 h-4" />
                Analisar Auditoria
              </Button>
              
              <Button 
                onClick={() => handleQuickAnalysis('performance')} 
                variant="secondary"
                className="gap-2"
              >
                <Zap className="w-4 h-4" />
                Analisar Performance
              </Button>
              
              <Button onClick={handleExportReport} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Exportar Relatório
              </Button>
              
              <Button 
                onClick={() => setActiveTab('code-scanner')}
                variant="destructive" 
                className="gap-2"
              >
                <Bug className="w-4 h-4" />
                🔍 Escanear Código
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs">Fases Totais</CardDescription>
                <CardTitle className="text-2xl">{projectStats.totalPhases}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs">Fases Concluídas</CardDescription>
                <CardTitle className="text-2xl text-green-600">
                  {projectStats.completedPhases}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs">Linhas de Código</CardDescription>
                <CardTitle className="text-2xl">{projectStats.totalLinesOfCode.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs">Decisões Técnicas</CardDescription>
                <CardTitle className="text-2xl">{projectStats.totalDecisions}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          phaseFilter={phaseFilter}
          onPhaseFilterChange={setPhaseFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          resultsCount={filteredPhases.length}
          onClear={handleClearFilters}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 mt-6">
          <TabsList className="grid w-full grid-cols-8 lg:w-auto">
            <TabsTrigger value="ai-assistant" className="gap-2">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">🤖 IA</span>
            </TabsTrigger>
            <TabsTrigger value="code-scanner" className="gap-2">
              <Bug className="w-4 h-4" />
              <span className="hidden sm:inline">🔍 Scanner</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Auditoria</span>
            </TabsTrigger>
            <TabsTrigger value="corrections" className="gap-2">
              <Bug className="w-4 h-4" />
              <span className="hidden sm:inline">🐛 Correções</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Timeline</span>
            </TabsTrigger>
            <TabsTrigger value="grammar" className="gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Gramática</span>
            </TabsTrigger>
            <TabsTrigger value="decisions" className="gap-2">
              <GitBranch className="w-4 h-4" />
              <span className="hidden sm:inline">Decisões</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Métricas</span>
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Roadmap</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB AI: IA Assistant */}
          <TabsContent value="ai-assistant">
            <AIAssistant 
              triggerAnalysis={triggerAnalysis}
              onAnalysisComplete={handleAnalysisComplete}
            />
          </TabsContent>

          {/* TAB CODE SCANNER: Real-time Code Scanner */}
          <TabsContent value="code-scanner">
            <CodeScannerInterface />
          </TabsContent>

          {/* TAB 0: Auditoria e Debugging */}
          <TabsContent value="audit">
            <AuditReport />
          </TabsContent>

          {/* TAB 1: Changelog de Correções */}
          <TabsContent value="corrections">
            <CorrectionsLog />
          </TabsContent>

          {/* TAB 2: Timeline de Fases */}
          <TabsContent value="timeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Timeline de Desenvolvimento</CardTitle>
                <CardDescription>
                  Histórico cronológico das fases de construção da plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PhaseTimeline phases={filteredPhases} searchTerm={searchTerm} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Integração da Gramática de Castilho */}
          <TabsContent value="grammar" className="space-y-6">
            <GrammarIntegration phases={filteredPhases} searchTerm={searchTerm} />
          </TabsContent>

          {/* TAB 3: Decisões Técnicas */}
          <TabsContent value="decisions" className="space-y-6">
            <TechnicalDecisions phases={filteredPhases} searchTerm={searchTerm} />
          </TabsContent>

          {/* TAB 4: Evolução de Métricas */}
          <TabsContent value="metrics" className="space-y-6">
            <MetricsEvolution phases={filteredPhases} />
          </TabsContent>

          {/* TAB 5: Roadmap */}
          <TabsContent value="roadmap" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Roadmap de Desenvolvimento</CardTitle>
                <CardDescription>
                  Planejamento futuro e próximas implementações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Fases Concluídas */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-600" />
                      Concluído ({completedPhases.length} fases)
                    </h3>
                    <div className="space-y-3 pl-6">
                      {completedPhases.map((phase, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                          <div className="w-2 h-2 rounded-full bg-green-600 mt-2" />
                          <div className="flex-1">
                            <div className="font-semibold text-green-900 dark:text-green-300">
                              {phase.phase}
                            </div>
                            <div className="text-sm text-green-700 dark:text-green-400 mt-1">
                              {phase.objective}
                            </div>
                            <Badge variant="outline" className="mt-2 text-xs">
                              {phase.dateStart} - {phase.dateEnd}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fases Em Progresso */}
                  {inProgressPhases.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse" />
                        Em Progresso ({inProgressPhases.length} fase{inProgressPhases.length > 1 ? 's' : ''})
                      </h3>
                      <div className="space-y-3 pl-6">
                        {inProgressPhases.map((phase, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                            <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 animate-pulse" />
                            <div className="flex-1">
                              <div className="font-semibold text-blue-900 dark:text-blue-300">
                                {phase.phase}
                              </div>
                              <div className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                                {phase.objective}
                              </div>
                              {phase.nextSteps && phase.nextSteps.length > 0 && (
                                <div className="mt-3 space-y-1">
                                  <span className="text-xs font-semibold text-blue-900 dark:text-blue-300">
                                    Próximos Passos:
                                  </span>
                                  <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
                                    {phase.nextSteps.map((step, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <span>→</span>
                                        {step}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fases Planejadas */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                      Planejado ({constructionLog.filter(p => p.status === 'planned').length} fases)
                    </h3>
                    <div className="space-y-3 pl-6">
                      {constructionLog
                        .filter(p => p.status === 'planned')
                        .map((phase, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                            <div className="w-2 h-2 rounded-full bg-muted-foreground mt-2" />
                            <div className="flex-1">
                              <div className="font-semibold">
                                {phase.phase}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {phase.objective}
                              </div>
                              {phase.nextSteps && phase.nextSteps.length > 0 && (
                                <div className="mt-3 space-y-1">
                                  <span className="text-xs font-semibold text-muted-foreground">
                                    A Implementar:
                                  </span>
                                  <ul className="text-xs text-muted-foreground space-y-1">
                                    {phase.nextSteps.map((step, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <span>•</span>
                                        {step}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Changelog Científico */}
            <Card>
              <CardHeader>
                <CardTitle>Changelog Científico</CardTitle>
                <CardDescription>
                  Evolução dos fundamentos linguísticos da plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scientificChangelog.map((version, index) => (
                    <div key={index} className="border-l-2 border-primary pl-4 pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default">{version.version}</Badge>
                        <span className="text-sm text-muted-foreground">{version.date}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        <strong>Metodologia:</strong> {version.methodology}
                      </div>
                      <div className="space-y-2 mt-3">
                        {version.scientificAdvances.map((advance, i) => (
                          <div key={i} className="p-3 bg-muted/50 rounded-lg">
                            <div className="font-semibold text-sm">{advance.feature}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {advance.linguisticBasis}
                            </div>
                            {advance.accuracy && (
                              <Badge variant="secondary" className="mt-2 text-xs">
                                Precisão: {(advance.accuracy * 100).toFixed(0)}%
                              </Badge>
                            )}
                            {advance.improvement && (
                              <Badge variant="outline" className="mt-2 ml-2 text-xs text-green-600">
                                {advance.improvement}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
