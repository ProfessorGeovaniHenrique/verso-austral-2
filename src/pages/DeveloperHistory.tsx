import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminBreadcrumb } from "@/components/AdminBreadcrumb";
import { PhaseTimeline } from "@/components/dev-history/PhaseTimeline";
import { ScientificEvolution } from "@/components/dev-history/ScientificEvolution";
import { CorrectionsTable } from "@/components/dev-history/CorrectionsTable";
import { ProjectStats } from "@/components/dev-history/ProjectStats";
import { UpdateStatusButton } from "@/components/dev-history/UpdateStatusButton";
import { ProductRoadmap } from "@/components/dev-history/ProductRoadmap";
import { ExportMenu } from "@/components/dev-history/ExportMenu";
import { MilestoneProgress } from "@/components/dev-history/MilestoneProgress";
import { VelocityChart } from "@/components/dev-history/VelocityChart";
import { SearchBar } from "@/components/dev-history/SearchBar";
import type { SearchResult } from "@/hooks/useDevHistorySearch";

export default function DeveloperHistory() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("timeline");

  const handleSearchResultClick = (result: SearchResult) => {
    // Navegar para a aba correta baseado no tipo
    switch (result.type) {
      case 'epic':
      case 'story':
        setActiveTab('roadmap');
        break;
      case 'decision':
      case 'phase':
        setActiveTab('timeline');
        break;
    }
    
    // Scroll suave para o elemento
    setTimeout(() => {
      const element = document.getElementById(result.id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight-search-result');
        setTimeout(() => element.classList.remove('highlight-search-result'), 2000);
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <AdminBreadcrumb currentPage="Developer History" />
            <h1 className="text-3xl font-bold tracking-tight">Developer History</h1>
            <p className="text-muted-foreground">
              Registro histórico completo do desenvolvimento da ferramenta
            </p>
            
            {/* Search Bar */}
            <div className="pt-4">
              <SearchBar onResultClick={handleSearchResultClick} />
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <UpdateStatusButton />
            <ExportMenu />
            <Button variant="ghost" onClick={() => navigate("/admin/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <ProjectStats />

        {/* Milestone Progress */}
        <MilestoneProgress variant="detailed" />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="timeline">Timeline de Construção</TabsTrigger>
            <TabsTrigger value="velocity">Velocidade</TabsTrigger>
            <TabsTrigger value="scientific">Evolução Científica</TabsTrigger>
            <TabsTrigger value="corrections">Correções Críticas</TabsTrigger>
            <TabsTrigger value="methodologies">Metodologias</TabsTrigger>
            <TabsTrigger value="roadmap">Roadmap & MVP</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-4 mt-6">
            <PhaseTimeline />
          </TabsContent>

          <TabsContent value="velocity" className="space-y-4 mt-6">
            <VelocityChart />
          </TabsContent>

          <TabsContent value="scientific" className="space-y-4 mt-6">
            <ScientificEvolution />
          </TabsContent>

          <TabsContent value="corrections" className="space-y-4 mt-6">
            <CorrectionsTable />
          </TabsContent>

          <TabsContent value="methodologies" className="space-y-4 mt-6">
            <div className="grid gap-4">
              <ScientificEvolution showMethodologies />
            </div>
          </TabsContent>

          <TabsContent value="roadmap" className="space-y-4 mt-6">
            <ProductRoadmap />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
