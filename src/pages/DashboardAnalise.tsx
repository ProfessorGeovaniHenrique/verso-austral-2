import { MVPHeader } from "@/components/mvp/MVPHeader";
import { MVPFooter } from "@/components/mvp/MVPFooter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Activity, BarChart3, Network, Target, ArrowLeft } from "lucide-react";
import { TabProcessamento } from "@/components/mvp/TabProcessamento";
import { Link } from "react-router-dom";
import { DashboardAnaliseProvider } from "@/contexts/DashboardAnaliseContext";

export default function DashboardAnalise() {
  const [activeTab, setActiveTab] = useState('processamento');

  // Persistir aba ativa no localStorage
  useEffect(() => {
    const savedTab = localStorage.getItem('dashboard_analise_active_tab');
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dashboard_analise_active_tab', activeTab);
  }, [activeTab]);

  return (
    <DashboardAnaliseProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <MVPHeader />
        
        <main className="container-academic py-4 md:py-8 mt-[180px]">
          {/* Botão de Retorno */}
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Link to="/dashboard-mvp-definitivo">
                <ArrowLeft className="h-4 w-4" />
                Retornar à Página Principal
              </Link>
            </Button>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Análise Semântica Científica</h1>
            <p className="text-muted-foreground">
              Explore a análise linguística computacional de "Quando o verso vem pras casa"
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="processamento" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Processamento</span>
            </TabsTrigger>
            <TabsTrigger value="dominios" className="gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Domínios</span>
            </TabsTrigger>
            <TabsTrigger value="estatisticas" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Estatísticas</span>
            </TabsTrigger>
            <TabsTrigger value="visualizacoes" className="gap-2">
              <Network className="h-4 w-4" />
              <span className="hidden sm:inline">Visualizações</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="processamento" className="space-y-4">
            <TabProcessamento />
          </TabsContent>

          <TabsContent value="dominios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Domínios Semânticos</CardTitle>
                <CardDescription>
                  Explore os domínios semânticos identificados na letra
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Análise de domínios semânticos será implementada aqui...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="estatisticas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas Linguísticas</CardTitle>
                <CardDescription>
                  Métricas quantitativas sobre o texto analisado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Estatísticas detalhadas serão implementadas aqui...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visualizacoes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Visualizações Científicas</CardTitle>
                <CardDescription>
                  Representações visuais dos dados linguísticos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Visualizações interativas serão implementadas aqui...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      <MVPFooter />
    </div>
    </DashboardAnaliseProvider>
  );
}
