import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Music } from "lucide-react";
import { TabAprendizadoChamamé } from "./TabAprendizadoChamamé";
import { TabOrigensChamamé } from "./TabOrigensChamamé";
import { TabInstrumentosChamamé } from "./TabInstrumentosChamamé";

export function TabApresentacaoSimples() {
  return (
    <Tabs defaultValue="introducao" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-6">
        <TabsTrigger value="introducao">Introdução</TabsTrigger>
        <TabsTrigger value="aprendizado">Aprendizado</TabsTrigger>
        <TabsTrigger value="origens">Origens</TabsTrigger>
        <TabsTrigger value="instrumentos">Instrumentos</TabsTrigger>
      </TabsList>

      <TabsContent value="introducao" className="space-y-6">
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
          <div className="lg:col-span-2">
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

          <div>
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

      <TabsContent value="aprendizado">
        <TabAprendizadoChamamé />
      </TabsContent>

        <TabsContent value="origens">
          <TabOrigensChamamé />
        </TabsContent>

        <TabsContent value="instrumentos">
          <TabInstrumentosChamamé />
        </TabsContent>
      </Tabs>
  );
}
