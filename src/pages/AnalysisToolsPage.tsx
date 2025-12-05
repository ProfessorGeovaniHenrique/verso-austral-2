/**
 * 🔬 ANALYSIS TOOLS PAGE (Página 3 MVP)
 * 
 * Página principal de ferramentas de análise linguística
 * Organizada em 3 abas:
 * - Ferramentas Básicas (Wordlist, Keywords, KWIC, etc.)
 * - Análise de Estilo (Leech & Short)
 * - Análise Cultural (Temporal, Dialetal)
 */

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  Sparkles, 
  Globe, 
  ArrowLeft 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { AnalysisToolsProvider, useAnalysisTools } from '@/contexts/AnalysisToolsContext';
import { CorpusUploader } from '@/components/analysis-tools/CorpusUploader';
import { CorpusSelector } from '@/components/analysis-tools/CorpusSelector';
import { BasicToolsTab } from '@/components/analysis-tools/BasicToolsTab';

function StyleAnalysisTab() {
  const { studyCorpus, setStudyCorpus, referenceCorpus, setReferenceCorpus } = useAnalysisTools();
  
  return (
    <div className="space-y-6">
      {/* Seletores de Corpus */}
      <div className="grid md:grid-cols-2 gap-4">
        <CorpusSelector
          label="Corpus de Estudo"
          description="Corpus para análise estilística (preferencialmente anotado)"
          value={studyCorpus}
          onChange={setStudyCorpus}
          showBalancing
        />
        <CorpusSelector
          label="Corpus de Referência"
          description="Corpus para comparação de perfis"
          value={referenceCorpus}
          onChange={setReferenceCorpus}
        />
      </div>

      {/* Ferramentas Placeholder */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { name: 'Perfil Léxico', desc: 'Diversidade vocabular e campos semânticos' },
          { name: 'Perfil Sintático', desc: 'Complexidade e padrões estruturais' },
          { name: 'Figuras Retóricas', desc: 'Repetição, aliteração, anáfora' },
          { name: 'Análise de Coesão', desc: 'Conectivos e cadeias lexicais' },
          { name: 'Fala e Pensamento', desc: 'Escalas DS→NRSA e DT→NRTA' },
          { name: 'Mind Style', desc: 'Transitividade, agência, modalidade' },
          { name: 'Foregrounding', desc: 'Desvio e paralelismo' },
        ].map(tool => (
          <Card key={tool.name} className="opacity-60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{tool.name}</CardTitle>
              <CardDescription className="text-xs">{tool.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground italic">
                Sprint P3-2: Em desenvolvimento
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CulturalAnalysisTab() {
  const { studyCorpus, setStudyCorpus, referenceCorpus, setReferenceCorpus } = useAnalysisTools();
  
  return (
    <div className="space-y-6">
      {/* Seletores de Corpus */}
      <div className="grid md:grid-cols-2 gap-4">
        <CorpusSelector
          label="Corpus de Estudo"
          description="Corpus para análise cultural e dialetal"
          value={studyCorpus}
          onChange={setStudyCorpus}
          showBalancing
        />
        <CorpusSelector
          label="Corpus de Referência"
          description="Corpus para comparação regional/temporal"
          value={referenceCorpus}
          onChange={setReferenceCorpus}
        />
      </div>

      {/* Ferramentas Placeholder */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { name: 'Análise Temporal', desc: 'Evolução de palavras ao longo do tempo' },
          { name: 'Análise Cultural', desc: 'Marcadores regionais e insígnias culturais' },
          { name: 'Análise Dialetal', desc: 'Variações morfológicas, sintáticas e diacrônicas' },
        ].map(tool => (
          <Card key={tool.name} className="opacity-60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{tool.name}</CardTitle>
              <CardDescription className="text-xs">{tool.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground italic">
                Sprint P3-3: Em desenvolvimento
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

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
    <AnalysisToolsProvider>
      <AnalysisToolsContent />
    </AnalysisToolsProvider>
  );
}
