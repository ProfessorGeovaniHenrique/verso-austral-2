import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { useBlauNunesClassification } from '@/hooks/useBlauNunesClassification';
import { KWICResult } from '@/lib/kwicUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BlauNunesSuggestionPanelProps {
  palavra: string;
  kwicResults: KWICResult[];
  selectedPOS: string | null;
  isSpellingDeviation: boolean;
  formaPadrao?: string;
  isMWE: boolean;
  mweText?: string;
  onSuggestionApply?: (suggestion: {
    tagsetCode: string;
    tagsetNome: string;
    pos: string;
    lema: string;
    justificativa: string;
  }) => void;
  disabled?: boolean;
}

export function BlauNunesSuggestionPanel({
  palavra,
  kwicResults,
  selectedPOS,
  isSpellingDeviation,
  formaPadrao,
  isMWE,
  mweText,
  onSuggestionApply,
  disabled = false,
}: BlauNunesSuggestionPanelProps) {
  const { isAsking, response, askForClassification, stopAsking, clearResponse, parseResponse } = useBlauNunesClassification();
  const [showResponse, setShowResponse] = useState(false);

  const handleAsk = () => {
    setShowResponse(true);
    askForClassification({
      palavra,
      kwicResults,
      selectedPOS,
      currentTagset: null,
      isSpellingDeviation,
      formaPadrao,
      isMWE,
      mweText,
    });
  };

  const handleApplySuggestion = () => {
    const suggestion = parseResponse(response);
    if (suggestion && onSuggestionApply) {
      onSuggestionApply(suggestion);
      setShowResponse(false);
      clearResponse();
    }
  };

  const handleCancel = () => {
    stopAsking();
    setShowResponse(false);
    clearResponse();
  };

  const parsedSuggestion = response ? parseResponse(response) : null;
  const canApply = !isAsking && parsedSuggestion !== null;

  return (
    <div className="space-y-3">
      {!showResponse ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleAsk}
          disabled={disabled || isAsking}
          className="w-full sm:w-auto gap-2"
        >
          <Sparkles className="h-4 w-4" />
          🧙 Perguntar ao Blau Nunes
        </Button>
      ) : (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="font-semibold text-primary">Sugestão do Blau Nunes</span>
              </div>
              {isAsking && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={stopAsking}
                  className="text-xs"
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Parar
                </Button>
              )}
            </div>

            {/* Response Area */}
            <div className="min-h-[100px] p-4 rounded-lg bg-background/50 border">
              {isAsking && !response && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-3 text-sm text-muted-foreground">
                    Analisando contexto...
                  </span>
                </div>
              )}
              
              {response && (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {response}
                  </pre>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3">
              {canApply && (
                <Alert className="flex-1 py-2 border-green-500/20 bg-green-500/5">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-xs ml-2">
                    Sugestão pronta para aplicar
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isAsking}
                >
                  {isAsking ? 'Processando...' : 'Fechar'}
                </Button>
                {canApply && (
                  <Button
                    size="sm"
                    onClick={handleApplySuggestion}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Aplicar Sugestão
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
