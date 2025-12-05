/**
 * 🔬 ANALYSIS TOOLS PAGE (Página 3 MVP)
 * 
 * Página principal de ferramentas de análise linguística
 * Organizada em 4 abas:
 * - Ferramentas Básicas (Wordlist, Keywords, KWIC, etc.)
 * - Análise de Estilo (Leech & Short)
 * - Análise Cultural (Temporal, Dialetal)
 * - Visualizações (Rede Semântica, Galáxia, etc.)
 */

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Sparkles, 
  Globe, 
  ArrowLeft,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { AnalysisToolsProvider, useAnalysisTools } from '@/contexts/AnalysisToolsContext';
import { CorpusUploader } from '@/components/analysis-tools/CorpusUploader';
import { BasicToolsTab } from '@/components/analysis-tools/BasicToolsTab';
import { StyleAnalysisTab } from '@/components/analysis-tools/StyleAnalysisTab';
import { CulturalAnalysisTab } from '@/components/analysis-tools/CulturalAnalysisTab';
import { VisualizationsTab } from '@/components/analysis-tools/VisualizationsTab';

function AnalysisToolsContent() {
  const navigate = useNavigate();
  const { activeTab, setActiveTab, userCorpora } = useAnalysisTools();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard-mvp-definitivo')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Ferramentas de Análise</h1>
            <p className="text-sm text-muted-foreground">
              Análise linguística avançada com métricas estatísticas científicas
            </p>
          </div>
        </div>
        
        {/* Upload rápido */}
        <div className="flex items-center gap-2">
          <CorpusUploader compact />
          {userCorpora.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {userCorpora.length} corpus(es) carregado(s)
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Básicas</span>
            <span className="sm:hidden">Básicas</span>
          </TabsTrigger>
          <TabsTrigger value="style" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Estilo</span>
            <span className="sm:hidden">Estilo</span>
          </TabsTrigger>
          <TabsTrigger value="cultural" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Cultural</span>
            <span className="sm:hidden">Cultural</span>
          </TabsTrigger>
          <TabsTrigger value="visualizations" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Visualizações</span>
            <span className="sm:hidden">Visual</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <BasicToolsTab />
        </TabsContent>
        
        <TabsContent value="style">
          <StyleAnalysisTab />
        </TabsContent>
        
        <TabsContent value="cultural">
          <CulturalAnalysisTab />
        </TabsContent>

        <TabsContent value="visualizations">
          <VisualizationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AnalysisToolsPage() {
  return (
    <AnalysisToolsProvider>
      <AnalysisToolsContent />
    </AnalysisToolsProvider>
  );
}
