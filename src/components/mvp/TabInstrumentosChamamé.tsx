import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Music, BrainCircuit, RotateCcw } from "lucide-react";

interface TabInstrumentosChamaméProps {
  onUnlockFinal?: () => void;
  showUnlockButton?: boolean;
}

export function TabInstrumentosChamamé({ onUnlockFinal, showUnlockButton }: TabInstrumentosChamaméProps) {
  return (
    <Tabs defaultValue="violao" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="violao">🎸 Violão</TabsTrigger>
        <TabsTrigger value="acordeon">🪗 Acordeão</TabsTrigger>
      </TabsList>

      {/* Tab Violão */}
      <TabsContent value="violao" className="space-y-8">
        {/* Card Introdutório */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="border-primary/30 bg-gradient-to-br from-background to-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Music className="w-6 h-6 text-primary" />
                O Violão no Chamamé
              </CardTitle>
              <CardDescription className="text-base">
                O instrumento sagrado que carrega a alma do Chamamé
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground/90 leading-relaxed">
                No universo do Chamamé, o violão não é apenas um instrumento musical — ele é o principal 
                portador de uma função ritual sagrada que atravessa séculos. Sua origem remonta às práticas 
                espirituais dos povos Guarani, e sua execução mantém viva uma tradição que conecta o mundo 
                físico ao mundo espiritual.
              </p>
              <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
                "O violão é o principal instrumento no gênero pois carrega a função de Rito Sagrado"
                <footer className="text-sm mt-2">— Alejandro Brittes</footer>
              </blockquote>
            </CardContent>
          </Card>
        </motion.div>

        {/* A Origem Guarani do Mbaracá */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl">A Origem Guarani do Mbaracá</CardTitle>
              <CardDescription>O violão rústico pré-hispânico</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground/90 leading-relaxed">
                Segundo a tese de <strong>Juan Natalício González</strong> (1948), antes da chegada dos 
                europeus, os Guarani já possuíam um instrumento chamado <strong>Mbaracá</strong> — um 
                violão rústico feito de abóbora ou moranga, que produzia sons semelhantes aos do violão 
                que conhecemos hoje.
              </p>
              <p className="text-foreground/90 leading-relaxed">
                Com a chegada dos Jesuítas nas Missões, o violão europeu foi incorporado à cultura 
                guarani, mas <strong>mantendo sua função ritual originária</strong>. Não foi uma simples 
                substituição de instrumentos — foi uma fusão que preservou o significado espiritual do 
                Mbaracá ancestral.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* O Toque de Tupã */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl">O Toque de Tupã</CardTitle>
              <CardDescription>As duas formas sagradas de execução</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground/90 leading-relaxed">
                O Mbaracá possuía <strong>duas formas distintas de execução</strong>, cada uma com sua 
                função espiritual:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h4 className="font-semibold text-primary mb-2">Som Metálico</h4>
                  <p className="text-sm text-foreground/80">
                    Tocado perto do cavalete, usando a unha do polegar. Um som brilhante e penetrante 
                    que evocava a força dos trovões de Tupã.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h4 className="font-semibold text-primary mb-2">Som Aveludado</h4>
                  <p className="text-sm text-foreground/80">
                    Tocado perto da boca do instrumento, com a gema do polegar. Um som suave e envolvente, 
                    semelhante ao rasguido que conhecemos hoje no Chamamé.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Vídeo Explicativo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader>
              <CardTitle className="text-xl">Como se toca Chamamé no Violão</CardTitle>
              <CardDescription>
                Assista ao vídeo explicativo sobre a técnica do rasguear chamamecero
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden shadow-lg">
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src="https://www.youtube.com/embed/_o4Yba41LTc"
                  title="Como se toca Chamamé no Violão"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Referência do Vídeo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          <Card className="border-border/50 bg-muted/20">
            <CardHeader>
              <CardTitle className="text-base">Referência do Vídeo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground font-mono leading-relaxed">
                PANCHI DUARTE OFICIAL. <strong>Cómo tocar Chamamé - Panchi Duarte</strong>. 
                [S.l.]: YouTube, 15 jan. 2021. 1 vídeo (2:42 min). Disponível em: https://www.youtube.com/watch?v=_o4Yba41LTc. 
                Acesso em: 28 nov. 2025.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* O Rasguear Chamamecero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl">O Rasguear Chamamecero</CardTitle>
              <CardDescription>A técnica modelada por Nicolas Antonio Niz</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground/90 leading-relaxed">
                <strong>Nicolas Antonio Niz</strong> foi o responsável por modelar a forma moderna do 
                rasguear no Chamamé. Ao contrário do dedilhar (onde as notas são tocadas individualmente), 
                o rasguear é uma técnica percussiva que ataca múltiplas cordas simultaneamente.
              </p>
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <h4 className="font-semibold mb-2">A Divisão das Cordas</h4>
                <ul className="space-y-2 text-sm text-foreground/80">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span><strong>Bordonas (cordas graves):</strong> Marcam os tempos fortes do compasso, 
                    criando a base rítmica</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span><strong>Primas (cordas agudas):</strong> Marcam o tempo débil, adicionando 
                    textura e movimento</span>
                  </li>
                </ul>
              </div>
              <p className="text-foreground/90 leading-relaxed">
                Esta técnica confere ao violão uma <strong>função percussiva</strong> essencial no 
                Chamamé, transformando-o em um instrumento que simultaneamente cria melodia, harmonia 
                e ritmo.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* O Violão como Rito Sagrado */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Card className="border-primary/30 bg-gradient-to-br from-background to-primary/5">
            <CardHeader>
              <CardTitle className="text-xl">O Violão como Rito Sagrado</CardTitle>
              <CardDescription>Da Opy Guarani à cultura popular</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground/90 leading-relaxed">
                O rasguear chamamecero mantém uma <strong>função cognitiva de concentração e transe</strong>, 
                herdada diretamente das práticas espirituais guarani. Como um mantra, a repetição rítmica 
                do violão induz um estado alterado de consciência.
              </p>
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <h4 className="font-semibold text-primary mb-2">O Fá como Tonalidade de Transe (CT)</h4>
                <p className="text-sm text-foreground/80">
                  A tonalidade de <strong>Fá maior</strong> é frequentemente utilizada no Chamamé por 
                  sua capacidade de facilitar o estado de transe. Esta não é uma escolha casual — é 
                  uma herança direta das práticas rituais na Opy (casa de reza guarani).
                </p>
              </div>
              <p className="text-foreground/90 leading-relaxed">
                Ao tocar Chamamé, o violonista não está apenas fazendo música — está perpetuando um 
                <strong>rito sagrado</strong> que conecta gerações, atravessa culturas e mantém viva 
                a espiritualidade guarani no coração da cultura popular do sul da América Latina.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Referência Bibliográfica */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Referência Bibliográfica</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground font-mono leading-relaxed">
                BRITTES, Alejandro. <strong>A origem do Chamamé: Uma história para ser contada</strong>. 
                Simplíssimo, 2021. pp. 165-173.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </TabsContent>

      {/* Tab Acordeão */}
      <TabsContent value="acordeon" className="space-y-8">
        {/* Card Introdutório */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="border-primary/30 bg-gradient-to-br from-background to-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Music className="h-6 w-6 text-primary" />
                O Acordeão na Cultura Gaúcha
              </CardTitle>
              <CardDescription className="text-base">
                A gaita: voz marcante da identidade musical do Sul
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground/90 leading-relaxed">
                Junto ao violão, o acordeão é <strong>o instrumento mais importante na cultura gaúcha</strong>, 
                sendo talvez aquele que melhor representa essa identidade cultural pelo seu timbre marcante e inconfundível.
              </p>
              <p className="text-muted-foreground">
                Carinhosamente chamado de <strong>"gaita"</strong> ou <strong>"cordeona"</strong> pelos gaúchos, 
                o acordeão tornou-se símbolo sonoro indissociável da música tradicionalista e do Chamamé.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Como Funciona o Acordeão */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl">Como Funciona o Acordeão</CardTitle>
              <CardDescription>Um conjunto musical completo nas mãos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground/90 leading-relaxed">
                O acordeão possui uma <strong>estrutura tripartida fascinante</strong>:
              </p>
              <ul className="space-y-3 ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-1">•</span>
                  <span className="text-foreground/90"><strong>Teclado (mão direita):</strong> executa a melodia principal</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-1">•</span>
                  <span className="text-foreground/90"><strong>Botões/Baixos (mão esquerda):</strong> realiza o ritmo e a harmonia</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-1">•</span>
                  <span className="text-foreground/90"><strong>Fole (centro):</strong> funciona como os pulmões do instrumento</span>
                </li>
              </ul>
              <Alert className="bg-primary/5 border-primary/30">
                <AlertDescription>
                  <strong>Imagine:</strong> é como ter um pequeno conjunto musical completo nas mãos! 
                  O acordeonista executa simultaneamente melodia, ritmo E harmonia — algo único entre os instrumentos tradicionais.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </motion.div>

        {/* As Primeiras Gaitas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl">As Primeiras Gaitas</CardTitle>
              <CardDescription>Como o instrumento moldou o estilo musical gaúcho</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground/90 leading-relaxed">
                As primeiras gaitas utilizadas no Sul eram <strong>acordeões de botão singelos</strong>, 
                com apenas 2, 4 ou 8 baixos. Esses instrumentos possuíam teclado diatônico (apenas notas de uma tonalidade maior), 
                o que limitava as possibilidades harmônicas.
              </p>
              <Alert className="border-primary/30 bg-primary/5">
                <AlertDescription>
                  <strong>Insight histórico:</strong> Essa limitação técnica das primeiras gaitas não foi uma barreira, 
                  mas sim <em>moldou as características</em> da música gaúcha! A simplicidade harmônica tornou-se 
                  uma marca estilística do gênero.
                </AlertDescription>
              </Alert>
              <p className="text-muted-foreground text-sm">
                O instrumento ajudou a definir o som, e o som definiu a identidade musical gaúcha.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Vídeo Embebido */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader>
              <CardTitle className="text-xl">O Acordeão no Chamamé</CardTitle>
              <CardDescription>
                Assista a uma demonstração da execução do acordeão no estilo Chamamé
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden shadow-lg">
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src="https://www.youtube.com/embed/-Dzt3pKFmMA"
                  title="O Acordeão no Chamamé"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Referência do Vídeo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          <Card className="border-border/50 bg-muted/20">
            <CardHeader>
              <CardTitle className="text-base">Referência do Vídeo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground font-mono leading-relaxed">
                JUNINHO KROTH. <strong>Quando o verso vem pras casas - Acordeon</strong>. 
                [S.I.]: Youtube, 19 de jun. de 2020. 1 vídeo (0:42 seg). Disponível em: https://www.youtube.com/watch?v=-Dzt3pKFmMA. 
                Acesso em: 28 nov. 2025.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* O Espírito do Gaiteiro Gaúcho */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl">O Espírito do Gaiteiro Gaúcho</CardTitle>
              <CardDescription>A voz da alma gaúcha</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <blockquote className="border-l-4 border-primary pl-4 italic text-lg text-foreground/90">
                "O instrumentista gaúcho toca com muito ímpeto"
                <footer className="text-sm text-muted-foreground mt-2 not-italic">— Albino Manique</footer>
              </blockquote>
              <p className="text-foreground/90 leading-relaxed">
                Essa energia característica não é apenas técnica musical — ela reflete o <strong>jeito de ser do gaúcho</strong>: 
                direto, apaixonado, intenso. A gaita torna-se, assim, não apenas um instrumento, 
                mas a própria <strong>voz da alma gaúcha</strong>.
              </p>
              <p className="text-muted-foreground">
                Quando um gaiteiro toca, não está apenas executando notas: 
                está contando histórias, expressando sentimentos, mantendo viva uma tradição centenária.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Referência Bibliográfica */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Referência Bibliográfica</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground font-mono leading-relaxed">
                DA SILVA, Danilo K. <strong>O gesto musical gauchesco na composição de música contemporânea</strong>. 
                2010. Dissertação de Mestrado – Programa de Pós-Graduação em Música, Universidade Federal do Paraná, Curitiba.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Botão de Desbloqueio - Voltando ao Verso */}
        {showUnlockButton && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex justify-center my-8"
          >
            <Button onClick={onUnlockFinal} size="lg" className="gap-2">
              <RotateCcw className="h-5 w-5" />
              Voltando ao Verso
            </Button>
          </motion.div>
        )}
      </TabsContent>
    </Tabs>
  );
}
