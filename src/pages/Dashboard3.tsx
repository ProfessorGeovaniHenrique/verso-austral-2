import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GalaxyVisualization } from "@/components/v3/GalaxyVisualization";

export default function Dashboard3() {
  const [activeTab, setActiveTab] = useState("galaxy");

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-[1600px]">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
          Análise de Domínios Semânticos
        </h1>
        <p className="text-muted-foreground">
          Visualização orbital interativa - Arquitetura otimizada v3
        </p>
      </header>

      {/* Tabs de Navegação */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="galaxy" className="flex items-center gap-2">
            <span>🌌</span>
            <span>Galáxia</span>
          </TabsTrigger>
          <TabsTrigger value="network" className="flex items-center gap-2">
            <span>🕸️</span>
            <span>Rede</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <span>📊</span>
            <span>Estatísticas</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Galáxia */}
        <TabsContent value="galaxy" className="mt-6">
          <Card className="border-cyan-500/30">
            <CardHeader>
              <CardTitle>Visualização Orbital de Domínios</CardTitle>
              <CardDescription>
                Explore os domínios semânticos e suas palavras em um sistema orbital interativo
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <GalaxyVisualization />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Rede */}
        <TabsContent value="network" className="mt-6">
          <Card className="border-cyan-500/30">
            <CardHeader>
              <CardTitle>Rede Semântica</CardTitle>
              <CardDescription>
                Visualização de rede com conexões entre palavras e domínios
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[600px] flex items-center justify-center border border-dashed border-muted-foreground/30 rounded-lg">
                <p className="text-muted-foreground">Em desenvolvimento - Fase 6</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Estatísticas */}
        <TabsContent value="stats" className="mt-6">
          <Card className="border-cyan-500/30">
            <CardHeader>
              <CardTitle>Análise Estatística</CardTitle>
              <CardDescription>
                Frequências, distribuições e métricas dos domínios semânticos
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[600px] flex items-center justify-center border border-dashed border-muted-foreground/30 rounded-lg">
                <p className="text-muted-foreground">Em desenvolvimento - Fase 7</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
