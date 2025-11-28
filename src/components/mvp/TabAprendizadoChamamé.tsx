import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, MapPin, Users, Guitar } from "lucide-react";

interface TabAprendizadoChamaméProps {
  onUnlockNext?: () => void;
  showUnlockButton?: boolean;
}

export function TabAprendizadoChamamé({ onUnlockNext, showUnlockButton }: TabAprendizadoChamaméProps) {
  return (
    <div className="space-y-6">
      {/* Introdução */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            O Chamamé: Identidade Musical da Região do Prata
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            O <strong>chamamé</strong> é um gênero musical característico da região do Rio da Prata, 
            que exerce forte influência na música gaúcha do Rio Grande do Sul. Suas origens estão 
            intimamente ligadas às tradições culturais dos países platinos, especialmente Argentina 
            e Uruguai, chegando ao Brasil através das fronteiras do sul.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            A música popular no Rio Grande do Sul é resultado de uma <strong>mescla de influências</strong> das 
            várias etnias que se dirigiram para o estado sulino em busca do sustento e da sobrevivência. 
            Dentre essas influências, destacam-se os portugueses (primeiros a chegarem ao Estado, além 
            dos africanos e indígenas), alemães, italianos, espanhóis e outros povos que contribuíram 
            para a rica diversidade cultural da região.
          </p>
        </CardContent>
      </Card>

      {/* Características Musicais */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Guitar className="h-5 w-5 text-primary" />
            Características Musicais do Chamamé
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Compasso e Ritmo</h4>
                <p className="text-muted-foreground text-sm">
                  Escrito em <strong>compasso ternário 3/4</strong>, o chamamé apresenta uma característica 
                  rítmica única: ao ser executado no acordeão, há uma "puxada" de fole do 2° para o 3° tempo, 
                  criando uma <strong>acentuação no 3° tempo</strong> do compasso, ao invés do 1°. Esta particularidade 
                  o diferencia de outros gêneros, como a rancheira.
                </p>
                <div className="mt-2 p-3 bg-muted/30 rounded-lg border-l-4 border-primary">
                  <p className="text-xs text-muted-foreground">
                    <strong>Nota técnica:</strong> O chamamé pode ser escrito tanto em <strong>3/4 (ternário simples)</strong> 
                    quanto em <strong>6/8 (binário composto)</strong>. A notação em 6/8 reflete subdivisões 
                    rítmicas herdadas das tradições guaranis, enquanto 3/4 é mais comum em partituras modernas. 
                    A característica acentuação no tempo fraco permanece em ambas as notações.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Baixaria Característica</h4>
                <p className="text-muted-foreground text-sm">
                  O acompanhamento da "baixaria" no chamamé utiliza <strong>três semínimas</strong>, com 
                  acentuação na última semínima. Na rancheira, por exemplo, também se utilizam três semínimas, 
                  mas a acentuação ocorre na primeira, evidenciando a diferença entre os gêneros.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Instrumentação</h4>
                <p className="text-muted-foreground text-sm">
                  O <strong>acordeão</strong> é o instrumento central do chamamé, trazido pelos imigrantes italianos 
                  e fundamental para caracterizar o timbre da música gaúcha. Juntamente com o <strong>violão</strong> e 
                  o <strong>bombo leguero</strong> (instrumento de percussão argentino), formam a base instrumental típica.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contexto Cultural */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Influências Culturais e Heranças
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold text-primary">Influência Espanhola</h4>
              <p className="text-muted-foreground text-sm">
                Os espanhóis, chegados ao Brasil no final do século XIX e início do século XX, 
                trouxeram instrumentos como o violão e o bombo leguero. A <strong>língua espanhola</strong> e 
                o linguajar dos países da região do Rio da Prata encontram-se perpetuados nas 
                canções populares sulinas.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-primary">Influência Italiana</h4>
              <p className="text-muted-foreground text-sm">
                A valiosa contribuição dos italianos foi a introdução do uso do <strong>acordeão</strong>, 
                instrumento que acompanha, até hoje, vários gêneros musicais gaúchos, sendo 
                essencial para a execução do chamamé.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-primary">Região do Rio da Prata</h4>
              <p className="text-muted-foreground text-sm">
                O Rio da Prata é um estuário formado pelo deságue dos rios Paraná e Uruguai no 
                Oceano Atlântico, localizado na divisa entre Uruguai e Argentina. Esta região 
                exerceu profunda influência na música gaúcha.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-primary">Outras Etnias</h4>
              <p className="text-muted-foreground text-sm">
                Portugueses, alemães, africanos, indígenas, poloneses, judeus, japoneses e franceses 
                também contribuíram para a estruturação das características da música sul-rio-grandense, 
                criando uma rica diversidade cultural.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contexto nas Danças de Fandango */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            O Chamamé nas Danças de Fandango
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            A dança - tanto folclórica quanto popular, chamada de <strong>dança de fandango</strong> - é muito 
            cultivada na região sulina. A música gaúcha é, normalmente, direcionada à dança. Dentre 
            as danças de fandango, destacam-se:
          </p>
          <div className="grid gap-2 md:grid-cols-3 text-sm">
            <div className="p-3 rounded-lg bg-muted/30">Vaneira</div>
            <div className="p-3 rounded-lg bg-muted/30">Vaneirão</div>
            <div className="p-3 rounded-lg bg-muted/30">Bugio</div>
            <div className="p-3 rounded-lg bg-muted/30">Xote</div>
            <div className="p-3 rounded-lg bg-muted/30">Rancheira</div>
            <div className="p-3 rounded-lg bg-muted/30">Polca</div>
            <div className="p-3 rounded-lg bg-muted/30">Valsa</div>
            <div className="p-3 rounded-lg bg-muted/30">Milonga</div>
            <div className="p-3 rounded-lg bg-primary/20 font-semibold">Chamamé</div>
          </div>
          <p className="text-muted-foreground leading-relaxed text-sm">
            O chamamé figura entre os gêneros de maior destaque nas tradições musicais e 
            dançantes do Rio Grande do Sul, mantendo viva a conexão cultural com os países vizinhos 
            da região platina.
          </p>
        </CardContent>
      </Card>

      {/* Características Gerais da Música Gaúcha */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Características Gerais dos Gêneros Musicais Gaúchos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>Modo:</strong> Normalmente empregado o <strong>modo Maior</strong></p>
            <p><strong>Tonalidades:</strong> Preferência por tonalidades com sustenidos. A tonalidade de <strong>Mi Maior</strong> é especialmente apreciada por gaiteiros e trovadores</p>
            <p><strong>Fraseologia:</strong> Inícios de frase com anacruse e terminações masculinas (no acento tônico do compasso)</p>
            <p><strong>Melodia:</strong> Simples, intuitiva, construída por graus conjuntos e intervalos harmônicos</p>
            <p><strong>Harmonia:</strong> Predominância de funções harmônicas tônica, dominante e subdominante</p>
            <p><strong>Compassos:</strong> Binários (2/4, 2/2) e ternários (3/4) são os mais comuns</p>
          </div>
        </CardContent>
      </Card>

      {/* Botão de Desbloqueio */}
      {showUnlockButton && (
        <div className="flex justify-center my-8">
          <Button onClick={onUnlockNext} size="lg" className="gap-2">
            <MapPin className="h-5 w-5" />
            Conheça as origens do Chamamé
          </Button>
        </div>
      )}

      {/* Referência ABNT */}
      <Card className="border-border/50 bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base">Referência Bibliográfica</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            WOLFFENBÜTTEL, Cristina Rolim. Música no Rio Grande do Sul: conhecendo as origens e alguns 
            gêneros musicais. <strong>Revista da FUNDARTE</strong>, Montenegro, p. 254-277, ano 20, n° 40, 
            janeiro/março de 2020. Disponível em: http://seer.fundarte.rs.gov.br/index.php/RevistadaFundarte/index. 
            Acesso em: 31 mar. 2020.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}