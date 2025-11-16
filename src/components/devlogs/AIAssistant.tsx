import { useState, useEffect } from 'react';
import { Bot, Sparkles, AlertTriangle, Zap, Bug, Shield, TrendingUp, Clock, Copy, CheckCircle2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@/lib/notifications';
import { useAIAnalysisHistory, useSuggestionStatus } from '@/hooks/useAIAnalysisHistory';
import { 
  backendBugs, 
  frontendBugs, 
  architectureBugs 
} from '@/data/developer-logs/audit-report-2024-11';

interface AnalysisSuggestion {
  id: string;
  priority: 1 | 2 | 3 | 4 | 5;
  category: 'security' | 'performance' | 'bugfix' | 'optimization';
  title: string;
  description: string;
  affectedFiles: string[];
  codeSnippet: string;
  testSuggestion?: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  creditsSaved: string;
}

interface AnalysisResult {
  timestamp: string;
  analysisId?: string; // ID da análise salva no banco
  summary: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  suggestions: AnalysisSuggestion[];
  nextSteps: string[];
}

interface AIAssistantProps {
  triggerAnalysis?: 'audit' | 'performance' | 'errors' | null;
  onAnalysisComplete?: () => void;
}

export function AIAssistant({ triggerAnalysis, onAnalysisComplete }: AIAssistantProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fixedIds, setFixedIds] = useState<Set<string>>(new Set());
  
  // ✅ Hooks para gerenciar histórico e status
  const { stats: historyStats } = useAIAnalysisHistory();
  const { suggestions: suggestionStatuses, stats: suggestionStats, markAsResolved, markAsDismissed, isUpdating } = 
    useSuggestionStatus(analysisResult?.analysisId);

  // ✅ Efeito para disparar análise quando trigger externo for recebido
  useEffect(() => {
    if (triggerAnalysis && !isAnalyzing) {
      handleAnalyze(triggerAnalysis);
      onAnalysisComplete?.();
    }
  }, [triggerAnalysis]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security': return <Shield className="w-4 h-4" />;
      case 'performance': return <Zap className="w-4 h-4" />;
      case 'bugfix': return <Bug className="w-4 h-4" />;
      case 'optimization': return <TrendingUp className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'destructive';
    if (priority === 2) return 'default';
    if (priority === 3) return 'secondary';
    return 'outline';
  };

  const getPriorityLabel = (priority: number) => {
    const labels = ['', 'Crítico', 'Alto', 'Médio', 'Baixo', 'Trivial'];
    return labels[priority] || 'Desconhecido';
  };

  const handleAnalyze = async (logsType: 'audit' | 'errors' | 'performance') => {
    setIsAnalyzing(true);
    const startTime = Date.now();

    try {
      let context = '';
      
      if (logsType === 'audit') {
        const allBugs = [...backendBugs, ...frontendBugs, ...architectureBugs];
        // Todos os bugs já que não há propriedade status
        context = JSON.stringify({
          totalBugs: allBugs.length,
          bugs: allBugs.map(bug => ({
            id: bug.id,
            categoria: bug.categoria,
            severidade: bug.severidade,
            componente: bug.componente,
            descrição: bug.descrição,
            impacto: bug.impacto,
            arquivo: bug.arquivo,
            solução: bug.solução
          }))
        }, null, 2);
      } else if (logsType === 'errors') {
        context = 'Análise de erros em runtime e console logs';
      } else {
        context = 'Análise de métricas de performance e otimizações';
      }

      const { data, error } = await supabase.functions.invoke('analyze-and-suggest-fixes', {
        body: { logsType, context }
      });

      if (error) throw error;

      const duration = (Date.now() - startTime) / 1000;
      setAnalysisResult(data);

      notifications.success(
        '✨ Análise Concluída',
        `Encontrados ${data.summary.totalIssues} problemas em ${duration.toFixed(1)}s`
      );

    } catch (error) {
      console.error('Analysis error:', error);
      notifications.error(
        'Erro na Análise',
        error as Error
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    
    notifications.success('Código Copiado', 'Cole no arquivo correspondente');
  };

  const handleMarkFixed = (suggestionId: string, suggestion: AnalysisSuggestion) => {
    if (!analysisResult?.analysisId) return;

    setFixedIds(prev => new Set([...prev, suggestionId]));
    
    markAsResolved({
      suggestionId,
      implementationNotes: 'Correção implementada pelo usuário',
      actualCreditsSaved: parseInt(suggestion.creditsSaved.match(/\d+/)?.[0] || '0')
    });
  };

  const handleDismiss = (suggestionId: string) => {
    markAsDismissed({
      suggestionId,
      reason: 'Correção descartada pelo usuário'
    });
  };

  // ✅ Verificar status de cada sugestão
  const getSuggestionStatus = (suggestionId: string) => {
    return suggestionStatuses.find(s => s.suggestion_id === suggestionId);
  };

  return (
    <div className="space-y-6">
      {/* Header com Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Análises Totais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{historyStats.totalAnalyses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {historyStats.totalIssuesFound} problemas encontrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">ROI Real</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {historyStats.totalActualSavings > 0 
                ? `${Math.round((historyStats.totalActualSavings / 35) * 100)}%`
                : '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {historyStats.totalActualSavings} créditos economizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Problemas Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suggestionStats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {suggestionStats.resolved} resolvidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Taxa de Resolução</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suggestionStats.total > 0 
                ? `${Math.round((suggestionStats.resolved / suggestionStats.total) * 100)}%`
                : '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {suggestionStats.resolved}/{suggestionStats.total} correções
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Botões de Análise */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            IA Assistant - Análise Inteligente
          </CardTitle>
          <CardDescription>
            Análise automatizada de logs com sugestões de correção via Gemini 2.5 Flash
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              onClick={() => handleAnalyze('audit')}
              disabled={isAnalyzing}
              className="w-full"
              variant="default"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              Analisar Auditoria
            </Button>

            <Button
              onClick={() => handleAnalyze('performance')}
              disabled={isAnalyzing}
              className="w-full"
              variant="secondary"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Analisar Performance
            </Button>

            <Button
              onClick={() => handleAnalyze('errors')}
              disabled={isAnalyzing}
              className="w-full"
              variant="outline"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Bug className="w-4 h-4 mr-2" />
              )}
              Analisar Erros
            </Button>
          </div>

          {isAnalyzing && (
            <Alert>
              <Sparkles className="w-4 h-4" />
              <AlertDescription>
                Analisando logs e gerando sugestões inteligentes...
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Resultados da Análise */}
      {analysisResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>📊 Resultados da Análise</CardTitle>
                <CardDescription>
                  {analysisResult.summary.totalIssues} problemas encontrados • {' '}
                  <Clock className="w-3 h-3 inline" /> {new Date(analysisResult.timestamp).toLocaleString('pt-BR')}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="destructive">{analysisResult.summary.critical} Críticos</Badge>
                <Badge variant="default">{analysisResult.summary.high} Altos</Badge>
                <Badge variant="secondary">{analysisResult.summary.medium} Médios</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {analysisResult.suggestions.map((suggestion) => {
              const status = getSuggestionStatus(suggestion.id);
              const isFixed = status?.status === 'resolved' || fixedIds.has(suggestion.id);
              const isDismissed = status?.status === 'dismissed';
              const isCopied = copiedId === suggestion.id;

              return (
                <Card key={suggestion.id} className={isFixed || isDismissed ? 'opacity-60' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getCategoryIcon(suggestion.category)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={getPriorityColor(suggestion.priority)}>
                              {getPriorityLabel(suggestion.priority)}
                            </Badge>
                            <Badge variant="outline">{suggestion.category}</Badge>
                            <Badge variant="outline">{suggestion.estimatedEffort}</Badge>
                            {status && (
                              <Badge 
                                variant={status.status === 'resolved' ? 'default' : 'secondary'}
                                className="gap-1"
                              >
                                {status.status === 'resolved' && <CheckCircle2 className="w-3 h-3" />}
                                {status.status === 'dismissed' && <X className="w-3 h-3" />}
                                {status.status === 'resolved' ? 'Resolvido' : 'Descartado'}
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-lg">{suggestion.title}</CardTitle>
                          <CardDescription>{suggestion.description}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">📁 Arquivos Afetados:</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestion.affectedFiles.map((file, idx) => (
                          <Badge key={idx} variant="secondary" className="font-mono text-xs">
                            {file}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">💡 Solução Sugerida:</p>
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                          <code>{suggestion.codeSnippet}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2"
                          onClick={() => handleCopyCode(suggestion.id, suggestion.codeSnippet)}
                        >
                          {isCopied ? (
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {suggestion.testSuggestion && (
                      <Alert>
                        <AlertDescription>
                          <strong>🧪 Teste Sugerido:</strong> {suggestion.testSuggestion}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">
                        💰 Economia estimada: <strong>{suggestion.creditsSaved}</strong>
                      </span>
                      {!isFixed && !isDismissed && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDismiss(suggestion.id)}
                            disabled={isUpdating}
                          >
                            <X className="w-3 h-3 mr-1" />
                            Descartar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleMarkFixed(suggestion.id, suggestion)}
                            disabled={isUpdating}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Marcar como Resolvido
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Próximos Passos */}
            {analysisResult.nextSteps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">🎯 Próximos Passos Recomendados</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysisResult.nextSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-bold">{idx + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
