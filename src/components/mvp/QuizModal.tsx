import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuizContext } from "@/contexts/QuizContext";
import { ObjectiveQuestion } from "./quiz/ObjectiveQuestion";
import { CheckboxQuestion } from "./quiz/CheckboxQuestion";
import { MatchingQuestion } from "./quiz/MatchingQuestion";
import { QuizResults } from "./quiz/QuizResults";
import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

export function QuizModal() {
  const { quizState, isOpen, submitAnswer, resetQuiz, closeQuiz, goToPreviousQuestion } = useQuizContext();
  const [currentAnswer, setCurrentAnswer] = useState<string[]>([]);

  // Restore previous answer when going back
  useEffect(() => {
    if (!quizState) return;
    
    const previousAnswerIndex = quizState.currentQuestionIndex - 1;
    if (previousAnswerIndex >= 0 && quizState.answers[previousAnswerIndex]) {
      const previousAnswer = quizState.answers[previousAnswerIndex];
      setCurrentAnswer(previousAnswer.userAnswers);
    }
  }, [quizState?.currentQuestionIndex]);

  if (!quizState) return null;

  const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
  const progress = ((quizState.currentQuestionIndex + 1) / quizState.questions.length) * 100;

  const handleNext = () => {
    submitAnswer(currentAnswer);
    setCurrentAnswer([]);
  };

  const handleRestart = () => {
    resetQuiz();
    setCurrentAnswer([]);
  };

  const handlePrevious = () => {
    goToPreviousQuestion();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'hard': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Fácil';
      case 'medium': return 'Médio';
      case 'hard': return 'Difícil';
      default: return difficulty;
    }
  };

  const isAnswerValid = () => {
    if (currentQuestion.type === 'objective') {
      return currentAnswer.length === 1;
    } else if (currentQuestion.type === 'checkbox') {
      return currentAnswer.length > 0;
    } else if (currentQuestion.type === 'matching') {
      return currentAnswer.length === (currentQuestion.matchingPairs?.length || 0);
    }
    return false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeQuiz}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quiz: Quando o Verso Vem pras Casa</DialogTitle>
          <DialogDescription>
            Teste seus conhecimentos sobre o Chamamé e a cultura gaúcha
          </DialogDescription>
        </DialogHeader>

        {quizState.isComplete ? (
          <QuizResults quizState={quizState} onRestart={handleRestart} onClose={closeQuiz} />
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Pergunta {quizState.currentQuestionIndex + 1} de {quizState.questions.length}</span>
                <span className={getDifficultyColor(currentQuestion.difficulty)}>
                  {getDifficultyLabel(currentQuestion.difficulty)}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <Card>
              <CardContent className="pt-6 space-y-6">
                <h3 className="text-lg font-semibold">{currentQuestion.question}</h3>

                {currentQuestion.type === 'objective' && (
                  <ObjectiveQuestion
                    question={currentQuestion}
                    selectedAnswer={currentAnswer[0] || null}
                    onAnswerChange={(answer) => setCurrentAnswer([answer])}
                  />
                )}

                {currentQuestion.type === 'checkbox' && (
                  <CheckboxQuestion
                    question={currentQuestion}
                    selectedAnswers={currentAnswer}
                    onAnswerChange={setCurrentAnswer}
                  />
                )}

                {currentQuestion.type === 'matching' && (
                  <MatchingQuestion
                    question={currentQuestion}
                    selectedMatches={currentAnswer}
                    onMatchChange={setCurrentAnswer}
                  />
                )}

                <div className="flex justify-between pt-4">
                  <Button 
                    onClick={handlePrevious} 
                    disabled={quizState.currentQuestionIndex === 0}
                    variant="outline"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  
                  <Button onClick={handleNext} disabled={!isAnswerValid()}>
                    {quizState.currentQuestionIndex === quizState.questions.length - 1 ? (
                      "Finalizar Quiz"
                    ) : (
                      <>
                        Próxima
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="text-center text-sm text-muted-foreground">
              💡 Dica: Você pode voltar às abas anteriores para revisar o conteúdo antes de responder
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
