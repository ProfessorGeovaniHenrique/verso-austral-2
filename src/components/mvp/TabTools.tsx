import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, Sparkles, Database, HelpCircle, ChevronRight, ChevronDown, Menu } from "lucide-react";
import { ToolsProvider, useTools } from "@/contexts/ToolsContext";
import { AdvancedAnalysisTab } from "./tools/AdvancedAnalysisTab";
import { useAnalytics } from '@/hooks/useAnalytics';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";


// Sidebar Menu Component
function ToolsSidebarMenu({ 
  isCollapsed: externalIsCollapsed, 
  onNavigate 
}: { 
  isCollapsed: boolean;
  onNavigate?: () => void;
}) {
  const { activeTab, setActiveTab } = useTools();
  const { trackFeatureUsage } = useAnalytics();
  const [isBasicasOpen, setIsBasicasOpen] = useState(true);
  const [isAvancadasOpen, setIsAvancadasOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(externalIsCollapsed);


  const handleToolChange = (toolId: string) => {
    setActiveTab(toolId);
    trackFeatureUsage(toolId);
    onNavigate?.();
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
    avancadas: {
      title: 'Análises Avançadas',
      description: 'Ferramentas especializadas para análises linguísticas profundas, incluindo estudos dialetais, temporais e morfossintáticos.',
    },
  };

  const content = helpContent[activeTab] || helpContent.avancadas;

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
  const isMobile = useIsMobile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(!isMobile && typeof window !== 'undefined' && window.innerWidth < 1024);

  // Map tools to components
  const toolComponents: Record<string, React.ReactNode> = {
    avancadas: <AdvancedAnalysisTab />,
  };

  const ActiveTool = toolComponents[activeTab] || toolComponents.avancadas;

  if (isMobile) {
    return (
      <div className="flex flex-col h-full w-full">
        <Button 
          variant="ghost" 
          size="icon"
          className="fixed top-4 left-4 z-50 bg-background border shadow-md"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="w-80 p-0">
            <ScrollArea className="h-full">
              <ToolsSidebarMenu 
                isCollapsed={false}
                onNavigate={() => setIsMobileMenuOpen(false)} 
              />
            </ScrollArea>
          </SheetContent>
        </Sheet>

        <main className="flex-1 p-4 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {ActiveTool}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    );
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-screen">
      <ResizablePanel 
        defaultSize={typeof window !== 'undefined' && window.innerWidth < 1024 ? 8 : 20}
        minSize={5}
        maxSize={30}
        collapsible
        onCollapse={() => setIsCollapsed(true)}
        onExpand={() => setIsCollapsed(false)}
      >
        <ToolsSidebarMenu isCollapsed={isCollapsed} />
      </ResizablePanel>
      
      <ResizableHandle withHandle />
      
      <ResizablePanel defaultSize={80} minSize={30}>
        <ScrollArea className="h-screen">
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {ActiveTool}
              </motion.div>
            </AnimatePresence>
          </div>
        </ScrollArea>
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
