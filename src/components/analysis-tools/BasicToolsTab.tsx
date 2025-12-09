/**
 * 🧰 BASIC TOOLS TAB
 * 
 * Aba de ferramentas básicas de linguística de corpus
 * Integra: Wordlist, Keywords, KWIC, Dispersão, N-grams, Nuvem de Keywords
 * 
 * Sprint AUD-U: Added breadcrumb navigation and compare mode alert
 * Sprint BASIC-PERSIST: Added BasicAnalysisModal for batch processing
 */

import React, { Suspense, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  List, 
  Key, 
  Search, 
  BarChart3, 
  Hash, 
  Cloud,
  FileText,
  Play
} from 'lucide-react';
import { useAnalysisTools } from '@/contexts/AnalysisToolsContext';
import { CorpusSelector } from './CorpusSelector';
import { StatisticsCards } from './StatisticsCards';
import { KeywordsCloud } from './KeywordsCloud';
import { AnalysisToolsBridge } from './ContextBridge';
import { ToolErrorBoundary } from './ToolErrorBoundary';
import { ToolLoadingSkeleton } from './ToolLoadingSkeleton';
import { SubTabBreadcrumb } from '@/components/ui/sub-tab-breadcrumb';
import { CompareModeAlert } from '@/components/ui/compare-mode-alert';
import { BasicAnalysisModal } from './BasicAnalysisModal';
import { CacheStatusIndicator } from './CacheStatusIndicator';

// Importar ferramentas existentes
import { WordlistTool } from '@/components/mvp/tools/WordlistTool';
import { KeywordsTool } from '@/components/mvp/tools/KeywordsTool';
import { KWICTool } from '@/components/mvp/tools/KWICTool';
import { DispersionTool } from '@/components/mvp/tools/DispersionTool';
import { NGramsTool } from '@/components/mvp/tools/NGramsTool';

const toolLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  wordlist: { label: 'Wordlist', icon: <List className="h-3.5 w-3.5" /> },
  keywords: { label: 'Keywords', icon: <Key className="h-3.5 w-3.5" /> },
  kwic: { label: 'KWIC', icon: <Search className="h-3.5 w-3.5" /> },
  dispersion: { label: 'Dispersão', icon: <BarChart3 className="h-3.5 w-3.5" /> },
  ngrams: { label: 'N-grams', icon: <Hash className="h-3.5 w-3.5" /> },
  cloud: { label: 'Nuvem de Keywords', icon: <Cloud className="h-3.5 w-3.5" /> },
};

interface BasicToolsTabProps {
  className?: string;
}

