/**
 * TabSemanticAnnotation - Aba dedicada exclusivamente à anotação semântica
 * 
 * REFATORAÇÃO: Substituição da TabCoverageAnalysis
 * Responsabilidade única: jobs de anotação semântica, cobertura e curadoria NC
 * 
 * NÃO inclui ProcessingPipelinePanel (pipeline unificada) - esse pertence aos jobs de enriquecimento
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Brain, ChevronDown, RefreshCw, Loader2, FileText } from 'lucide-react';
import { useSemanticCoverage } from '@/hooks/useSemanticCoverage';
import { SemanticCoverageDashboard } from '../SemanticCoverageDashboard';
import { NCCurationPanel } from '@/components/admin/NCCurationPanel';
import { SemanticAnnotationJobsPanel } from './SemanticAnnotationJobsPanel';

interface TabSemanticAnnotationProps {
  isActive?: boolean;
}

export const TabSemanticAnnotation = React.memo(function TabSemanticAnnotation({
  isActive = true
}: TabSemanticAnnotationProps) {
  const [jobsOpen, setJobsOpen] = useState(true);
  const [coverageOpen, setCoverageOpen] = useState(true);
  const [ncOpen, setNcOpen] = useState(false);
  
  // Lazy loading: só busca dados quando aba está ativa
  const { 
    globalCoveragePercent, 
    isLoading,
    isRefreshing,
    refresh,
    refreshMVs 
  } = useSemanticCoverage({ 
    enabled: isActive,
    autoRefreshInterval: false
  });
  
  const [isRefreshingMVs, setIsRefreshingMVs] = useState(false);
  
  const handleRefreshMVs = async () => {
    setIsRefreshingMVs(true);
    await refreshMVs();
    setIsRefreshingMVs(false);
  };

  if (!isActive) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Selecione esta aba para ver a análise</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botões de refresh globais */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isRefreshing}
          title="Atualiza cache local (rápido)"
        >
          {isRefreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Atualizar Cache
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleRefreshMVs}
          disabled={isRefreshingMVs}
          title="Recalcula dados do banco (mais lento, mais preciso)"
        >
          {isRefreshingMVs ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Brain className="mr-2 h-4 w-4" />
          )}
          Recalcular Dados
        </Button>
      </div>

      {/* Painel de Jobs de Anotação Semântica */}
      <Collapsible open={jobsOpen} onOpenChange={setJobsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Jobs de Anotação Semântica</CardTitle>
                    <CardDescription>
                      Gerencie e monitore jobs de anotação por artista e corpus
                    </CardDescription>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${jobsOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <SemanticAnnotationJobsPanel isActive={isActive && jobsOpen} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Dashboard de Cobertura Semântica */}
      <Collapsible open={coverageOpen} onOpenChange={setCoverageOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Cobertura Semântica</CardTitle>
                    <CardDescription>
                      Visibilidade completa da anotação por corpus e artista
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Badge variant={globalCoveragePercent >= 50 ? 'default' : 'secondary'}>
                      {globalCoveragePercent}% anotado
                    </Badge>
                  )}
                  <ChevronDown className={`h-5 w-5 transition-transform ${coverageOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <SemanticCoverageDashboard />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Painel de Curadoria NC */}
      <Collapsible open={ncOpen} onOpenChange={setNcOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Curadoria de Palavras NC</CardTitle>
                  <CardDescription>
                    Revise e classifique palavras não categorizadas
                  </CardDescription>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${ncOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <NCCurationPanel />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
});
