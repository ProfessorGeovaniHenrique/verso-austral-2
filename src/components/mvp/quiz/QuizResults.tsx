import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuizState } from "@/types/quiz.types";
import { CheckCircle2, XCircle, RotateCcw, Microscope } from "lucide-react";

interface QuizResultsProps {
  quizState: QuizState;
  onRestart: () => void;
  onClose: () => void;
}

export function QuizResults({ quizState, onRestart, onClose }: QuizResultsProps) {
  const percentage = Math.round((quizState.score / quizState.questions.length) * 100);
  const isPassed = percentage >= 70;

  return (
    <div className="space-y-6">
      {isPassed ? (
        <Card className="border-green-500/30 bg-green-500/10">
          <CardHeader>
            <CardTitle className="text-center text-2xl flex items-center justify-center gap-2">
              🏆 Aprovado!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="text-5xl font-bold text-green-600">{percentage}%</div>
              <p className="text-foreground font-medium">
                Parabéns! Você dominou o conteúdo sobre o Chamamé! 🎉
              </p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mt-4">
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium flex items-center justify-center gap-2">
                  🎸 <span>Conquista desbloqueada: <strong>Chamamecero</strong></span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              Resultado Final: {quizState.score}/{quizState.questions.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="text-5xl font-bold text-red-600">{percentage}%</div>
              <p className="text-foreground font-medium">
                Você precisa de <strong>70% ou mais</strong> para aprovação. 📚
              </p>
              <p className="text-muted-foreground text-sm">
                Continue estudando! Revise as abas anteriores e tente novamente.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Revisão das Respostas</h3>
        {quizState.questions.map((question, index) => {
          const answer = quizState.answers[index];
          return (
            <Card key={question.id} className={answer.isCorrect ? "border-green-500/50" : "border-red-500/50"}>
              <CardHeader>
                <CardTitle className="text-sm flex items-start gap-2">
                  {answer.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{question.question}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Sua resposta: </span>
                  <span className={answer.isCorrect ? "text-green-600" : "text-red-600"}>
                    {answer.userAnswers.join(", ")}
                  </span>
                </div>
                {!answer.isCorrect && (
                  <div>
                    <span className="font-medium">Resposta correta: </span>
                    <span className="text-green-600">{question.correctAnswers.join(", ")}</span>
                  </div>
                )}
                {question.explanation && (
                  <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                    <span className="font-medium">💡 Explicação: </span>
                    <span className="text-muted-foreground">{question.explanation}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button 
          onClick={onRestart} 
          className="flex-1" 
          variant={isPassed ? "outline" : "default"}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {isPassed ? "Tentar Novamente" : "Tentar Novamente"}
        </Button>
        <Button onClick={onClose} className="flex-1" variant={isPassed ? "default" : "outline"}>
          Voltar ao Conteúdo
        </Button>
      </div>

      {/* CTA Teaser - Apenas se aprovado */}
      {isPassed && (
        <Card className="border-primary/30 bg-primary/5 mt-4">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Microscope className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">
                  🔬 Acesso Desbloqueado!
                </p>
                <p className="text-xs text-muted-foreground">
                  Descubra os segredos científicos desta canção
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
