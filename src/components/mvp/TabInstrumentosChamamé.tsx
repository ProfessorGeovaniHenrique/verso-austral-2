import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Music } from "lucide-react";

export function TabInstrumentosChamamé() {
  return (
    <div className="space-y-8 py-6">
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
    </div>
  );
}
