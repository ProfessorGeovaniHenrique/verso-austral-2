import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft, Download, Bug, Bot, Zap, Wrench, BarChart3, Shield, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { exportDeveloperLogsToPDF } from "@/utils/exportDeveloperLogs";
import { useState } from "react";
import {
  AIAssistant,
  AIAssistantROIDashboard,
  CodeScannerInterface,
  ConstructionLogManager,
  TemporalEvolutionDashboard,
  CreditsSavingsIndicator,
  AIAnalysisReview,
  AnnotationDebugPanel,
  SubcorpusDebugPanel
} from '@/components/devlogs';
import { SentrySmokeTest } from '@/components/SentrySmokeTest';
import { projectStats } from "@/data/developer-logs/construction-log";

export default function DeveloperLogs() {
  const navigate = useNavigate();
  const [triggerAnalysis, setTriggerAnalysis] = useState<'audit' | 'performance' | 'errors' | null>(null);
  const [activeTab, setActiveTab] = useState('ai-assistant');

  const handleExportReport = () => {
    exportDeveloperLogsToPDF();
  };

  const handleQuickAnalysis = (type: 'audit' | 'performance' | 'errors') => {
    setActiveTab('ai-assistant');
    setTriggerAnalysis(type);
  };

  const handleAnalysisComplete = () => {
    setTriggerAnalysis(null);
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
                onClick={() => navigate("/dashboard-mvp-definitivo")}
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

            <div className="flex gap-2">
              <Button 
                onClick={() => handleQuickAnalysis('audit')} 
                variant="outline"
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                Analisar Logs
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
                <CardDescription className="text-xs">Concluídas</CardDescription>
                <CardTitle className="text-2xl text-green-600">{projectStats.completedPhases}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs">Em Progresso</CardDescription>
                <CardTitle className="text-2xl text-blue-600">{projectStats.inProgressPhases}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs">Decisões</CardDescription>
                <CardTitle className="text-2xl">{projectStats.totalDecisions}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Credits Savings Indicator */}
          <CreditsSavingsIndicator />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 mt-6 container mx-auto px-4 pb-8">
          <TabsList className="grid w-full grid-cols-8 lg:w-auto">
            <TabsTrigger value="ai-assistant" className="gap-2">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">🤖 IA Assistant</span>
            </TabsTrigger>
            <TabsTrigger value="ai-roi" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">📈 ROI</span>
            </TabsTrigger>
            <TabsTrigger value="ai-review" className="gap-2">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">✅ AI Review</span>
            </TabsTrigger>
            <TabsTrigger value="annotation-debug" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">🔐 Annotation Debug</span>
            </TabsTrigger>
            <TabsTrigger value="code-scanner" className="gap-2">
              <Bug className="w-4 h-4" />
              <span className="hidden sm:inline">🔍 Scanner</span>
            </TabsTrigger>
            <TabsTrigger value="construction-manager" className="gap-2">
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">📝 Log Manager</span>
            </TabsTrigger>
            <TabsTrigger value="temporal-evolution" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">📊 Evolução</span>
            </TabsTrigger>
            <TabsTrigger value="subcorpus-debug" className="gap-2">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">🔍 Subcorpus</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB AI: IA Assistant */}
          <TabsContent value="ai-assistant">
            <AIAssistant 
              triggerAnalysis={triggerAnalysis}
              onAnalysisComplete={handleAnalysisComplete}
            />
          </TabsContent>

          {/* TAB AI ROI: Dashboard de ROI Real */}
          <TabsContent value="ai-roi">
            <AIAssistantROIDashboard />
          </TabsContent>

          {/* TAB AI REVIEW: Validação Humana das Análises */}
          <TabsContent value="ai-review">
            <AIAnalysisReview />
          </TabsContent>

          {/* TAB ANNOTATION DEBUG: Debug de Autenticação */}
          <TabsContent value="annotation-debug">
            <AnnotationDebugPanel />
          </TabsContent>

          {/* TAB CODE SCANNER: Real-time Code Scanner */}
          <TabsContent value="code-scanner">
            <CodeScannerInterface />
          </TabsContent>

          {/* TAB SENTRY TESTS: Smoke Tests para Sentry */}
          <TabsContent value="sentry-tests">
            <Card>
              <CardHeader>
                <CardTitle>Testes de Integração Sentry</CardTitle>
                <CardDescription>
                  Ferramentas para testar a captura de erros frontend e backend pelo Sentry
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SentrySmokeTest />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB CONSTRUCTION MANAGER: Construction Log Manager */}
          <TabsContent value="construction-manager">
            <ConstructionLogManager />
          </TabsContent>

          {/* TAB TEMPORAL EVOLUTION: Dashboard de Evolução */}
          <TabsContent value="temporal-evolution">
            <TemporalEvolutionDashboard />
          </TabsContent>

          {/* TAB SUBCORPUS DEBUG: Debug do SubcorpusContext */}
          <TabsContent value="subcorpus-debug">
            <SubcorpusDebugPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
