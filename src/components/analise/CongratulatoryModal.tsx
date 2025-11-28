import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

interface CongratulatoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CongratulatoryModal({ isOpen, onClose }: CongratulatoryModalProps) {
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);

  useEffect(() => {
    if (isOpen && !hasTriggeredConfetti) {
      // Confetti explosion
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);

      setHasTriggeredConfetti(true);

      return () => clearInterval(interval);
    }
  }, [isOpen, hasTriggeredConfetti]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <Trophy className="h-16 w-16 text-yellow-500" />
              <Sparkles className="h-8 w-8 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            🎉 Parabéns pela Jornada Verso a Dentro! 🎉
          </DialogTitle>
          <DialogDescription className="text-center text-base mt-2">
            Você completou a análise científica de "Quando o verso vem pras casa"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Badge de Conquista */}
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                <span className="text-3xl">🔬</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-primary">Cientista Pleno Desbloqueado!</h3>
                <p className="text-sm text-muted-foreground">
                  Você dominou as ferramentas de análise semântica científica
                </p>
              </div>
            </div>
          </Card>

          {/* Mensagem da Equipe */}
          <div className="space-y-4 text-center">
            <div className="prose prose-sm max-w-none">
              <p className="text-base leading-relaxed">
                Você explorou os domínios semânticos, interpretou estatísticas complexas e 
                visualizou a estrutura linguística de uma obra poética gaúcha através de 
                métodos científicos rigorosos.
              </p>
              <p className="text-base leading-relaxed font-medium">
                Esta jornada representa o encontro entre a tradição literária regionalista 
                e as tecnologias contemporâneas de análise linguística computacional.
              </p>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">Agradecimentos da Equipe VersoAustral:</p>
              <div className="space-y-1">
                <p className="font-semibold text-base">
                  🎓 Geovani Henrique Santos de Souza
                </p>
                <p className="font-semibold text-base">
                  🎓 Rozane Rodrigues Rebechi
                </p>
              </div>
            </div>
          </div>

          {/* Dica sobre Conquista Secreta */}
          <Card className="p-4 bg-muted/50 border-dashed">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🏅</span>
              <div className="flex-1 text-sm">
                <p className="font-medium mb-1">Conquista Secreta Disponível</p>
                <p className="text-muted-foreground text-xs">
                  Continue explorando <strong>todas as funcionalidades</strong> (KWIC, redes semânticas, 
                  todos os níveis hierárquicos) para desbloquear a conquista <strong>"Cientista Sênior"</strong>! 🏆
                </p>
              </div>
            </div>
          </Card>

          <Button onClick={onClose} size="lg" className="w-full">
            Continuar Explorando
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
