import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Music, BrainCircuit, CheckCircle2, Lightbulb } from "lucide-react";

interface TabVoltandoAoVersoProps {
  onUnlockFinal?: () => void;
  showUnlockButton?: boolean;
}

interface Question {
  id: string;
  verse: string;
  question: string;
  connection: string;
  context: string;
}

const questions: Question[] = [
  {
    id: "panuelo",
    verse: "Um pañuelo maragato se abriu no horizonte",
    question: "O que você imagina quando lê 'se abriu no horizonte'? Que momento do dia e que sentimento essa imagem evoca?",
    connection: "O pañuelo vermelho 'se abrindo no horizonte' é uma imagem poética do pôr do sol — o céu avermelhado que anuncia o fim da jornada. É o momento sagrado do retorno: quando o campeiro volta para casa após um dia de lida. O horizonte tingido de vermelho simboliza não apenas o fim do dia, mas o início do encontro com a querência.",
    context: "Imagens poéticas e o ciclo do dia na cultura campeira"
  },
  {
    id: "mate",
    verse: "Cevou um mate pura-folha, jujado de maçanilha",
    question: "Como este ritual do chimarrão se relaciona com o conceito de querência?",
    connection: "O ritual do chimarrão é uma manifestação concreta da querência — o sentimento de pertencimento ao lugar. O mate 'pura-folha' preparado com cuidado ('jujado') representa a conexão profunda com a terra, os costumes e a identidade gaúcha. É um ato que ancora o indivíduo em seu território afetivo.",
    context: "Cultura gaúcha - rituais de pertencimento"
  },
  {
    id: "acordeao",
    verse: "🎵 Abertura instrumental — primeiros segundos da canção",
    question: "Ouça os primeiros segundos da canção. Como você descreveria a sonoridade do acordeão na abertura? Ela transmite uma sensação dramática, épica, melancólica, ou algo diferente?",
    connection: "O acordeão que abre a canção com notas longas e sustentadas cria uma atmosfera de nostalgia épica — não é tristeza pura, mas uma melancolia altiva, como o campeiro que contempla o horizonte com orgulho de sua jornada. O timbre do acordeão, típico do Chamamé, evoca a vastidão dos campos e a grandeza silenciosa da vida rural.",
    context: "Sonoridade do acordeão e atmosfera emocional"
  },
  {
    id: "ritmo",
    verse: "Templado a luz de candeeiro",
    question: "Preste atenção no ritmo do violão ao longo da canção. O Chamamé tradicional costuma ser mais acelerado — por que você acha que esta canção tem um andamento mais lento e constante? O que esse ritmo pode representar na narrativa da letra?",
    connection: "O ritmo cadenciado e mais lento desta canção é uma escolha poética deliberada. Enquanto o Chamamé tradicional tem um andamento mais vivo e dançante, aqui o violão marca um ritmo de cavalgada tranquila — o passo calmo do cavalo que retorna para casa. A constância rítmica evoca o movimento do animal, e a velocidade reduzida transmite a serenidade de quem está chegando, não partindo. O 'verso vindo pras casa' chega no tempo dele, sem pressa.",
    context: "Ritmo, andamento e narrativa: o violão como cavalgada"
  },
  {
    id: "saudade",
    verse: "E uma saudade redomona pelos cantos do galpão",
    question: "Por que a saudade é descrita como 'redomona'? O que isso revela sobre a poética gaúcha?",
    connection: "Chamar a saudade de 'redomona' (cavalo não domado, selvagem) é usar uma metáfora equestre — elemento central da cultura gaúcha. Revela que a saudade não é passiva ou controlada: ela é bravia, imprevisível, difícil de domar. Esta é a essência da poética gaúcha: transformar sentimentos abstratos em imagens concretas da lida campeira.",
    context: "Metáforas equestres na poesia"
  }
];

