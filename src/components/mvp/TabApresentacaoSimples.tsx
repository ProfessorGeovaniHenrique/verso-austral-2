import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Music, BookOpen, BrainCircuit } from "lucide-react";
import { TabAprendizadoChamamé } from "./TabAprendizadoChamamé";
import { TabOrigensChamamé } from "./TabOrigensChamamé";
import { TabInstrumentosChamamé } from "./TabInstrumentosChamamé";
import { QuizModal } from "./QuizModal";
import { QuizProvider, useQuizContext } from "@/contexts/QuizContext";

function TabApresentacaoSimplesContent() {
  const { openQuiz, quizState } = useQuizContext();

  return (
    <>
      <Tabs defaultValue="introducao" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="introducao">Introdução</TabsTrigger>
          <TabsTrigger value="aprendizado">Aprendizado</TabsTrigger>
          <TabsTrigger value="origens">Origens</TabsTrigger>
          <TabsTrigger value="instrumentos">Instrumentos</TabsTrigger>
          <TabsTrigger value="quiz" className="bg-primary/10">
            <BrainCircuit className="h-4 w-4 mr-2" />
            Quiz
          </TabsTrigger>
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

        {/* Letra da música + Player + Glossário */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="card-academic h-full">
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

          <div className="space-y-6">
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

            {/* Glossário do Verso - Lateral com scroll */}
            <Card className="border-primary/20 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Glossário do Verso
                </CardTitle>
                <CardDescription className="text-xs">
                  Termos regionais da canção
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[500px] overflow-y-auto pr-2 space-y-2 text-sm">
                  <div><strong>Tarumã:</strong> Árvore nativa do Sul com sombra generosa</div>
                  <div><strong>Coxilha:</strong> Elevação suave do pampa gaúcho</div>
                  <div><strong>Várzea:</strong> Planície alagadiça às margens de rios</div>
                  <div><strong>Gateado/gateada:</strong> Cavalo com pelagem amarelada e listras escuras</div>
                  <div><strong>Arreios:</strong> Equipamentos para montar o cavalo</div>
                  <div><strong>Lombo:</strong> Dorso do cavalo onde vai a sela</div>
                  <div><strong>Encilhar/Desencilhar:</strong> Colocar/retirar sela e arreios</div>
                  <div><strong>Tropa:</strong> Grupo de cavalos ou bois</div>
                  <div><strong>Maragato:</strong> Gaúcho ligado às tradições federalistas</div>
                  <div><strong>Pañuelo:</strong> Lenço tradicional, símbolo político/cultural</div>
                  <div><strong>Querência:</strong> Lugar de origem; onde o coração pertence</div>
                  <div><strong>Galpão:</strong> Construção típica da estância</div>
                  <div><strong>Prenda:</strong> Mulher gaúcha, companheira</div>
                  <div><strong>Ramada:</strong> Estrutura coberta de galhos</div>
                  <div><strong>Cancela:</strong> Porteira de madeira</div>
                  <div><strong>Cuia:</strong> Recipiente de porongo para chimarrão</div>
                  <div><strong>Bomba:</strong> Canudo de metal com filtro</div>
                  <div><strong>Cevou um mate:</strong> Preparou o chimarrão</div>
                  <div><strong>Pura-folha:</strong> Erva-mate de qualidade, sem palitos</div>
                  <div><strong>Jujado:</strong> Temperado, preparado com cuidado</div>
                  <div><strong>Redomona:</strong> Cavalo não domado; algo rebelde</div>
                  <div><strong>Templado:</strong> Afinado, em temperatura ideal</div>
                  <div><strong>Açoite:</strong> Chicote; algo que atinge com força</div>
                  <div><strong>Lonjuras:</strong> Distâncias, lugares longínquos</div>
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

        <TabsContent value="quiz" className="space-y-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <BrainCircuit className="h-6 w-6 text-primary" />
                Quiz de Consolidação
              </CardTitle>
              <CardDescription>
                Teste seus conhecimentos sobre o Chamamé, origens culturais e instrumentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground leading-relaxed">
                  Este quiz foi criado para consolidar as aprendizagens das abas anteriores. 
                  Você receberá <strong>5 perguntas aleatórias</strong> com níveis de dificuldade variados 
                  (fácil, médio e difícil), selecionadas de um banco de 30 perguntas que cobrem todo o conteúdo estudado.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg mt-4">
                  <h4 className="font-semibold mb-2">💡 Tipos de Perguntas:</h4>
                  <ul className="space-y-1 text-sm">
                    <li><strong>Objetivas:</strong> Escolha a resposta correta</li>
                    <li><strong>Múltipla escolha:</strong> Selecione todas as opções corretas</li>
                    <li><strong>Ligue pontos:</strong> Relacione termos com suas definições</li>
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  <strong>Dica:</strong> Você pode voltar às abas anteriores para revisar o conteúdo 
                  antes ou durante o quiz. Seu progresso será salvo!
                </p>
              </div>

              <Button onClick={openQuiz} size="lg" className="w-full mt-6">
                <BrainCircuit className="h-5 w-5 mr-2" />
                {quizState && !quizState.isComplete ? "🔄 Retomar Quiz" : "🎯 Iniciar Quiz"}
              </Button>
            </CardContent>
          </Card>

          <Alert>
            <Music className="h-4 w-4" />
            <AlertTitle>Sobre o Quiz</AlertTitle>
            <AlertDescription>
              As perguntas foram criadas com base nas referências acadêmicas citadas nas abas anteriores: 
              Wolffenbüttel (2020) sobre música gaúcha, Brittes (2021) sobre origens do chamamé, 
              e Silva (2010) sobre o acordeão na cultura gaúcha.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      <QuizModal />
    </>
  );
}

export function TabApresentacaoSimples() {
  return (
    <QuizProvider>
      <TabApresentacaoSimplesContent />
    </QuizProvider>
  );
}
