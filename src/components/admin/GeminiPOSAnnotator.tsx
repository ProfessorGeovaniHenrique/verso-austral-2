import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface POSToken {
  palavra: string;
  pos?: string;
  lema?: string;
  confidence?: number;
}

export function GeminiPOSAnnotator() {
  const [inputText, setInputText] = useState("");
  const [annotations, setAnnotations] = useState<POSToken[]>([]);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [stats, setStats] = useState<{ total: number; cached: number; annotated: number } | null>(null);

  const handleAnnotate = async () => {
    if (!inputText.trim()) {
      toast.error("Digite um texto para anotar");
      return;
    }

    setIsAnnotating(true);
    try {
      // Tokenize text (simple whitespace split)
      const words = inputText
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 0);

      const tokens: POSToken[] = words.map(word => ({ palavra: word }));

      const { data, error } = await supabase.functions.invoke('annotate-pos-gemini', {
        body: {
          tokens,
          context: inputText,
        },
      });

      if (error) throw error;

      if (data.success) {
        setAnnotations(data.annotations);
        setStats(data.stats);
        toast.success(`✅ ${data.stats.total} palavras anotadas (${data.stats.cached} do cache)`);
      }
    } catch (error: any) {
      console.error('Erro ao anotar:', error);
      toast.error(error.message || "Erro ao processar anotação");
    } finally {
      setIsAnnotating(false);
    }
  };

  const getPOSColor = (pos?: string) => {
    const colors: Record<string, string> = {
      VERB: "bg-blue-500/10 text-blue-700 border-blue-300",
      NOUN: "bg-green-500/10 text-green-700 border-green-300",
      ADJ: "bg-purple-500/10 text-purple-700 border-purple-300",
      ADV: "bg-yellow-500/10 text-yellow-700 border-yellow-300",
      PRON: "bg-pink-500/10 text-pink-700 border-pink-300",
      DET: "bg-orange-500/10 text-orange-700 border-orange-300",
      ADP: "bg-indigo-500/10 text-indigo-700 border-indigo-300",
      CONJ: "bg-teal-500/10 text-teal-700 border-teal-300",
    };
    return colors[pos || ""] || "bg-gray-500/10 text-gray-700 border-gray-300";
  };

  const exampleTexts = [
    "O gaúcho montou o cavalo gateado e saiu pro campo.",
    "Tomo mate amargo todas as manhãs na varanda.",
    "A prenda dançou uma vanera linda no CTG ontem.",
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Anotador POS com Gemini Flash (Layer 3)
          </CardTitle>
          <CardDescription>
            Sistema de fallback usando IA para palavras não cobertas pelos Layers 1 e 2
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Texto para Anotar</label>
            <Textarea
              placeholder="Digite um texto em português (gaúcho ou padrão)..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleAnnotate}
                disabled={isAnnotating || !inputText.trim()}
                className="flex items-center gap-2"
              >
                {isAnnotating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Anotando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Anotar com Gemini
                  </>
                )}
              </Button>
              {exampleTexts.map((text, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => setInputText(text)}
                >
                  Exemplo {i + 1}
                </Button>
              ))}
            </div>
          </div>

          {stats && (
            <Alert>
              <AlertDescription>
                <div className="flex gap-4 text-sm">
                  <span><strong>{stats.total}</strong> palavras processadas</span>
                  <span className="text-green-600"><strong>{stats.cached}</strong> do cache</span>
                  <span className="text-blue-600"><strong>{stats.annotated}</strong> anotadas agora</span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {annotations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Resultado da Anotação POS</h3>
              <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg">
                {annotations.map((token, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <Badge variant="outline" className={getPOSColor(token.pos)}>
                      {token.palavra}
                    </Badge>
                    <span className="text-xs text-muted-foreground mt-1">
                      {token.pos || "?"}
                    </span>
                    {token.lema && token.lema !== token.palavra && (
                      <span className="text-xs text-muted-foreground italic">
                        ({token.lema})
                      </span>
                    )}
                    {token.confidence && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(token.confidence * 100)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Legenda:</strong></p>
            <div className="grid grid-cols-2 gap-2">
              <span><Badge className="bg-blue-500/10 text-blue-700">VERB</Badge> Verbo</span>
              <span><Badge className="bg-green-500/10 text-green-700">NOUN</Badge> Substantivo</span>
              <span><Badge className="bg-purple-500/10 text-purple-700">ADJ</Badge> Adjetivo</span>
              <span><Badge className="bg-yellow-500/10 text-yellow-700">ADV</Badge> Advérbio</span>
              <span><Badge className="bg-pink-500/10 text-pink-700">PRON</Badge> Pronome</span>
              <span><Badge className="bg-orange-500/10 text-orange-700">DET</Badge> Determinante</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
