import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sparkles, Database, BarChart3, FileText, Music, Play } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TabDomains } from "./TabDomains";
import { TabStatistics } from "./TabStatistics";
import { TabGalaxy } from "./TabGalaxy";
import { useApresentacaoTour } from "@/hooks/useApresentacaoTour";

export function TabApresentacao() {
  const [currentTab, setCurrentTab] = useState("intro");
  const { startTour } = useApresentacaoTour({ autoStart: true });

  return (
    <Card className="card-academic">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="section-header-academic flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Apresentação da Ferramenta
            </CardTitle>
            <CardDescription className="section-description-academic">
              Demonstração completa das capacidades de análise estilística do VersoAustral
            </CardDescription>
          </div>
          <Button onClick={startTour} variant="outline" size="sm">
            <Play className="h-4 w-4 mr-2" />
            Iniciar Tour Guiado
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="intro" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Introdução</span>
            </TabsTrigger>
            <TabsTrigger value="dominios" className="flex items-center gap-2" data-tour="tab-dominios">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Domínios</span>
            </TabsTrigger>
            <TabsTrigger value="estatisticas" className="flex items-center gap-2" data-tour="tab-estatisticas">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Estatísticas</span>
            </TabsTrigger>
            <TabsTrigger value="nuvem" className="flex items-center gap-2" data-tour="tab-nuvem">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Nuvem</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="intro" className="space-y-6 mt-6">
            {/* Texto introdutório */}
            <div className="prose prose-sm max-w-none">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Quando o Verso Vem pras Casa: O Portal de Entrada</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                A escolha da canção <strong>"Quando o Verso Vem pras Casa"</strong> parte de um profundo vínculo afetivo do pesquisador. 
                Por ter sido a primeira música gaúcha que ouviu, ela despertou o fascínio por um universo linguístico percebido como 
                quase estrangeiro. Essa curiosidade inicial, aliada à jornada acadêmica que o conduziu à UFRGS e à sua orientadora, 
                amadureceu o desejo de não apenas fruir, mas de compreender profundamente essa riqueza cultural.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Dessa confluência de afetos e investigações, nasce o <strong>VersoAustral</strong>.
              </p>
            </div>

            <Alert className="bg-primary/5 border-primary/20">
              <Music className="h-4 w-4" />
              <AlertTitle>O que você verá nas abas seguintes</AlertTitle>
              <AlertDescription className="space-y-2 mt-2">
                <p><strong>Domínios:</strong> Distribuição temática comparativa entre o corpus gaúcho e corpus de referência nordestino</p>
                <p><strong>Estatísticas:</strong> Métricas de keyness (Log-Likelihood e Mutual Information) revelando palavras-chave características</p>
                <p><strong>Nuvem:</strong> Visualização semântica interativa dos domínios predominantes</p>
              </AlertDescription>
            </Alert>

            {/* Letra da música + Player */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2" data-tour="letra-musica">
                <Card className="card-academic">
                  <CardHeader>
                    <CardTitle className="text-lg">Letra da Música</CardTitle>
                    <CardDescription>Luiz Marenco - Quando o verso vem pras casa</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-line text-sm text-foreground leading-relaxed">
                      {`A calma do tarumã, ganhou sombra mais copada
Pela várzea espichada com o sol da tarde caindo
Um pañuelo maragato se abriu no horizonte
Trazendo um novo reponte, prá um fim de tarde bem lindo

Daí um verso de campo se chegou da campereada
No lombo de uma gateada frente aberta de respeito
Desencilhou na ramada, já cansado das lonjuras
Mas estampando a figura, campeira, bem do seu jeito

Cevou um mate pura-folha, jujado de maçanilha
E um ventito da coxilha trouxe coplas entre as asas
Prá querência galponeira, onde o verso é mais caseiro
Templado a luz de candeeiro e um "quarto gordo nas brasa"

A mansidão da campanha traz saudades feito açoite
Com os olhos negros de noite que ela mesmo aquerenciou
E o verso que tinha sonhos prá rondar na madrugada
Deixou a cancela encostada e a tropa se desgarrou

E o verso sonhou ser várzea com sombra de tarumã
Ser um galo prás manhãs, ou um gateado prá encilha
Sonhou com os olhos da prenda vestidos de primavera
Adormecidos na espera do sol pontear na coxilha

Ficaram arreios suados e o silencio de esporas
Um cerne com cor de aurora queimando em fogo de chão
Uma cuia e uma bomba recostada na cambona
E uma saudade redomona pelos cantos do galpão`}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div data-tour="music-player">
                <Card className="card-academic">
                  <CardHeader>
                    <CardTitle className="text-base">Ouça a canção</CardTitle>
                    <CardDescription>Player integrado do YouTube</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video rounded-lg overflow-hidden border border-border shadow-sm">
                      <iframe 
                        width="100%" 
                        height="100%" 
                        src="https://www.youtube.com/embed/uaRc4k-Rxpo" 
                        title="Quando o verso vem pras casa - Luiz Marenco" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowFullScreen 
                        className="w-full h-full"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dominios" className="mt-6">
            <TabDomains demo={true} />
          </TabsContent>

          <TabsContent value="estatisticas" className="mt-6">
            <TabStatistics demo={true} />
          </TabsContent>

          <TabsContent value="nuvem" className="mt-6">
            <TabGalaxy demo={true} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
