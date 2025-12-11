/**
 * TabEnrichmentJobsRefactored - Aba de Enriquecimento desmembrada
 * 
 * REFATORAÇÃO: Substituição da TabEnrichmentJobs original
 * - Divide em duas sub-abas: Jobs Ativos (Enriquecimento) e Anotação Semântica
 * - Usa EnrichmentJobsContext centralizado
 * - Lazy loading para componentes pesados
 * 
 * SEPARAÇÃO DE RESPONSABILIDADES:
 * - Jobs Ativos: enrichment_jobs (metadados, YouTube, letras)
 * - Anotação Semântica: semantic_annotation_jobs + cobertura + curadoria NC
 */

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Activity, Brain } from 'lucide-react';
import { EnrichmentJobsProvider } from '@/contexts/EnrichmentJobsContext';
import { TabActiveJobs } from './catalog/TabActiveJobs';
import { TabSemanticAnnotation } from './catalog/TabSemanticAnnotation';

export function TabEnrichmentJobsRefactored() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'semantic'>('jobs');

  return (
    <EnrichmentJobsProvider>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'jobs' | 'semantic')}>
        <TabsList className="mb-4">
          <TabsTrigger value="jobs" className="gap-2">
            <Activity className="h-4 w-4" />
            Jobs de Enriquecimento
          </TabsTrigger>
          <TabsTrigger value="semantic" className="gap-2">
            <Brain className="h-4 w-4" />
            Anotação Semântica
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          <TabActiveJobs />
        </TabsContent>

        <TabsContent value="semantic">
          <TabSemanticAnnotation isActive={activeTab === 'semantic'} />
        </TabsContent>
      </Tabs>
    </EnrichmentJobsProvider>
  );
}
