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
  songId: string;
  onComplete: () => void;
}

export function CorpusLoadingModal({ open, songId, onComplete }: CorpusLoadingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!open) {
      // Reset ao fechar
      setCurrentStep(0);
      setProgress(0);
      setIsComplete(false);
      setIsProcessing(false);
      return;
    }

    if (isProcessing) return; // Evita múltiplas chamadas

    // Iniciar processamento real
    setIsProcessing(true);
    
    const processCorpus = async () => {
      try {
        // Iniciar processamento
        setCurrentStep(0);
        setProgress(10);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-single-song-demo`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
            },
            body: JSON.stringify({ songId, referenceCorpusSize: 25 })
          }
        );

        if (!response.ok) {
          throw new Error('Erro ao processar corpus');
        }

        // Simular progresso enquanto processa
        const progressIntervals = [
          { step: 1, progress: 30, delay: 2000 },  // Anotando domínios
          { step: 2, progress: 60, delay: 3000 },  // Alimentando base
          { step: 3, progress: 85, delay: 2000 },  // Gerando gráficos
          { step: 4, progress: 100, delay: 1000 }  // Pronto
        ];

        for (const { step, progress: p, delay } of progressIntervals) {
          await new Promise(resolve => setTimeout(resolve, delay));
          setCurrentStep(step);
          setProgress(p);
        }

        setIsComplete(true);
        setProgress(100);

        // Fechar modal e completar
        setTimeout(() => {
          onComplete();
        }, 1000);

      } catch (error) {
        console.error('Error processing corpus:', error);
        setCurrentStep(4);
        setProgress(100);
        setIsComplete(true);
        setTimeout(() => {
          onComplete();
        }, 1000);
      }
    };

    processCorpus();
  }, [open, songId, onComplete, isProcessing]);

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
