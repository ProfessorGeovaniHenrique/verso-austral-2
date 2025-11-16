import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { DemoModeBlocker } from "@/components/advanced/DemoModeBlocker";
import { TabLexicalProfile } from "@/components/advanced/TabLexicalProfile";
import { POSAnalysisTool } from "@/components/mvp/tools/POSAnalysisTool";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Network, Sparkles, Link2, FileBarChart, Layers } from "lucide-react";
import { MVPHeader } from "@/components/mvp/MVPHeader";
import { MVPFooter } from "@/components/mvp/MVPFooter";

export default function AdvancedMode() {
  const { advancedModeEnabled } = useFeatureAccess();

  if (!advancedModeEnabled) {
    return <DemoModeBlocker />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background" data-theme="academic">
      <MVPHeader />

      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Modo Avançado</h1>
          <p className="text-lg text-muted-foreground">
            Análise Estilística baseada em Leech & Short (2007)
          </p>
        </div>

        <Tabs defaultValue="lexical" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="lexical" className="gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Perfil Léxico</span>
            </TabsTrigger>
            <TabsTrigger value="pos" className="gap-2">
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">POS Tagging</span>
            </TabsTrigger>
            <TabsTrigger value="syntactic" className="gap-2" disabled>
              <Network className="w-4 h-4" />
              <span className="hidden sm:inline">Perfil Sintático</span>
            </TabsTrigger>
            <TabsTrigger value="rhetorical" className="gap-2" disabled>
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Figuras de Linguagem</span>
            </TabsTrigger>
            <TabsTrigger value="cohesion" className="gap-2" disabled>
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">Coesão Textual</span>
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-2" disabled>
              <FileBarChart className="w-4 h-4" />
              <span className="hidden sm:inline">Relatório</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lexical">
            <TabLexicalProfile />
          </TabsContent>

          <TabsContent value="pos">
            <POSAnalysisTool />
          </TabsContent>

          <TabsContent value="syntactic">
            <div className="text-center py-12">
              <Network className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Perfil Sintático</h3>
              <p className="text-muted-foreground">Em desenvolvimento</p>
            </div>
          </TabsContent>

          <TabsContent value="rhetorical">
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Figuras de Linguagem</h3>
              <p className="text-muted-foreground">Em desenvolvimento</p>
            </div>
          </TabsContent>

          <TabsContent value="cohesion">
            <div className="text-center py-12">
              <Link2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Coesão Textual</h3>
              <p className="text-muted-foreground">Em desenvolvimento</p>
            </div>
          </TabsContent>

          <TabsContent value="report">
            <div className="text-center py-12">
              <FileBarChart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Relatório Completo</h3>
              <p className="text-muted-foreground">Em desenvolvimento</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <MVPFooter />
    </div>
  );
}
