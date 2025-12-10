import { useState, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Database, AlertTriangle, TrendingUp, TestTube, BookOpen, Loader2, Award } from 'lucide-react';
import { useSemanticPipelineStats } from '@/hooks/useSemanticPipelineStats';
import { SemanticDomainChart } from '@/components/admin/SemanticDomainChart';
import { AnnotationJobsTable } from '@/components/admin/AnnotationJobsTable';
import { NCCurationPanel } from '@/components/admin/NCCurationPanel';
import { NCWordCorrectionTool } from '@/components/admin/NCWordCorrectionTool';
import { BatchSeedingControl } from '@/components/admin/BatchSeedingControl';
import { DuplicateMonitoringCard } from '@/components/admin/DuplicateMonitoringCard';
import { PipelineTestInterface } from '@/components/admin/PipelineTestInterface';
import { CulturalInsigniaCurationPanel } from '@/components/admin/CulturalInsigniaCurationPanel';
import { SectionErrorBoundary } from '@/components/admin/SectionErrorBoundary';
import { MetricCardWithTooltip } from '@/components/admin/MetricCardWithTooltip';
import { CollapsibleSection } from '@/components/admin/CollapsibleSection';
import { PIPELINE_METRIC_DEFINITIONS } from '@/lib/pipelineMetricDefinitions';

// Lazy load heavy component
const SemanticLexiconPanel = lazy(() => import('@/components/admin/SemanticLexiconPanel').then(m => ({ default: m.SemanticLexiconPanel })));

