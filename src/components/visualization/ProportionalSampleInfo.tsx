import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, Check, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProportionalSampleInfoProps {
  studySize: number;
  referenceSize: number;
  targetSize: number;
  ratio: number;
  samplingMethod: 'complete' | 'proportional-sample';
  warnings?: string[];
}

export function ProportionalSampleInfo({
  studySize,
  referenceSize,
  targetSize,
  ratio,
  samplingMethod,
  warnings = []
}: ProportionalSampleInfoProps) {
  const actualRatio = referenceSize / studySize;
  const isComplete = samplingMethod === 'complete';

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">Informações da Amostragem</h4>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Corpus de Estudo</p>
            <Badge variant="secondary" className="w-full justify-center">
              {studySize.toLocaleString()} palavras
            </Badge>
          </div>

          <div>
            <p className="text-muted-foreground mb-1">Corpus de Referência</p>
            <Badge variant="secondary" className="w-full justify-center">
              {referenceSize.toLocaleString()} palavras
            </Badge>
          </div>

          <div>
            <p className="text-muted-foreground mb-1">Proporção Real</p>
            <Badge variant="outline" className="w-full justify-center">
              {actualRatio.toFixed(2)}x
            </Badge>
          </div>

          <div>
            <p className="text-muted-foreground mb-1">Método</p>
            <Badge variant="default" className="w-full justify-center gap-1">
              {isComplete ? 'Completo' : 'Amostra'}
            </Badge>
          </div>
        </div>

        {!isComplete && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
            <Check className="h-3 w-3 mt-0.5 text-green-500 shrink-0" />
            <p>
              Amostragem proporcional aplicada: {ratio}x o tamanho do corpus de estudo.
              Músicas foram selecionadas aleatoriamente até atingir aproximadamente {targetSize.toLocaleString()} palavras.
            </p>
          </div>
        )}

        {warnings.length > 0 && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 text-xs">
                {warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
