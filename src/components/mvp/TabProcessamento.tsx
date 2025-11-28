import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CrossCorpusSelectorWithRatio, CrossCorpusSelection } from "@/components/corpus/CrossCorpusSelectorWithRatio";
import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function TabProcessamento() {
  const [selection, setSelection] = useState<CrossCorpusSelection | null>(null);

  // Validação de seleção: apenas Luiz Marenco permitido
  const handleSelectionChange = (newSelection: CrossCorpusSelection) => {
    // Força corpus gaúcho
    const validatedSelection = {
      ...newSelection,
      study: {
        ...newSelection.study,
        corpusType: 'gaucho' as const,
      }
    };
    setSelection(validatedSelection);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Seleção do Corpus de Estudo</CardTitle>
          <CardDescription>
            Escolha o corpus, artista e música para análise semântica
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-primary/20 bg-primary/5">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Para este MVP demonstrativo, apenas a música <strong>"Quando o verso vem pras casa"</strong> de <strong>Luiz Marenco</strong> está disponível para análise.
            </AlertDescription>
          </Alert>

          <CrossCorpusSelectorWithRatio
            mode="study-only"
            showRatioControl={false}
            onSelectionChange={handleSelectionChange}
            availableArtists={['Luiz Marenco']}
            allowedSongTitles={['Quando o verso vem pras casa']}
          />

          {selection && (
            <Card className="border-muted bg-muted/30">
              <CardContent className="pt-4">
                <div className="text-sm space-y-2">
                  <p className="text-muted-foreground">
                    <strong>Corpus:</strong> {selection.study.corpusType === 'gaucho' ? 'Gaúcho' : selection.study.corpusType}
                  </p>
                  <p className="text-muted-foreground">
                    <strong>Modo:</strong> {
                      selection.study.mode === 'complete' ? 'Corpus Completo' :
                      selection.study.mode === 'artist' ? 'Artista Específico' :
                      'Música Específica'
                    }
                  </p>
                  {selection.study.artist && (
                    <p className="text-muted-foreground">
                      <strong>Artista:</strong> {selection.study.artist}
                    </p>
                  )}
                  {selection.study.songId && (
                    <p className="text-muted-foreground">
                      <strong>Música:</strong> Quando o verso vem pras casa
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    <strong>Tamanho estimado:</strong> ~{selection.study.estimatedSize} palavras
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status do Processamento</CardTitle>
          <CardDescription>
            Acompanhe o progresso da análise semântica
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            O processamento será iniciado automaticamente após a seleção da música...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
