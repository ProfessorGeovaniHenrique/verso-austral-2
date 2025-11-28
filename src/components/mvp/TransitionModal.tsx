import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Microscope } from "lucide-react";

interface TransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExploreAnalysis: () => void;
}

export function TransitionModal({ isOpen, onClose, onExploreAnalysis }: TransitionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            🎓 Parabéns, Chamamecero!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 text-center py-4">
          <p className="text-foreground">
            Você provou seu conhecimento sobre o Chamamé.
          </p>
          <p className="text-muted-foreground">
            Agora está pronto para descobrir o que a <strong>ciência linguística</strong>{" "}
            pode revelar sobre "Quando o verso vem pras casa"!
          </p>
          
          <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg p-4 text-left">
            <p className="text-sm font-medium mb-2">
              🔬 Na próxima etapa você vai:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Ver a música analisada por inteligência artificial</li>
              <li>• Descobrir os domínios semânticos do texto</li>
              <li>• Explorar estatísticas e visualizações científicas</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Continuar Explorando
          </Button>
          <Button onClick={onExploreAnalysis} className="flex-1 gap-2">
            <Microscope className="h-4 w-4" />
            Explorar Análise
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
