/**
 * 🧪 COMPONENTE DE TESTE - POS ANNOTATOR LAYER 1
 * 
 * Interface de validação visual do sistema de anotação POS
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, Brain, Zap, Database } from 'lucide-react';

interface AnnotatedToken {
  palavra: string;
  lema: string;
  pos: string;
  posDetalhada: string;
  features: Record<string, string>;
  posicao: number;
  source: 'va_grammar' | 'spacy' | 'gemini' | 'cache';
  confidence: number;
}

interface CoverageStats {
  totalTokens: number;
  coveredByVA: number;
  coverageRate: number;
  unknownWords: string[];
  sourceDistribution: Record<string, number>;
}

const SAMPLE_TEXTS = {
  gaucho: `A calma do tarumã ganhou sombra mais copada
Pela várzea espichada com o sol da tarde caindo
Um pañuelo maragato se abriu no horizonte`,
  
  verbs: `eu sou feliz e estava caminhando pelo campo
o gaúcho campeia e laça a tropa no lombo do cavalo`,
  
  pronouns: `meu cavalo e tua prenda estão na querência
eu te amo e ela me vê com carinho`,
  
  mwe: `tomei mate amargo no galpão velho
montei um cavalo gateado de boa tradição`
};

export const POSAnnotatorTest = () => {
  const [inputText, setInputText] = useState(SAMPLE_TEXTS.gaucho);
  const [annotations, setAnnotations] = useState<AnnotatedToken[]>([]);
  const [stats, setStats] = useState<CoverageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAnnotate = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Erro",
        description: "Digite um texto para anotar",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('annotate-pos', {
        body: { text: inputText, mode: 'layer1_only' }
      });

      if (error) throw error;

      setAnnotations(data.annotations);
      setStats(data.stats);

      toast({
        title: "Anotação Concluída",
        description: `${data.annotations.length} tokens anotados com ${data.stats.coverageRate.toFixed(1)}% de cobertura`,
      });
    } catch (error: any) {
      console.error('Erro ao anotar:', error);
      toast({
        title: "Erro na Anotação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPOSColor = (pos: string) => {
    const colors: Record<string, string> = {
      VERB: 'bg-blue-500',
      NOUN: 'bg-green-500',
      ADJ: 'bg-yellow-500',
      ADV: 'bg-purple-500',
      PRON: 'bg-pink-500',
      DET: 'bg-orange-500',
      ADP: 'bg-cyan-500',
      CCONJ: 'bg-red-500',
      UNKNOWN: 'bg-gray-500',
    };
    return colors[pos] || 'bg-gray-400';
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'va_grammar': return <Brain className="w-3 h-3" />;
      case 'cache': return <Zap className="w-3 h-3" />;
      case 'spacy': return <Database className="w-3 h-3" />;
      default: return null;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.95) return 'text-green-600';
    if (confidence >= 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">🧪 Teste do Anotador POS - Layer 1</h2>
        <p className="text-muted-foreground">
          Valide o funcionamento da camada de gramática VA com exemplos de texto
        </p>
      </div>

      {/* Input Area */}
      <Card>
        <CardHeader>
          <CardTitle>Texto para Anotação</CardTitle>
          <CardDescription>
            Digite um texto ou selecione um exemplo abaixo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(SAMPLE_TEXTS).map(([key, text]) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => setInputText(text)}
              >
                {key === 'gaucho' && '🧉 Texto Gaúcho'}
                {key === 'verbs' && '📝 Verbos'}
                {key === 'pronouns' && '👤 Pronomes'}
                {key === 'mwe' && '🔗 MWEs'}
              </Button>
            ))}
          </div>

          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Digite o texto a ser anotado..."
            rows={6}
            className="font-mono"
          />

          <Button 
            onClick={handleAnnotate} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Anotando...
              </>
            ) : (
              'Anotar Texto'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {annotations.length > 0 && stats && (
        <Tabs defaultValue="tokens" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tokens">Tokens Anotados</TabsTrigger>
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
            <TabsTrigger value="unknown">Palavras Desconhecidas</TabsTrigger>
          </TabsList>

          <TabsContent value="tokens" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Anotações POS</CardTitle>
                <CardDescription>
                  {annotations.length} tokens processados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {annotations.map((token, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-lg">
                          {token.palavra}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-mono text-sm text-muted-foreground">
                          {token.lema}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={getPOSColor(token.pos)}>
                          {token.pos}
                        </Badge>
                        {token.posDetalhada !== token.pos && (
                          <Badge variant="outline">
                            {token.posDetalhada}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="gap-1">
                          {getSourceIcon(token.source)}
                          {token.source}
                        </Badge>
                        <span className={`text-xs font-mono ${getConfidenceColor(token.confidence)}`}>
                          {(token.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas de Cobertura</CardTitle>
                <CardDescription>
                  Análise da performance do Layer 1 (VA Grammar)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Coverage Rate */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">Taxa de Cobertura</span>
                    <span className="text-2xl font-bold">
                      {stats.coverageRate.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={stats.coverageRate} className="h-3" />
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats.coveredByVA} de {stats.totalTokens} tokens cobertos pela gramática VA
                  </p>
                </div>

                {/* Source Distribution */}
                <div>
                  <h4 className="font-semibold mb-3">Distribuição por Fonte</h4>
                  <div className="space-y-2">
                    {Object.entries(stats.sourceDistribution).map(([source, count]) => (
                      <div key={source} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSourceIcon(source)}
                          <span className="capitalize">{source}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={(count / stats.totalTokens) * 100} 
                            className="w-32 h-2"
                          />
                          <span className="text-sm font-mono">
                            {count} ({((count / stats.totalTokens) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quality Indicators */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        {stats.coverageRate >= 80 ? (
                          <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                        ) : (
                          <XCircle className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
                        )}
                        <p className="text-sm font-semibold">
                          {stats.coverageRate >= 80 ? 'Excelente Cobertura' : 'Cobertura Moderada'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {stats.coverageRate >= 80 
                            ? 'Layer 1 funciona muito bem neste texto'
                            : 'Considere adicionar mais palavras ao léxico VA'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Brain className="w-12 h-12 mx-auto mb-2 text-blue-500" />
                        <p className="text-sm font-semibold">
                          {stats.unknownWords.length} Palavras Desconhecidas
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {stats.unknownWords.length === 0 
                            ? 'Todas as palavras foram reconhecidas!'
                            : 'Veja a aba "Palavras Desconhecidas"'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unknown" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Palavras Desconhecidas</CardTitle>
                <CardDescription>
                  Tokens que o Layer 1 não conseguiu anotar (confidence = 0)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.unknownWords.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
                    <p className="text-lg font-semibold">
                      Nenhuma palavra desconhecida!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Todas as palavras foram anotadas com sucesso pela gramática VA
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stats.unknownWords.map((word, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <span className="font-mono font-semibold">{word}</span>
                        <Badge variant="destructive">UNKNOWN</Badge>
                      </div>
                    ))}
                    <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm">
                        💡 <strong>Próximo passo:</strong> Estas palavras serão processadas pelo Layer 2 (spaCy) 
                        ou Layer 3 (Gemini) no sistema completo.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