export default function AdminSemanticPipeline() {
  const { data: stats, isLoading, refetch } = useSemanticPipelineStats();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div 
            className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" 
            role="status"
            aria-label="Carregando pipeline semântica"
          />
          <p className="text-muted-foreground" aria-hidden="true">Carregando pipeline semântica...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive">Erro ao carregar estatísticas da pipeline</p>
      </div>
    );
  }

  const getSystemStatus = () => {
    const hasNCWords = stats.cacheStats.ncWords > 100;
    const lexiconEmpty = stats.semanticLexicon.status === 'empty';
    const hasActiveJobs = stats.activeJobs.length > 0;

    if (lexiconEmpty || hasNCWords) {
      return { label: '🔴 Crítico', variant: 'destructive' as const };
    }
    if (stats.semanticLexicon.status === 'partial' || !hasActiveJobs) {
      return { label: '🟡 Degradado', variant: 'secondary' as const };
    }
    return { label: '🟢 Operacional', variant: 'default' as const };
  };

  const systemStatus = getSystemStatus();
  const defs = PIPELINE_METRIC_DEFINITIONS;

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pipeline de Anotação Semântica</h1>
          <p className="text-muted-foreground">
            Monitoramento em tempo real do sistema de classificação semântica
          </p>
        </div>
        <Badge variant={systemStatus.variant} className="text-lg px-4 py-2">
          {systemStatus.label}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="dashboard" className="gap-1 md:gap-2" aria-label="Dashboard">
            <Database className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="lexicon" className="gap-1 md:gap-2" aria-label="Léxico Anotado">
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Léxico Anotado</span>
          </TabsTrigger>
          <TabsTrigger value="insignias" className="gap-1 md:gap-2" aria-label="Insígnias Culturais">
            <Award className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Insígnias</span>
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-1 md:gap-2" aria-label="Teste de Pipeline">
            <TestTube className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Teste</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">

          {/* Main Stats Grid - Wrapped with Collapsible */}
          <SectionErrorBoundary 
            sectionName="Estatísticas Principais" 
            sectionId="stats-grid"
            severity="high"
            fallbackHeight="min-h-[180px]"
          >
            <CollapsibleSection
              storageKey="pipeline-stats"
              title="Estatísticas Principais"
              icon={Database}
              defaultOpen={true}
              badge={{ label: `${stats.cacheStats.totalWords.toLocaleString()} palavras`, variant: 'secondary' }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCardWithTooltip
                  title={defs.cacheStats.totalWords.label}
                  value={stats.cacheStats.totalWords}
                  subtitle={`${stats.cacheStats.uniqueTagsets} domínios semânticos`}
                  tooltip={defs.cacheStats.totalWords.tooltip}
                  icon={Database}
                />

                <MetricCardWithTooltip
                  title={defs.semanticLexicon.totalEntries.label}
                  value={stats.semanticLexicon.totalEntries}
                  subtitle="entradas pré-classificadas"
                  tooltip={defs.semanticLexicon.totalEntries.tooltip}
                  icon={Database}
                  badge={{
                    label: stats.semanticLexicon.status === 'empty' ? '⚠️ Vazio' :
                           stats.semanticLexicon.status === 'partial' ? '🟡 Parcial' : '✅ Completo',
                    variant: stats.semanticLexicon.status === 'empty' ? 'destructive' : 'secondary'
                  }}
                />

                <MetricCardWithTooltip
                  title={defs.cacheStats.ncWords.label}
                  value={stats.cacheStats.ncWords}
                  subtitle={`${stats.cacheStats.totalWords > 0 
                    ? ((stats.cacheStats.ncWords / stats.cacheStats.totalWords) * 100).toFixed(1)
                    : '0.0'}% do cache`}
                  tooltip={defs.cacheStats.ncWords.tooltip}
                  icon={AlertTriangle}
                  iconClassName="text-destructive"
                  valueClassName="text-destructive"
                />

                <MetricCardWithTooltip
                  title={defs.cacheStats.avgConfidence.label}
                  value={`${(stats.cacheStats.avgConfidence * 100).toFixed(1)}%`}
                  subtitle={`Gemini: ${stats.cacheStats.geminiPercentage.toFixed(1)}% | POS: ${stats.cacheStats.posBasedPercentage.toFixed(1)}% | Rules: ${stats.cacheStats.ruleBasedPercentage.toFixed(1)}%`}
                  tooltip={defs.cacheStats.avgConfidence.tooltip}
                  icon={TrendingUp}
                />

                <MetricCardWithTooltip
                  title={defs.cacheStats.wordsWithInsignias.label}
                  value={stats.cacheStats.wordsWithInsignias || 0}
                  subtitle={`Polissêmicas: ${stats.cacheStats.polysemousWords || 0}`}
                  tooltip={defs.cacheStats.wordsWithInsignias.tooltip}
                  icon={Activity}
                />
              </div>
            </CollapsibleSection>
          </SectionErrorBoundary>

          {/* Active Jobs - Wrapped with Collapsible */}
          <SectionErrorBoundary 
            sectionName="Jobs de Anotação" 
            sectionId="annotation-jobs"
            severity="high"
            fallbackHeight="min-h-[300px]"
          >
            <CollapsibleSection
              storageKey="pipeline-jobs"
              title="Jobs de Anotação"
              icon={Activity}
              defaultOpen={true}
              badge={{ label: `${stats.activeJobs.length} ativos`, variant: stats.activeJobs.length > 0 ? 'default' : 'secondary' }}
            >
              <AnnotationJobsTable jobs={stats.activeJobs} onRefresh={refetch} />
            </CollapsibleSection>
          </SectionErrorBoundary>

          {/* Domain Distribution - Wrapped with Collapsible */}
          <SectionErrorBoundary 
            sectionName="Distribuição de Domínios" 
            sectionId="domain-chart"
            severity="medium"
            fallbackHeight="min-h-[400px]"
          >
            <CollapsibleSection
              storageKey="pipeline-chart"
              title="Distribuição de Domínios"
              description="Visualização da distribuição de classificações semânticas"
              defaultOpen={false}
            >
              <SemanticDomainChart data={stats.domainDistribution} />
            </CollapsibleSection>
          </SectionErrorBoundary>

          {/* Batch Seeding Control - Wrapped with Collapsible */}
          <SectionErrorBoundary 
            sectionName="Batch Seeding" 
            sectionId="batch-seeding"
            severity="medium"
            fallbackHeight="min-h-[200px]"
          >
            <CollapsibleSection
              storageKey="pipeline-seeding"
              title="Batch Seeding - Léxico Semântico"
              icon={Database}
              defaultOpen={false}
              badge={{ 
                label: stats.semanticLexicon.status === 'empty' ? '⚠️ Vazio' : 
                       stats.semanticLexicon.status === 'partial' ? '🟡 Parcial' : '✅ Completo',
                variant: stats.semanticLexicon.status === 'empty' ? 'destructive' : 'secondary'
              }}
            >
              <BatchSeedingControl 
                semanticLexiconCount={stats.semanticLexicon.totalEntries}
                status={stats.semanticLexicon.status}
              />
            </CollapsibleSection>
          </SectionErrorBoundary>

          {/* Duplicate Monitoring - Wrapped with Collapsible */}
          <SectionErrorBoundary 
            sectionName="Monitoramento de Duplicatas" 
            sectionId="duplicate-monitoring"
            severity="low"
            fallbackHeight="min-h-[150px]"
          >
            <CollapsibleSection
              storageKey="pipeline-duplicates"
              title="Monitoramento de Duplicatas"
              description="Acompanhe duplicatas no cache de classificação"
              defaultOpen={false}
            >
              <DuplicateMonitoringCard />
            </CollapsibleSection>
          </SectionErrorBoundary>

          {/* NC Words Panel - Wrapped with Collapsible */}
          <SectionErrorBoundary 
            sectionName="Curadoria NC" 
            sectionId="nc-curation"
            severity="high"
            fallbackHeight="min-h-[400px]"
          >
            <CollapsibleSection
              storageKey="pipeline-nc"
              title="Curadoria de Palavras NC"
              icon={AlertTriangle}
              defaultOpen={true}
              badge={{ label: `${stats.cacheStats.ncWords} NC`, variant: stats.cacheStats.ncWords > 100 ? 'destructive' : 'secondary' }}
            >
              <NCCurationPanel />
            </CollapsibleSection>
          </SectionErrorBoundary>

          {/* NC Word Correction Tool - Wrapped with Collapsible */}
          <SectionErrorBoundary 
            sectionName="Correção de Palavras NC" 
            sectionId="nc-correction"
            severity="medium"
            fallbackHeight="min-h-[200px]"
          >
            <CollapsibleSection
              storageKey="pipeline-nc-correction"
              title="Ferramenta de Correção NC"
              description="Corrigir palavras concatenadas ou mal formatadas"
              defaultOpen={false}
            >
              <NCWordCorrectionTool />
            </CollapsibleSection>
          </SectionErrorBoundary>

          {/* System Health Summary - Wrapped with Collapsible */}
          <SectionErrorBoundary 
            sectionName="Saúde do Sistema" 
            sectionId="system-health"
            severity="low"
            fallbackHeight="min-h-[200px]"
          >
            <CollapsibleSection
              storageKey="pipeline-health"
              title="Resumo de Saúde do Sistema"
              badge={{ label: systemStatus.label, variant: systemStatus.variant }}
              defaultOpen={false}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status Geral</span>
                  <Badge variant={systemStatus.variant}>{systemStatus.label}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Auto-Refresh</span>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Ativo (30s)
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Última Atualização</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date().toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Jobs Ativos</span>
                  <Badge variant={stats.activeJobs.length > 0 ? 'default' : 'secondary'}>
                    {stats.activeJobs.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Taxa de Classificação Gemini</span>
                  <span className="text-sm font-medium">
                    {stats.cacheStats.geminiPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CollapsibleSection>
          </SectionErrorBoundary>
        </TabsContent>

        <TabsContent value="lexicon" className="mt-6">
          <SectionErrorBoundary 
            sectionName="Léxico Semântico" 
            sectionId="semantic-lexicon"
            severity="critical"
            fallbackHeight="min-h-[500px]"
          >
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" role="status" aria-label="Carregando léxico" />
              </div>
            }>
              <SemanticLexiconPanel />
            </Suspense>
          </SectionErrorBoundary>
        </TabsContent>

        <TabsContent value="insignias" className="mt-6">
          <SectionErrorBoundary 
            sectionName="Insígnias Culturais" 
            sectionId="cultural-insignias"
            severity="high"
            fallbackHeight="min-h-[500px]"
          >
            <CulturalInsigniaCurationPanel />
          </SectionErrorBoundary>
        </TabsContent>

        <TabsContent value="test" className="mt-6">
          <SectionErrorBoundary 
            sectionName="Teste de Pipeline" 
            sectionId="pipeline-test"
            severity="low"
            fallbackHeight="min-h-[400px]"
          >
            <PipelineTestInterface />
          </SectionErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
