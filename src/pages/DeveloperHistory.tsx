import { useState } from "react";
import { ArrowLeft, Shield } from "lucide-react";
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
import { SyncStatusDashboard } from "@/components/dev-history/SyncStatusDashboard";
import { ToolsMethodologies } from "@/components/dev-history/ToolsMethodologies";
import { USASMethodologyViewer } from "@/components/dev-history/USASMethodologyViewer";
import { StylisticsMethodologyViewer } from "@/components/dev-history/StylisticsMethodologyViewer";
import { AuditsTab } from "@/components/dev-history/AuditsTab";
import type { SearchResult } from "@/hooks/useDevHistorySearch";

export default function DeveloperHistory() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("timeline");
  const [editMode, setEditMode] = useState(false);

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
      case 'audit':
      case 'finding':
        setActiveTab('audits');
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
            <Button 
              variant={editMode ? "default" : "outline"}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? "Sair do Modo Edição" : "Modo Edição"}
            </Button>
            <UpdateStatusButton />
            <ExportMenu />
            <Button variant="ghost" onClick={() => navigate("/admin/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        {/* Sync Status Dashboard */}
        <SyncStatusDashboard />

        {/* Quick Stats */}
        <ProjectStats />

        {/* Milestone Progress */}
        <MilestoneProgress variant="detailed" />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="velocity">Velocidade</TabsTrigger>
            <TabsTrigger value="scientific">Evolução</TabsTrigger>
            <TabsTrigger value="corrections">Correções</TabsTrigger>
            <TabsTrigger value="methodologies">Metodologias</TabsTrigger>
            <TabsTrigger value="tools">Ferramentas</TabsTrigger>
            <TabsTrigger value="audits" className="gap-1">
              <Shield className="h-3.5 w-3.5" />
              Auditorias
            </TabsTrigger>
            <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-4 mt-6">
            <PhaseTimeline editMode={editMode} />
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
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">Metodologias Gerais</TabsTrigger>
                <TabsTrigger value="usas">Pipeline USAS</TabsTrigger>
                <TabsTrigger value="stylistics">Ferramentas de Estilística</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="mt-4">
                <ScientificEvolution showMethodologies />
              </TabsContent>
              
              <TabsContent value="usas" className="mt-4">
                <USASMethodologyViewer />
              </TabsContent>
              
              <TabsContent value="stylistics" className="mt-4">
                <StylisticsMethodologyViewer />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4 mt-6">
            <ToolsMethodologies />
          </TabsContent>

          <TabsContent value="audits" className="space-y-4 mt-6">
            <AuditsTab />
          </TabsContent>

          <TabsContent value="roadmap" className="space-y-4 mt-6">
            <ProductRoadmap />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
