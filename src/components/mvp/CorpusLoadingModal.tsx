import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

interface LoadingMessage {
  text: string;
  delay: number;
}

const LOADING_MESSAGES: LoadingMessage[] = [
  { text: 'Processando o corpus...', delay: 1200 },
  { text: 'Anotando os domínios semânticos...', delay: 1500 },
  { text: 'Alimentando base de dados estatísticos...', delay: 1500 },
  { text: 'Gerando gráficos e nuvem semântica...', delay: 1500 },
  { text: '✅ Pronto! Você já pode explorar as abas.', delay: 1000 }
];

interface CorpusLoadingModalProps {
  open: boolean;
  onComplete: () => void;
}

export function CorpusLoadingModal({ open, onComplete }: CorpusLoadingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!open) {
      // Reset ao fechar
      setCurrentStep(0);
      setProgress(0);
      setIsComplete(false);
      return;
    }

    // Iniciar sequência de loading
    let timeoutId: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;

    const runSequence = async () => {
      for (let i = 0; i < LOADING_MESSAGES.length; i++) {
        setCurrentStep(i);
        
        // Animar progress bar
        const stepProgress = ((i + 1) / LOADING_MESSAGES.length) * 100;
        let currentProgress = (i / LOADING_MESSAGES.length) * 100;
        
        progressInterval = setInterval(() => {
          currentProgress += 2;
          if (currentProgress <= stepProgress) {
            setProgress(currentProgress);
          } else {
            clearInterval(progressInterval);
          }
        }, 30);

        // Aguardar delay da mensagem
        await new Promise(resolve => {
          timeoutId = setTimeout(resolve, LOADING_MESSAGES[i].delay);
        });
      }

      // Marcar como completo
      setIsComplete(true);
      setProgress(100);

      // Fechar modal após 1s
      timeoutId = setTimeout(() => {
        onComplete();
      }, 1000);
    };

    runSequence();

    return () => {
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
    };
  }, [open, onComplete]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px]">
        <div className="py-6 space-y-6">
          {/* Header com ícone animado */}
          <div className="flex items-center justify-center">
            <div className="relative">
              {isComplete ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  className="p-4 bg-green-500/20 rounded-full"
                >
                  <Check className="w-12 h-12 text-green-500" />
                </motion.div>
              ) : (
                <div className="p-4 bg-primary/20 rounded-full">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Mensagem atual com animação */}
          <div className="min-h-[60px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className={`text-center text-lg font-medium ${
                  isComplete ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                }`}
              >
                {LOADING_MESSAGES[currentStep]?.text}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Etapa {currentStep + 1} de {LOADING_MESSAGES.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Steps indicator */}
          <div className="flex justify-center gap-2">
            {LOADING_MESSAGES.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  index <= currentStep
                    ? 'bg-primary scale-110'
                    : 'bg-muted scale-100'
                }`}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
