/**
 * 📊 ANNOTATION QUALITY METRICS
 * Sprint AUD-A (A-4): Dashboard de métricas de qualidade da anotação semântica
 * 
 * Exibe cobertura, distribuição por nível, diversidade e score geral.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { DominioSemantico } from '@/data/types/corpus.types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AnnotationQualityMetricsProps {
  dominios: DominioSemantico[];
  totalWords: number;
  annotationSource: 'platform' | 'user' | 'cache';
}

// Helper para calcular score de qualidade (0-100)
function calculateQualityScore(
  coveragePercent: number, 
  byLevel: Record<string, number>, 
  uniqueDomains: number
): number {
  // 50% do peso para cobertura
  const coverageScore = coveragePercent * 0.5;
  
  // 25% para profundidade (preferência por N3/N4 sobre N1/N2)
  const totalClassified = Object.values(byLevel).reduce((a, b) => a + b, 0);
  const depthRatio = totalClassified > 0 
    ? (byLevel.N3 + byLevel.N4) / totalClassified 
    : 0;
  const depthScore = depthRatio * 25;
  
  // 25% para diversidade (máximo 50 domínios únicos = 100%)
  const diversityScore = Math.min(uniqueDomains / 50, 1) * 25;
  
  return Math.min(100, Math.round(coverageScore + depthScore + diversityScore));
}

// Helper para determinar variante do badge baseado no score
function getQualityVariant(score: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (score >= 75) return 'default';
  if (score >= 50) return 'secondary';
  if (score >= 25) return 'outline';
  return 'destructive';
}

// Helper para cor do score
function getScoreColor(score: number): string {
  if (score >= 75) return 'text-green-600';
  if (score >= 50) return 'text-amber-600';
  if (score >= 25) return 'text-orange-600';
  return 'text-red-600';
}

export function AnnotationQualityMetrics({ 
  dominios, 
  totalWords, 
  annotationSource 
}: AnnotationQualityMetricsProps) {
  
  const metrics = useMemo(() => {
    // Filtrar domínios classificados vs não classificados
    const unclassifiedLabels = ['Sem classificação', 'NC', 'Não classificado', 'MG'];
    const classified = dominios.filter(d => !unclassifiedLabels.includes(d.dominio));
    const unclassified = dominios.filter(d => unclassifiedLabels.includes(d.dominio));
    
    // Calcular totais
    const totalClassified = classified.reduce((sum, d) => sum + d.ocorrencias, 0);
    const totalUnclassified = unclassified.reduce((sum, d) => sum + d.ocorrencias, 0);
    
    // Cobertura = % de palavras com classificação
    const coverage = totalWords > 0 
      ? (totalClassified / totalWords) * 100
      : 0;
    
    // Distribuição por nível hierárquico (baseado no código do domínio)
    const byLevel: Record<string, number> = { N1: 0, N2: 0, N3: 0, N4: 0 };
    
    classified.forEach(d => {
      // Tentar inferir nível pelo código (ex: NA, NA.FL, NA.FL.AR, NA.FL.AR.01)
      const codigo = (d as any).codigo || '';
      const parts = codigo.split('.');
      
      if (parts.length >= 4) byLevel.N4++;
      else if (parts.length === 3) byLevel.N3++;
      else if (parts.length === 2) byLevel.N2++;
      else if (parts.length === 1 && codigo) byLevel.N1++;
      else byLevel.N1++; // Fallback
    });
    
    // Diversidade = número de domínios únicos
    const uniqueDomains = new Set(classified.map(d => d.dominio)).size;
    
    // Score de qualidade
    const qualityScore = calculateQualityScore(coverage, byLevel, uniqueDomains);
    
    return {
      coverage: coverage.toFixed(1),
      coverageRaw: coverage,
      totalClassified,
      totalUnclassified,
      byLevel,
      uniqueDomains,
      qualityScore
    };
  }, [dominios, totalWords]);
  
  if (dominios.length === 0) {
    return null;
  }
  
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-primary" />
          Qualidade da Anotação
        </CardTitle>
        <CardDescription className="text-xs">
          Métricas de cobertura e profundidade da classificação semântica
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Geral */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            {metrics.qualityScore >= 50 ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            )}
            <span className="text-sm font-medium">Score de Qualidade</span>
          </div>
          <Badge variant={getQualityVariant(metrics.qualityScore)} className="text-sm">
            <span className={getScoreColor(metrics.qualityScore)}>
              {metrics.qualityScore}/100
            </span>
          </Badge>
        </div>
        
        {/* Cobertura */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-1 cursor-help">
                  <span>Cobertura</span>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[200px] text-xs">
                    Percentual de palavras do corpus que receberam classificação semântica válida.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="font-medium">{metrics.coverage}%</span>
          </div>
          <Progress value={metrics.coverageRaw} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{metrics.totalClassified.toLocaleString()} classificadas</span>
            <span>{metrics.totalUnclassified.toLocaleString()} sem classificação</span>
          </div>
        </div>
        
        {/* Distribuição por Nível */}
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">Distribuição por Nível</span>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(metrics.byLevel).map(([level, count]) => (
              <div key={level} className="text-center p-2 bg-muted/30 rounded-md">
                <div className="text-lg font-bold">{count}</div>
                <div className="text-xs text-muted-foreground">{level}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Estatísticas */}
        <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Domínios únicos:</span>
            <span className="font-medium">{metrics.uniqueDomains}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Fonte:</span>
            <Badge variant="outline" className="text-xs">
              {annotationSource === 'platform' ? 'Cache Plataforma' : 
               annotationSource === 'user' ? 'Análise On-demand' : 'Misto'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
