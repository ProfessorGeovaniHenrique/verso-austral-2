import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Music, Library, Users, Percent, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CorpusType } from '@/data/types/corpus-tools.types';
import { estimateCorpusSize } from '@/services/proportionalSamplingService';
import { toast } from 'sonner';

export interface CrossCorpusSelection {
  study: {
    corpusType: CorpusType;
    mode: 'complete' | 'artist' | 'song';
    artist?: string;
    songId?: string;
    estimatedSize: number;
  };
  reference: {
    corpusType: CorpusType;
    mode: 'complete' | 'proportional-sample';
    sizeRatio: number;
    targetSize: number;
  };
  isComparative: boolean;
}

interface CrossCorpusSelectorWithRatioProps {
  mode: 'study-only' | 'cross-corpus';
  showRatioControl?: boolean;
  ratioPresets?: number[];
  onSelectionChange: (selection: CrossCorpusSelection) => void;
  availableArtists?: string[];
}

export function CrossCorpusSelectorWithRatio({
  mode = 'cross-corpus',
  showRatioControl = true,
  ratioPresets = [1, 3, 5, 10],
  onSelectionChange,
  availableArtists = []
}: CrossCorpusSelectorWithRatioProps) {
  const [studyCorpus, setStudyCorpus] = useState<CorpusType>('gaucho');
  const [studyMode, setStudyMode] = useState<'complete' | 'artist' | 'song'>('complete');
  const [studyArtist, setStudyArtist] = useState<string>('');
  const [studyEstimatedSize, setStudyEstimatedSize] = useState(0);

  const [referenceCorpus, setReferenceCorpus] = useState<CorpusType>('nordestino');
  const [referenceMode, setReferenceMode] = useState<'complete' | 'proportional-sample'>('proportional-sample');
  const [sizeRatio, setSizeRatio] = useState(5);
  const [customRatio, setCustomRatio] = useState('');

  const isComparative = mode === 'cross-corpus';

  useEffect(() => {
    updateEstimates();
  }, [studyCorpus, studyMode, studyArtist, referenceCorpus, referenceMode, sizeRatio]);

  const updateEstimates = async () => {
    try {
      const studySize = await estimateCorpusSize(studyCorpus, studyMode, studyArtist);
      setStudyEstimatedSize(studySize);

      const selection: CrossCorpusSelection = {
        study: {
          corpusType: studyCorpus,
          mode: studyMode,
          artist: studyArtist || undefined,
          estimatedSize: studySize
        },
        reference: {
          corpusType: referenceCorpus,
          mode: referenceMode,
          sizeRatio,
          targetSize: studySize * sizeRatio
        },
        isComparative
      };

      onSelectionChange(selection);
    } catch (error) {
      console.error('Erro ao estimar tamanhos:', error);
    }
  };

  const handleRatioPresetClick = (ratio: number) => {
    setSizeRatio(ratio);
    setCustomRatio('');
  };

  const handleCustomRatioChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      setSizeRatio(num);
      setCustomRatio(value);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="pt-6 space-y-4">
        {/* Corpus de Estudo */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Library className="h-4 w-4 text-primary" />
            <Label className="text-base font-semibold">Corpus de Estudo</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-sm text-muted-foreground mb-1">Modo</Label>
              <div className="flex gap-1">
                <Button
                  variant={studyMode === 'complete' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStudyMode('complete')}
                  className="flex-1"
                >
                  <Library className="h-3 w-3 mr-1" />
                  Completo
                </Button>
                <Button
                  variant={studyMode === 'artist' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStudyMode('artist')}
                  className="flex-1"
                >
                  <Music className="h-3 w-3 mr-1" />
                  Artista
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground mb-1">Corpus Base</Label>
              <Select value={studyCorpus} onValueChange={(v) => setStudyCorpus(v as CorpusType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gaucho">Gaúcho</SelectItem>
                  <SelectItem value="nordestino">Nordestino</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {studyMode === 'artist' && (
              <div>
                <Label className="text-sm text-muted-foreground mb-1">Artista</Label>
                <Select value={studyArtist} onValueChange={setStudyArtist}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {availableArtists.map(artist => (
                      <SelectItem key={artist} value={artist}>
                        {artist}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Badge variant="secondary" className="gap-1">
            <Info className="h-3 w-3" />
            Tamanho estimado: {studyEstimatedSize.toLocaleString()} palavras
          </Badge>
        </div>

        {/* Corpus de Referência (apenas em modo cross-corpus) */}
        {isComparative && (
          <>
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-secondary" />
                <Label className="text-base font-semibold">Corpus de Referência</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm text-muted-foreground mb-1">Corpus Base</Label>
                  <Select value={referenceCorpus} onValueChange={(v) => setReferenceCorpus(v as CorpusType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gaucho">Gaúcho</SelectItem>
                      <SelectItem value="nordestino">Nordestino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground mb-1">Modo</Label>
                  <Select value={referenceMode} onValueChange={(v) => setReferenceMode(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="complete">Completo</SelectItem>
                      <SelectItem value="proportional-sample">Amostra Proporcional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Controle de Proporção */}
              {showRatioControl && referenceMode === 'proportional-sample' && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Percent className="h-3 w-3" />
                    Proporção do Corpus de Referência
                  </Label>

                  <div className="flex gap-2">
                    {ratioPresets.map(ratio => (
                      <Button
                        key={ratio}
                        variant={sizeRatio === ratio && !customRatio ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleRatioPresetClick(ratio)}
                      >
                        {ratio}x
                      </Button>
                    ))}
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        placeholder="Custom"
                        value={customRatio}
                        onChange={(e) => handleCustomRatioChange(e.target.value)}
                        className="w-20 h-9"
                        min="0.1"
                        step="0.5"
                      />
                      <span className="text-sm text-muted-foreground">x</span>
                    </div>
                  </div>

                  <Badge variant="outline" className="gap-1">
                    <Info className="h-3 w-3" />
                    Tamanho alvo: {(studyEstimatedSize * sizeRatio).toLocaleString()} palavras
                  </Badge>
                </div>
              )}
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Amostragem Proporcional:</strong> O sistema selecionará aleatoriamente músicas do corpus de referência
                até atingir {sizeRatio}x o tamanho do corpus de estudo, garantindo comparações estatisticamente válidas.
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
}
