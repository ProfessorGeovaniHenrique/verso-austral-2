import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAIAnalysisHistory } from '@/hooks/useAIAnalysisHistory';
import { useCodeScanHistory } from '@/hooks/useCodeScanHistory';
import { TrendingUp, DollarSign, Target, Zap } from 'lucide-react';

export function CreditsSavingsIndicator() {
  const { stats: aiStats } = useAIAnalysisHistory();
  const { scans } = useCodeScanHistory();
  
  // Calcular créditos usados (1 crédito por scan)
  const totalCreditsUsed = scans?.length || 0;
  
  // Calcular créditos economizados (baseado nas sugestões da IA)
  const totalCreditsSaved = aiStats.totalEstimatedSavings || 0;
  
  // Calcular ROI
  const roi = totalCreditsUsed > 0 ? totalCreditsSaved / totalCreditsUsed : 0;
  
  // Calcular média de economia por análise
  const avgSavingsPerAnalysis = aiStats.totalAnalyses > 0 
    ? totalCreditsSaved / aiStats.totalAnalyses 
    : 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <TrendingUp className="w-5 h-5" />
          💰 ROI de Créditos Lovable
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Créditos Usados */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span>Créditos Usados</span>
            </div>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              {totalCreditsUsed}
            </p>
            <p className="text-xs text-muted-foreground">
              ~{totalCreditsUsed} análises realizadas
            </p>
          </div>

          {/* Créditos Economizados */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="w-4 h-4" />
              <span>Economizados</span>
            </div>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {totalCreditsSaved}
            </p>
            <p className="text-xs text-muted-foreground">
              via otimizações implementadas
            </p>
          </div>

          {/* ROI */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="w-4 h-4" />
              <span>ROI</span>
            </div>
            <p className="text-3xl font-bold text-primary">
              {roi.toFixed(1)}x
            </p>
            <p className="text-xs text-muted-foreground">
              retorno sobre investimento
            </p>
          </div>

          {/* Média por Análise */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span>Média/Análise</span>
            </div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              ~{Math.round(avgSavingsPerAnalysis)}
            </p>
            <p className="text-xs text-muted-foreground">
              créditos economizados
            </p>
          </div>
        </div>

        {/* Interpretação do ROI */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm">
            {roi >= 10 && (
              <span className="text-green-600 dark:text-green-400">
                ✨ <strong>Excelente!</strong> Você economiza {roi.toFixed(1)}x mais créditos do que usa.
              </span>
            )}
            {roi >= 5 && roi < 10 && (
              <span className="text-blue-600 dark:text-blue-400">
                👍 <strong>Muito Bom!</strong> ROI de {roi.toFixed(1)}x indica boa economia de créditos.
              </span>
            )}
            {roi >= 2 && roi < 5 && (
              <span className="text-yellow-600 dark:text-yellow-400">
                📊 <strong>Positivo!</strong> ROI de {roi.toFixed(1)}x mostra economia moderada.
              </span>
            )}
            {roi > 0 && roi < 2 && (
              <span className="text-orange-600 dark:text-orange-400">
                ⚠️ <strong>Atenção!</strong> ROI baixo. Foque em implementar mais sugestões críticas.
              </span>
            )}
            {roi === 0 && totalCreditsUsed > 0 && (
              <span className="text-red-600 dark:text-red-400">
                🔴 <strong>Sem Retorno.</strong> Implemente as sugestões da IA para economizar créditos.
              </span>
            )}
            {totalCreditsUsed === 0 && (
              <span className="text-muted-foreground">
                Execute análises para começar a medir o ROI.
              </span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
