/**
 * 🔬 ANALYSIS TOOLS PAGE (Página 3 MVP)
 * 
 * Página principal de ferramentas de análise linguística
 * Organizada em 3 abas:
 * - Ferramentas Básicas (Wordlist, Keywords, KWIC, etc.)
 * - Análise de Estilo (Leech & Short)
 * - Análise Cultural (Temporal, Dialetal)
 * 
 * Sprint CAT-AUDIT-P1: Pré-seleção via query params
 */

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Sparkles, 
  Globe, 
  ArrowLeft 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SubcorpusProvider } from '@/contexts/SubcorpusContext';
import { ToolsProvider } from '@/contexts/ToolsContext';
import { AnalysisToolsProvider, useAnalysisTools } from '@/contexts/AnalysisToolsContext';
import { CorpusUploader } from '@/components/analysis-tools/CorpusUploader';
import { BasicToolsTab } from '@/components/analysis-tools/BasicToolsTab';
import { StyleAnalysisTab } from '@/components/analysis-tools/StyleAnalysisTab';
import { CulturalAnalysisTab } from '@/components/analysis-tools/CulturalAnalysisTab';

function AnalysisToolsContent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { activeTab, setActiveTab, userCorpora, setStudyCorpus } = useAnalysisTools();

  // Sprint CAT-AUDIT-P1: Pré-selecionar corpus/artista via query params
  useEffect(() => {
    const corpusParam = searchParams.get('corpus');
    const artistParam = searchParams.get('artist');
    const artistNameParam = searchParams.get('artistName');
    
    if (artistParam && artistNameParam) {
      // Pré-selecionar artista
      setStudyCorpus({
        type: 'platform',
        platformArtist: artistParam,
      });
      toast({
        title: "Artista Carregado",
        description: `Corpus de ${decodeURIComponent(artistNameParam)} pronto para análise.`,
      });
    } else if (corpusParam && corpusParam !== 'all') {
      // Pré-selecionar corpus
      setStudyCorpus({
        type: 'platform',
        platformCorpus: corpusParam as any,
      });
      toast({
        title: "Corpus Carregado",
        description: `Corpus "${corpusParam}" pronto para análise.`,
      });
    }
  }, [searchParams, setStudyCorpus, toast]);

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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Ferramentas Básicas</span>
            <span className="sm:hidden">Básicas</span>
          </TabsTrigger>
          <TabsTrigger value="style" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Análise de Estilo</span>
            <span className="sm:hidden">Estilo</span>
          </TabsTrigger>
          <TabsTrigger value="cultural" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Análise Cultural</span>
            <span className="sm:hidden">Cultural</span>
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
      </Tabs>
    </div>
  );
}

export default function AnalysisToolsPage() {
  return (
    <SubcorpusProvider>
      <ToolsProvider>
        <AnalysisToolsProvider>
          <AnalysisToolsContent />
        </AnalysisToolsProvider>
      </ToolsProvider>
    </SubcorpusProvider>
  );
}
