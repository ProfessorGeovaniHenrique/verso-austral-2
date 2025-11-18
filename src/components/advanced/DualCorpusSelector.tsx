import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, Info } from "lucide-react";
import { CorpusSubcorpusSelector } from "@/components/corpus/CorpusSubcorpusSelector";
import { CorpusType } from "@/data/types/corpus-tools.types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface DualCorpusSelectorProps {
  // Corpus de Estudo
  estudoCorpus: CorpusType;
  onEstudoCorpusChange: (corpus: CorpusType) => void;
  estudoMode: 'complete' | 'artist';
  onEstudoModeChange: (mode: 'complete' | 'artist') => void;
  estudoArtist?: string | null;
  onEstudoArtistChange?: (artist: string) => void;
  
  // Corpus de Referência
  refCorpus: CorpusType;
  onRefCorpusChange: (corpus: CorpusType) => void;
  refMode: 'complete' | 'artist';
  onRefModeChange: (mode: 'complete' | 'artist') => void;
  refArtist?: string | null;
  onRefArtistChange?: (artist: string) => void;
  
  // Balanceamento
  balanceRatio: number;
  onBalanceRatioChange: (ratio: number) => void;
  
  // Inversão
  onInvert: () => void;
  
  disabled?: boolean;
}

export function DualCorpusSelector({
  estudoCorpus,
  onEstudoCorpusChange,
  estudoMode,
  onEstudoModeChange,
  estudoArtist,
  onEstudoArtistChange,
  refCorpus,
  onRefCorpusChange,
  refMode,
  onRefModeChange,
  refArtist,
  onRefArtistChange,
  balanceRatio,
  onBalanceRatioChange,
  onInvert,
  disabled = false
}: DualCorpusSelectorProps) {
  
  const handleInvert = () => {
    onInvert();
    toast.info('Corpora invertidos', {
      description: 'Corpus de Estudo ↔️ Corpus de Referência'
    });
  };

  const getRatioLabel = (ratio: number): string => {
    if (ratio === 1.0) return 'Balanceado (1:1)';
    if (ratio < 1.0) return `CR menor (${ratio.toFixed(1)}x)`;
    return `CR maior (${ratio.toFixed(1)}x)`;
  };

  const getRatioBadgeVariant = (ratio: number) => {
    if (ratio === 1.0) return 'default';
    if (ratio < 1.0) return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-4">
      {/* Layout Dual: Estudo | Inverter | Referência */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
        {/* Corpus de Estudo */}
        <CorpusSubcorpusSelector
          label="Corpus de Estudo (CE)"
          corpusBase={estudoCorpus}
          onCorpusBaseChange={onEstudoCorpusChange}
          mode={estudoMode}
          onModeChange={onEstudoModeChange}
          selectedArtist={estudoArtist}
          onArtistChange={onEstudoArtistChange}
          disabled={disabled}
        />

        {/* Botão Inverter (Centro) */}
        <div className="flex items-center justify-center pt-12">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleInvert}
                  disabled={disabled}
                  className="rounded-full w-12 h-12 hover:bg-primary/10 border-primary/20"
                >
                  <ArrowLeftRight className="h-5 w-5 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Inverter Corpus de Estudo ↔️ Corpus de Referência</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Corpus de Referência */}
        <CorpusSubcorpusSelector
          label="Corpus de Referência (CR)"
          corpusBase={refCorpus}
          onCorpusBaseChange={onRefCorpusChange}
          mode={refMode}
          onModeChange={onRefModeChange}
          selectedArtist={refArtist}
          onArtistChange={onRefArtistChange}
          disabled={disabled}
        />
      </div>

      {/* Card de Balanceamento */}
      <Card className="border-primary/20 bg-muted/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              Balanceamento de Corpus
              <Badge variant={getRatioBadgeVariant(balanceRatio)}>
                {getRatioLabel(balanceRatio)}
              </Badge>
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">Controle de Tamanho do Corpus de Referência</p>
                  <p className="text-xs">
                    Ajusta o tamanho do CR em relação ao CE por amostragem aleatória de tokens.
                    <br />• 0.5x = CR com metade do tamanho do CE
                    <br />• 1.0x = Tamanhos iguais (balanceado)
                    <br />• 2.0x = CR com dobro do tamanho do CE
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription className="text-xs">
            Controla o tamanho relativo do Corpus de Referência para análise estatística equilibrada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Slider
            value={[balanceRatio]}
            onValueChange={(values) => onBalanceRatioChange(values[0])}
            min={0.5}
            max={3.0}
            step={0.1}
            disabled={disabled}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.5x (CR menor)</span>
            <span>1.0x (balanceado)</span>
            <span>3.0x (CR maior)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}