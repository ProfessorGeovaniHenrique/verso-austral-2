import { MVPHeader } from "@/components/mvp/MVPHeader";
import { MVPFooter } from "@/components/mvp/MVPFooter";
import { TabCorpus } from "@/components/mvp/TabCorpus";
import { TabTools } from "@/components/mvp/TabTools";
import { TabDomains } from "@/components/mvp/TabDomains";
import { TabStatistics } from "@/components/mvp/TabStatistics";
import { TabGalaxy } from "@/components/mvp/TabGalaxy";
import { TabValidation } from "@/components/mvp/TabValidation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Wrench, Database, BarChart3, Sparkles, FlaskConical } from "lucide-react";

export default function DashboardMVP() {
  return (
    <div className="min-h-screen bg-background" data-theme="academic">
      <MVPHeader />

      <main className="container-academic py-8">
        <Tabs defaultValue="corpus" className="space-y-6">
          <TabsList className="tabs-academic grid w-full max-w-5xl mx-auto grid-cols-6">
            <TabsTrigger value="corpus" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Corpus</span>
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">Ferramentas</span>
            </TabsTrigger>
            <TabsTrigger value="domains" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Domínios</span>
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Estatística</span>
            </TabsTrigger>
            <TabsTrigger value="galaxy" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Nuvem</span>
            </TabsTrigger>
            <TabsTrigger value="validation" className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              <span className="hidden sm:inline">Testes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="corpus">
            <TabCorpus />
          </TabsContent>

          <TabsContent value="tools">
            <TabTools />
          </TabsContent>

          <TabsContent value="domains">
            <TabDomains />
          </TabsContent>

          <TabsContent value="statistics">
            <TabStatistics />
          </TabsContent>

          <TabsContent value="galaxy">
            <TabGalaxy />
          </TabsContent>

          <TabsContent value="validation">
            <TabValidation />
          </TabsContent>
        </Tabs>
      </main>

      <MVPFooter />
    </div>
  );
}