export function BasicToolsTab({ className }: BasicToolsTabProps) {
  const { studyCorpus, setStudyCorpus, referenceCorpus, setReferenceCorpus } = useAnalysisTools();
  const [activeToolTab, setActiveToolTab] = React.useState('wordlist');
  const [showProcessModal, setShowProcessModal] = useState(false);
  
  // Detectar modo compare
  const isCompareMode = useMemo(() => {
    return studyCorpus && referenceCorpus && studyCorpus.type !== 'user' && referenceCorpus.type !== 'user';
  }, [studyCorpus, referenceCorpus]);
  
  const currentTool = toolLabels[activeToolTab] || { label: activeToolTab, icon: null };
  
  return (
    <div className="space-y-6">
      {/* Seletores de Corpus */}
      <div className="grid md:grid-cols-2 gap-4">
        <CorpusSelector
          label="Corpus de Estudo"
          description="Corpus principal para análise"
          value={studyCorpus}
          onChange={setStudyCorpus}
        />
        <CorpusSelector
          label="Corpus de Referência"
          description="Corpus para comparação estatística (Keywords, Log-Likelihood)"
          value={referenceCorpus}
          onChange={setReferenceCorpus}
          showBalancing
        />
      </div>

      {/* Alerta de modo compare */}
      {isCompareMode && (
        <CompareModeAlert
          corpusA="Corpus de Estudo"
          corpusB="Corpus de Referência"
          variant="compact"
        />
      )}

      {/* Cards de Estatísticas + Botão de Processamento */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => setShowProcessModal(true)}
              className="gap-2"
              disabled={!studyCorpus}
            >
              <Play className="h-4 w-4" />
              Processar Análise Básica
            </Button>
            <CacheStatusIndicator />
          </div>
        </div>
        <StatisticsCards />
      </div>

      {/* Ferramentas em Sub-Abas - Envolto no Bridge para sincronização */}
      <AnalysisToolsBridge>
        <div className="space-y-4">
          {/* Breadcrumb de contexto */}
          <SubTabBreadcrumb
            parentLabel="Ferramentas Básicas"
            currentLabel={currentTool.label}
            parentIcon={<FileText className="h-4 w-4" />}
            currentIcon={currentTool.icon}
          />
          
          <Tabs value={activeToolTab} onValueChange={setActiveToolTab} className="space-y-4">
            <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
              <TabsTrigger value="wordlist" className="flex items-center gap-1.5 text-xs md:text-sm">
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Wordlist</span>
                <span className="sm:hidden">WL</span>
              </TabsTrigger>
              <TabsTrigger value="keywords" className="flex items-center gap-1.5 text-xs md:text-sm">
                <Key className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Keywords</span>
                <span className="sm:hidden">KW</span>
              </TabsTrigger>
              <TabsTrigger value="kwic" className="flex items-center gap-1.5 text-xs md:text-sm">
                <Search className="h-3.5 w-3.5" />
                <span>KWIC</span>
              </TabsTrigger>
              <TabsTrigger value="dispersion" className="flex items-center gap-1.5 text-xs md:text-sm">
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Dispersão</span>
                <span className="sm:hidden">Disp</span>
              </TabsTrigger>
              <TabsTrigger value="ngrams" className="flex items-center gap-1.5 text-xs md:text-sm">
                <Hash className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">N-grams</span>
                <span className="sm:hidden">NG</span>
              </TabsTrigger>
              <TabsTrigger value="cloud" className="flex items-center gap-1.5 text-xs md:text-sm">
                <Cloud className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Nuvem</span>
                <span className="sm:hidden">☁️</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="wordlist" className="mt-4">
              <ToolErrorBoundary toolName="Wordlist">
                <Suspense fallback={<ToolLoadingSkeleton />}>
                  <WordlistTool />
                </Suspense>
              </ToolErrorBoundary>
            </TabsContent>
            
            <TabsContent value="keywords" className="mt-4">
              <ToolErrorBoundary toolName="Keywords">
                <Suspense fallback={<ToolLoadingSkeleton />}>
                  <KeywordsTool />
                </Suspense>
              </ToolErrorBoundary>
            </TabsContent>
            
            <TabsContent value="kwic" className="mt-4">
              <ToolErrorBoundary toolName="KWIC">
                <Suspense fallback={<ToolLoadingSkeleton />}>
                  <KWICTool />
                </Suspense>
              </ToolErrorBoundary>
            </TabsContent>
            
            <TabsContent value="dispersion" className="mt-4">
              <ToolErrorBoundary toolName="Dispersão">
                <Suspense fallback={<ToolLoadingSkeleton />}>
                  <DispersionTool />
                </Suspense>
              </ToolErrorBoundary>
            </TabsContent>
            
            <TabsContent value="ngrams" className="mt-4">
              <ToolErrorBoundary toolName="N-grams">
                <Suspense fallback={<ToolLoadingSkeleton />}>
                  <NGramsTool />
                </Suspense>
              </ToolErrorBoundary>
            </TabsContent>
            
            <TabsContent value="cloud" className="mt-4">
              <ToolErrorBoundary toolName="Nuvem de Keywords">
                <KeywordsCloud />
              </ToolErrorBoundary>
            </TabsContent>
          </Tabs>
        </div>
      </AnalysisToolsBridge>

      {/* Modal de Processamento */}
      <BasicAnalysisModal 
        open={showProcessModal} 
        onOpenChange={setShowProcessModal} 
      />
    </div>
  );
}
