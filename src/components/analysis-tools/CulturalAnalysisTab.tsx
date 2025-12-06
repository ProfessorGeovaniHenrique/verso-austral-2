/**
 * 🎭 CULTURAL ANALYSIS TAB
 * 
 * Integrates cultural analysis tools:
 * - Temporal Analysis (word evolution over time)
 * - Dialectal Analysis (regional markers)
 * - Cultural Insignias (cultural identity markers)
 */

import React, { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, MapPin, Award } from 'lucide-react';
import { useAnalysisTools } from '@/contexts/AnalysisToolsContext';
import { CorpusSelector } from './CorpusSelector';
import { AnalysisToolsBridge } from './ContextBridge';
import { ToolErrorBoundary } from './ToolErrorBoundary';
import { ToolLoadingSkeleton } from './ToolLoadingSkeleton';

// Import existing tools
import { TemporalAnalysisTool } from '@/components/mvp/tools/TemporalAnalysisTool';
import { DialectalAnalysisTool } from '@/components/mvp/tools/DialectalAnalysisTool';
import { CulturalInsigniaAnalysisTool } from './CulturalInsigniaAnalysisTool';

export function CulturalAnalysisTab() {
  const { studyCorpus, setStudyCorpus, referenceCorpus, setReferenceCorpus } = useAnalysisTools();
  const [activeToolTab, setActiveToolTab] = React.useState('temporal');

  return (
    <div className="space-y-6">
      {/* Corpus Selectors */}
      <div className="grid md:grid-cols-2 gap-4">
        <CorpusSelector
          label="Corpus de Estudo"
          description="Corpus para análise cultural e dialetal"
          value={studyCorpus}
          onChange={setStudyCorpus}
        />
        <CorpusSelector
          label="Corpus de Referência"
          description="Corpus para comparação regional/temporal"
          value={referenceCorpus}
          onChange={setReferenceCorpus}
          showBalancing
        />
      </div>

      {/* Tools Tabs */}
      <AnalysisToolsBridge>
        <Tabs value={activeToolTab} onValueChange={setActiveToolTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="temporal" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Análise Temporal</span>
              <span className="sm:hidden">Temporal</span>
            </TabsTrigger>
            <TabsTrigger value="dialectal" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Análise Dialetal</span>
              <span className="sm:hidden">Dialetal</span>
            </TabsTrigger>
            <TabsTrigger value="insignias" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Insígnias Culturais</span>
              <span className="sm:hidden">Insígnias</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="temporal" className="mt-4">
            <ToolErrorBoundary toolName="Análise Temporal">
              <Suspense fallback={<ToolLoadingSkeleton />}>
                <TemporalAnalysisTool />
              </Suspense>
            </ToolErrorBoundary>
          </TabsContent>

          <TabsContent value="dialectal" className="mt-4">
            <ToolErrorBoundary toolName="Análise Dialetal">
              <Suspense fallback={<ToolLoadingSkeleton />}>
                <DialectalAnalysisTool />
              </Suspense>
            </ToolErrorBoundary>
          </TabsContent>

          <TabsContent value="insignias" className="mt-4">
            <ToolErrorBoundary toolName="Insígnias Culturais">
              <Suspense fallback={<ToolLoadingSkeleton />}>
                <CulturalInsigniaAnalysisTool />
              </Suspense>
            </ToolErrorBoundary>
          </TabsContent>
        </Tabs>
      </AnalysisToolsBridge>
    </div>
  );
}