export function TabVoltandoAoVerso({ onUnlockFinal, showUnlockButton }: TabVoltandoAoVersoProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [hintsRevealed, setHintsRevealed] = useState<Record<string, boolean>>({});

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleReveal = (questionId: string) => {
    setRevealed(prev => ({ ...prev, [questionId]: true }));
  };

  const handleRevealHint = (questionId: string) => {
    setHintsRevealed(prev => ({ ...prev, [questionId]: true }));
  };

  const answeredCount = Object.keys(answers).filter(key => answers[key]?.trim()).length;
  const revealedCount = Object.keys(revealed).filter(key => revealed[key]).length;
  const progress = (revealedCount / questions.length) * 100;

  return (
    <div className="space-y-8">
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
              Voltando ao Verso
            </CardTitle>
            <CardDescription className="text-base">
              Reescute a canção com novos ouvidos e conecte seu aprendizado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-foreground/90 leading-relaxed">
              Agora que você conhece as <strong>origens guarani do Chamamé</strong>, a <strong>técnica 
              sagrada do rasguear</strong> no violão e os <strong>símbolos culturais gaúchos</strong>, 
              é hora de retornar à canção original com uma escuta profunda e consciente.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Abaixo, você encontrará trechos específicos da letra acompanhados de perguntas reflexivas. 
              Responda o que compreendeu e depois revele as conexões com o conteúdo que você estudou.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Player do YouTube */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Reescute a Canção</CardTitle>
            <CardDescription>
              Ouça novamente "Quando o Verso Vem pras Casa" com atenção aos detalhes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video rounded-lg overflow-hidden border border-border shadow-lg">
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
      </motion.div>

      {/* Progresso */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-foreground">
                  Progresso das Reflexões
                </span>
                <span className="text-sm text-muted-foreground">
                  {revealedCount}/{questions.length} conexões reveladas
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Perguntas Inline */}
      {questions.map((q, index) => (
        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
        >
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm">
                  {index + 1}
                </span>
                Reflexão sobre o Verso
              </CardTitle>
              <CardDescription className="text-sm italic text-muted-foreground mt-2">
                "{q.verse}"
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-sm text-foreground/90 font-medium">{q.question}</p>
                
                {!hintsRevealed[q.id] ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs text-muted-foreground hover:text-primary"
                    onClick={() => handleRevealHint(q.id)}
                  >
                    <Lightbulb className="h-3 w-3 mr-1" />
                    Preciso de uma dica
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2 animate-in fade-in">
                    💡 {q.context}
                  </p>
                )}
              </div>

              {!revealed[q.id] && (
                <>
                  <Textarea
                    placeholder="Digite sua reflexão aqui..."
                    value={answers[q.id] || ""}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className="min-h-[100px]"
                  />
                  <Button
                    onClick={() => handleReveal(q.id)}
                    disabled={!answers[q.id]?.trim()}
                    className="w-full"
                    variant={answers[q.id]?.trim() ? "default" : "outline"}
                  >
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Revelar Conexão
                  </Button>
                </>
              )}

              {revealed[q.id] && (
                <Alert className="bg-primary/10 border-primary/30">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <AlertDescription className="ml-2">
                    <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                      {q.connection}
                    </p>
                    {answers[q.id] && (
                      <div className="mt-3 pt-3 border-t border-primary/20">
                        <p className="text-xs text-muted-foreground font-semibold mb-1">
                          Sua reflexão:
                        </p>
                        <p className="text-xs text-foreground/70 italic">
                          {answers[q.id]}
                        </p>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Botão Final */}
      {showUnlockButton && revealedCount === questions.length && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center"
        >
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    Parabéns! Você completou todas as reflexões! 🎉
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Agora você está pronto para testar seus conhecimentos sobre os instrumentos do Chamamé.
                  </p>
                </div>
                <Button
                  onClick={onUnlockFinal}
                  size="lg"
                  className="text-lg px-8 py-6"
                >
                  <BrainCircuit className="h-5 w-5 mr-2" />
                  Pronto para o Quiz Final!
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
