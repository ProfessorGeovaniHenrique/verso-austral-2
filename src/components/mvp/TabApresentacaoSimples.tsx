import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabAprendizadoChamamé } from "./TabAprendizadoChamamé";
import { TabOrigensChamamé } from "./TabOrigensChamamé";

export function TabApresentacaoSimples() {
  return (
    <Tabs defaultValue="introducao" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="introducao">Introdução</TabsTrigger>
        <TabsTrigger value="aprendizado">Aprendizado</TabsTrigger>
        <TabsTrigger value="origens">Origens</TabsTrigger>
      </TabsList>

      <TabsContent value="introducao">
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-6 md:p-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-4">
                  Bem-vindo ao Verso Austral
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Uma plataforma acadêmica para análise estilística e semântica da música gaúcha.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold">O que você pode fazer aqui?</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Explorar análises semânticas profundas do corpus de música gaúcha</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Visualizar domínios semânticos e suas relações através de gráficos interativos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Comparar padrões linguísticos entre diferentes artistas e gêneros</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Acessar ferramentas avançadas de análise estilística baseadas em corpus</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  Este projeto foi desenvolvido com rigor metodológico e fundamentação científica, 
                  integrando linguística de corpus, análise semântica e estudos culturais.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="aprendizado">
        <TabAprendizadoChamamé />
      </TabsContent>

      <TabsContent value="origens">
        <TabOrigensChamamé />
      </TabsContent>
    </Tabs>
  );
}
