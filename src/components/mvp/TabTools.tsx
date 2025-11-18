import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, Sparkles, Database, HelpCircle, ChevronRight, ChevronDown } from "lucide-react";
import { ToolsProvider, useTools } from "@/contexts/ToolsContext";
import { UnifiedCorpusSelector } from "@/components/corpus/UnifiedCorpusSelector";
import { WordlistTool } from "./tools/WordlistTool";
import { KeywordsTool } from "./tools/KeywordsTool";
import { KWICTool } from "./tools/KWICTool";
import { DispersionTool } from "./tools/DispersionTool";
import { NGramsTool } from "./tools/NGramsTool";
import { AdvancedAnalysisTab } from "./tools/AdvancedAnalysisTab";
import { useAnalytics } from '@/hooks/useAnalytics';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Static constant to prevent re-creation on every render
const BASIC_TOOLS = [
  { id: 'wordlist', label: 'Word List', icon: Database },
  { id: 'keywords', label: 'Keywords', icon: Sparkles },
  { id: 'kwic', label: 'KWIC', icon: Database },
  { id: 'dispersion', label: 'Dispersão', icon: Database },
  { id: 'ngrams', label: 'N-grams', icon: Database },
] as const;

// Sidebar Menu Component
function ToolsSidebarMenu() {
  const { activeTab, setActiveTab } = useTools();
  const { trackFeatureUsage } = useAnalytics();
  const [isBasicasOpen, setIsBasicasOpen] = useState(true);
  const [isAvancadasOpen, setIsAvancadasOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Memoize allowComparison to prevent unnecessary re-renders of UnifiedCorpusSelector
  const allowComparison = useMemo(
    () => activeTab === 'keywords',
    [activeTab]
  );

  const handleToolChange = (toolId: string) => {
    setActiveTab(toolId);
    trackFeatureUsage(toolId);
  };

  return (
    <div className="h-full flex flex-col border-r bg-card">
      {/* Header with collapse toggle */}
      <div className="p-4 border-b flex items-center justify-between">
        {!isCollapsed && (
          <h3 className="font-semibold text-sm">Ferramentas</h3>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-auto"
        >
          <ChevronRight className={cn("w-4 h-4 transition-transform", !isCollapsed && "rotate-180")} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {/* Corpus Section - Always visible */}
          <div className="mb-4">
            {!isCollapsed && (
              <UnifiedCorpusSelector 
                allowComparison={allowComparison} 
                layout="vertical"
              />
            )}
            {isCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center"
                title="Corpus"
              >
                <Database className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Ferramentas Básicas */}
          <Collapsible open={isBasicasOpen} onOpenChange={setIsBasicasOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start"
                size="sm"
              >
                <ChevronDown className={cn("w-4 h-4 mr-2 transition-transform", !isBasicasOpen && "-rotate-90")} />
                {!isCollapsed && (
                  <>
                    <Wrench className="w-4 h-4 mr-2" />
                    <span>Básicas</span>
                  </>
                )}
                {isCollapsed && <Wrench className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {BASIC_TOOLS.map((tool) => (
                <Button
                  key={tool.id}
                  variant={activeTab === tool.id ? 'secondary' : 'ghost'}
                  className={cn(
                    "w-full justify-start",
                    activeTab === tool.id && "bg-primary/10 text-primary font-medium"
                  )}
                  size="sm"
                  onClick={() => handleToolChange(tool.id)}
                  data-tool={tool.id}
                >
                  <tool.icon className="w-4 h-4 mr-2" />
                  {!isCollapsed && <span>{tool.label}</span>}
                </Button>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Análise Avançada */}
          <Collapsible open={isAvancadasOpen} onOpenChange={setIsAvancadasOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start"
                size="sm"
              >
                <ChevronDown className={cn("w-4 h-4 mr-2 transition-transform", !isAvancadasOpen && "-rotate-90")} />
                {!isCollapsed && (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    <span>Avançadas</span>
                  </>
                )}
                {isCollapsed && <Sparkles className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              <Button
                variant={activeTab === 'avancadas' ? 'secondary' : 'ghost'}
                className={cn(
                  "w-full justify-start",
                  activeTab === 'avancadas' && "bg-primary/10 text-primary font-medium"
                )}
                size="sm"
                onClick={() => handleToolChange('avancadas')}
                data-tool="avancadas"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {!isCollapsed && <span>Análises Avançadas</span>}
              </Button>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}

// Help Panel Component
function HelpPanel() {
  const { activeTab } = useTools();
  const [isOpen, setIsOpen] = useState(true);

  const helpContent: Record<string, { title: string; description: string }> = {
    wordlist: {
      title: 'Word List',
      description: 'Gera uma lista de todas as palavras do corpus com suas frequências absolutas e relativas, permitindo análise estatística do vocabulário.',
    },
    keywords: {
      title: 'Keywords',
      description: 'Compara dois corpora para identificar palavras estatisticamente mais frequentes em um corpus em relação ao outro, revelando características distintivas.',
    },
    kwic: {
      title: 'KWIC',
      description: 'Key Word in Context mostra todas as ocorrências de uma palavra com seu contexto à esquerda e à direita, facilitando análise de padrões de uso.',
    },
    dispersion: {
      title: 'Dispersão',
      description: 'Analisa a distribuição de uma palavra ao longo do corpus, identificando se ela aparece uniformemente ou em segmentos específicos.',
    },
    ngrams: {
      title: 'N-grams',
      description: 'Identifica sequências de 2, 3 ou mais palavras que aparecem frequentemente juntas, revelando colocações e padrões linguísticos.',
    },
    avancadas: {
      title: 'Análises Avançadas',
      description: 'Ferramentas especializadas para análises linguísticas profundas, incluindo estudos dialetais, temporais e morfossintáticos.',
    },
  };

  const content = helpContent[activeTab] || helpContent.wordlist;

  if (!isOpen) {
    return (
      <div className="p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="w-full"
        >
          <HelpCircle className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border-l bg-card">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <HelpCircle className="w-4 h-4" />
          Ajuda
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2">{content.title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {content.description}
            </p>
          </div>
          <div className="pt-4 border-t">
            <Button variant="link" size="sm" className="p-0 h-auto">
              Ver documentação completa →
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function TabToolsContent() {
  const { activeTab } = useTools();

  // Map tools to components
  const toolComponents: Record<string, React.ReactNode> = {
    wordlist: <WordlistTool />,
    keywords: <KeywordsTool />,
    kwic: <KWICTool />,
    dispersion: <DispersionTool />,
    ngrams: <NGramsTool />,
    avancadas: <AdvancedAnalysisTab />,
  };

  const ActiveTool = toolComponents[activeTab] || toolComponents.wordlist;

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-screen">
      {/* Left Sidebar - Fixed Width, Collapsible */}
      <ResizablePanel defaultSize={20} minSize={5} maxSize={25} className="min-w-[60px]">
        <ToolsSidebarMenu />
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Central Area - Flexible */}
      <ResizablePanel defaultSize={60} minSize={40}>
        <ScrollArea className="h-screen">
          <div className="p-6">
            <Card className="card-academic">
              <CardHeader>
                <CardTitle className="section-header-academic flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  Ferramentas de Estilística de Corpus
                </CardTitle>
                <CardDescription className="section-description-academic">
                  Análise linguística completa com ferramentas básicas e avançadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                  >
                    {ActiveTool}
                  </motion.div>
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Right Panel - Help, Collapsible */}
      <ResizablePanel defaultSize={20} minSize={5} maxSize={25}>
        <HelpPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export function TabTools() {
  return (
    <ToolsProvider>
      <div className="space-y-6">
        <TabToolsContent />
      </div>
    </ToolsProvider>
  );
}
