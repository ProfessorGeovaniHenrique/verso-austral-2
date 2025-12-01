import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Database, AlertTriangle, TrendingUp, TestTube } from 'lucide-react';
import { useSemanticPipelineStats } from '@/hooks/useSemanticPipelineStats';
import { SemanticDomainChart } from '@/components/admin/SemanticDomainChart';
import { AnnotationJobsTable } from '@/components/admin/AnnotationJobsTable';
import { NCWordsPanel } from '@/components/admin/NCWordsPanel';
import { BatchSeedingControl } from '@/components/admin/BatchSeedingControl';
import { DuplicateMonitoringCard } from '@/components/admin/DuplicateMonitoringCard';
import { PipelineTestInterface } from '@/components/admin/PipelineTestInterface';

export default function AdminSemanticPipeline() {
  const { data: stats, isLoading, refetch } = useSemanticPipelineStats();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Carregando pipeline semântica...</p>
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">
            <Database className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="test">
            <TestTube className="w-4 h-4 mr-2" />
            Teste de Pipeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Coverage</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.cacheStats.totalWords.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              palavras únicas no cache
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.cacheStats.uniqueTagsets} domínios semânticos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Semantic Lexicon</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.semanticLexicon.totalEntries.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              entradas pré-classificadas
            </p>
            <Badge 
              variant={stats.semanticLexicon.status === 'empty' ? 'destructive' : 'secondary'}
              className="mt-2"
            >
              {stats.semanticLexicon.status === 'empty' ? '⚠️ Vazio' :
               stats.semanticLexicon.status === 'partial' ? '🟡 Parcial' : '✅ Completo'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NC Words</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.cacheStats.ncWords.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              palavras não classificadas
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {((stats.cacheStats.ncWords / stats.cacheStats.totalWords) * 100).toFixed(1)}% do cache
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.cacheStats.avgConfidence * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              confiança média global
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Gemini: {stats.cacheStats.geminiPercentage.toFixed(1)}% | 
              POS: {stats.cacheStats.posBasedPercentage.toFixed(1)}% |
              Rules: {stats.cacheStats.ruleBasedPercentage.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">POS Coverage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.posStats.coverage.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.posStats.totalAnnotated.toLocaleString()} tokens anotados
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              VA: {((stats.posStats.sourceDistribution.va_grammar / stats.posStats.totalAnnotated) * 100).toFixed(0)}% | 
              spaCy: {((stats.posStats.sourceDistribution.spacy / stats.posStats.totalAnnotated) * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cultural Insignias</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.cacheStats.wordsWithInsignias || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              palavras com marcadores culturais
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Polissêmicas: {stats.cacheStats.polysemousWords || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Jobs */}
      <AnnotationJobsTable jobs={stats.activeJobs} onRefresh={refetch} />

      {/* Domain Distribution */}
      <SemanticDomainChart data={stats.domainDistribution} />

      {/* Batch Seeding Control */}
      <BatchSeedingControl 
        semanticLexiconCount={stats.semanticLexicon.totalEntries}
        status={stats.semanticLexicon.status}
      />

      {/* Duplicate Monitoring */}
      <DuplicateMonitoringCard />

      {/* NC Words Panel */}
      <NCWordsPanel />

      {/* System Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo de Saúde do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Status Geral</span>
            <Badge variant={systemStatus.variant}>{systemStatus.label}</Badge>
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
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="test" className="mt-6">
          <PipelineTestInterface />
        </TabsContent>
      </Tabs>
    </div>
  );
}
