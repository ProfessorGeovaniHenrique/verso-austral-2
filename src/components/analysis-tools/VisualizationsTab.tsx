/**
 * 📊 VISUALIZATIONS TAB
 * 
 * Aba de visualizações avançadas para análise exploratória
 * Contém 4 sub-visualizações:
 * - Rede Semântica (Sigma.js)
 * - Galáxia de Domínios
 * - Rede de Co-ocorrência
 * - Nuvem de Keywords
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Network, 
  Sparkles, 
  Cloud,
  GitBranch
} from 'lucide-react';
import { useAnalysisTools } from '@/contexts/AnalysisToolsContext';
import { CorpusSelector } from './CorpusSelector';
import { AnalysisToolsBridge } from './ContextBridge';
import { SemanticNetworkWrapper } from './SemanticNetworkWrapper';
import { GalaxyWrapper } from './GalaxyWrapper';
import { CoOccurrenceWrapper } from './CoOccurrenceWrapper';
import { KeywordsCloudExpanded } from './KeywordsCloudExpanded';

export function VisualizationsTab() {
  const { 
    studyCorpus, 
    setStudyCorpus, 
    referenceCorpus, 
    setReferenceCorpus 
  } = useAnalysisTools();
  
  const [activeViz, setActiveViz] = useState('network');

  return (
    <AnalysisToolsBridge>
      <div className="space-y-6">
        {/* Seletores de Corpus */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração de Corpus</CardTitle>
            <CardDescription>
              Selecione os corpora para análise visual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Corpus de Estudo</label>
                <CorpusSelector
                  value={studyCorpus}
                  onChange={setStudyCorpus}
                  label="Corpus de Estudo"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Corpus de Referência</label>
                <CorpusSelector
                  value={referenceCorpus}
                  onChange={setReferenceCorpus}
                  label="Corpus de Referência"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs de Visualizações */}
        <Tabs value={activeViz} onValueChange={setActiveViz} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="network" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              <span className="hidden sm:inline">Rede Semântica</span>
              <span className="sm:hidden">Rede</span>
            </TabsTrigger>
            <TabsTrigger value="galaxy" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Galáxia</span>
              <span className="sm:hidden">Galáxia</span>
            </TabsTrigger>
            <TabsTrigger value="cooccurrence" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              <span className="hidden sm:inline">Co-ocorrência</span>
              <span className="sm:hidden">Co-oc</span>
            </TabsTrigger>
            <TabsTrigger value="cloud" className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              <span className="hidden sm:inline">Nuvem Keywords</span>
              <span className="sm:hidden">Nuvem</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="network">
            <SemanticNetworkWrapper />
          </TabsContent>

          <TabsContent value="galaxy">
            <GalaxyWrapper />
          </TabsContent>

          <TabsContent value="cooccurrence">
            <CoOccurrenceWrapper />
          </TabsContent>

          <TabsContent value="cloud">
            <KeywordsCloudExpanded />
          </TabsContent>
        </Tabs>
      </div>
    </AnalysisToolsBridge>
  );
}
