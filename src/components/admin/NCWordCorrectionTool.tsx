import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Edit3, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface NCWord {
  palavra: string;
  confianca: number;
  contexto_hash: string;
  song_id?: string;
  occurrences?: number;
  needs_correction?: boolean;
}

interface SuggestedCorrection {
  palavra: string;
  suggestion: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  isManuallyMarked?: boolean;
}

export function NCWordCorrectionTool() {
  const queryClient = useQueryClient();
  const [selectedWord, setSelectedWord] = useState<NCWord | null>(null);
  const [correction, setCorrection] = useState('');

  // Buscar palavras NC suspeitas (> 10 chars, padrões anômalos) + marcadas manualmente
  const { data: ncWords, isLoading } = useQuery({
    queryKey: ['nc-words-suspicious'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semantic_disambiguation_cache')
        .select('palavra, confianca, contexto_hash, song_id, needs_correction')
        .eq('tagset_codigo', 'NC')
        .order('palavra');

      if (error) throw error;

      // Agrupar por palavra e contar ocorrências
      const grouped = new Map<string, NCWord>();
      data?.forEach(item => {
        const existing = grouped.get(item.palavra);
        if (existing) {
          existing.occurrences = (existing.occurrences || 1) + 1;
          // Manter needs_correction se qualquer ocorrência tiver
          if (item.needs_correction) existing.needs_correction = true;
        } else {
          grouped.set(item.palavra, { ...item, occurrences: 1 });
        }
      });

      // Filtrar palavras suspeitas OU marcadas manualmente
      return Array.from(grouped.values())
        .filter(w => 
          w.needs_correction || // ✨ Incluir marcadas manualmente
          w.palavra.length > 10 || // Palavras muito longas
          !w.palavra.includes(' ') && w.palavra.length > 15 || // Sem espaço e muito longa
          /[a-z][A-Z]/.test(w.palavra) // CamelCase acidental
        )
        .sort((a, b) => {
          // Priorizar marcadas manualmente
          if (a.needs_correction && !b.needs_correction) return -1;
          if (!a.needs_correction && b.needs_correction) return 1;
          return (b.occurrences || 0) - (a.occurrences || 0);
        });
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Sugerir correções automaticamente
  const suggestions: SuggestedCorrection[] = ncWords?.map(word => {
    const suggestion = suggestCorrection(word.palavra);
    return {
      palavra: word.palavra,
      suggestion: suggestion.text,
      reason: word.needs_correction ? 'Marcada manualmente para correção' : suggestion.reason,
      confidence: suggestion.confidence,
      isManuallyMarked: word.needs_correction,
    };
  }) || [];

  // Mutation para aplicar correção
  const applyCorrection = useMutation({
    mutationFn: async ({ original, corrected }: { original: string; corrected: string }) => {
      // 1. Buscar todas ocorrências da palavra incorreta
      const { data: occurrences, error: fetchError } = await supabase
        .from('semantic_disambiguation_cache')
        .select('*')
        .eq('palavra', original);

      if (fetchError) throw fetchError;

      // 2. Limpar flag needs_correction e deletar ocorrências antigas
      const { error: deleteError } = await supabase
        .from('semantic_disambiguation_cache')
        .delete()
        .eq('palavra', original);

      if (deleteError) throw deleteError;

      // 3. Adicionar correção ao dicionário via edge function
      const { error: addError } = await supabase.functions.invoke('add-text-correction', {
        body: { wrong: original, correct: corrected }
      });

      if (addError) throw addError;

      return { original, corrected, count: occurrences?.length || 0 };
    },
    onSuccess: (data) => {
      toast.success(`Correção aplicada: "${data.original}" → "${data.corrected}" (${data.count} ocorrências)`);
      queryClient.invalidateQueries({ queryKey: ['nc-words-suspicious'] });
      setSelectedWord(null);
      setCorrection('');
    },
    onError: (error) => {
      toast.error('Erro ao aplicar correção: ' + (error as Error).message);
    },
  });

  const handleOpenDialog = (word: NCWord, suggestedCorrection: string) => {
    setSelectedWord(word);
    setCorrection(suggestedCorrection);
  };

  const handleApply = () => {
    if (!selectedWord || !correction.trim()) return;
    applyCorrection.mutate({ original: selectedWord.palavra, corrected: correction.trim() });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Correção de Palavras NC
          </CardTitle>
          <CardDescription>
            Palavras não classificadas com erros de digitação detectados ({ncWords?.length || 0} palavras)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!ncWords || ncWords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-success" />
              <p>Nenhuma palavra suspeita detectada!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Palavra Incorreta</TableHead>
                  <TableHead>Sugestão</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Ocorrências</TableHead>
                  <TableHead>Confiança</TableHead>
                  <TableHead>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map((item, idx) => {
                  const word = ncWords.find(w => w.palavra === item.palavra);
                  if (!word) return null;

                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-mono">
                        <div className="flex items-center gap-2">
                          {item.palavra}
                          {item.isManuallyMarked && (
                            <Badge variant="default" className="text-xs bg-primary/80">
                              ✋ Manual
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-primary">
                        {item.suggestion}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.reason}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{word.occurrences}x</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.confidence === 'high'
                              ? 'default'
                              : item.confidence === 'medium'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {item.confidence === 'high' ? 'Alta' : item.confidence === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDialog(word, item.suggestion)}
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          Corrigir
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedWord} onOpenChange={() => setSelectedWord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corrigir Palavra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Palavra Incorreta</label>
              <div className="font-mono text-lg font-semibold text-destructive">
                {selectedWord?.palavra}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Correção</label>
              <Input
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                placeholder="Digite a palavra correta"
                className="font-mono"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Esta correção será aplicada a <strong>{selectedWord?.occurrences || 0}</strong> ocorrências
              e adicionada ao dicionário de correções.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedWord(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleApply}
              disabled={!correction.trim() || applyCorrection.isPending}
            >
              {applyCorrection.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aplicando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Aplicar Correção
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Sugere correção para palavra suspeita
 */
function suggestCorrection(word: string): {
  text: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
} {
  // Heurística 1: CamelCase acidental
  const camelMatch = word.match(/^([a-zà-ú]+)([A-ZÀ-Ú][a-zà-ú]+)$/);
  if (camelMatch) {
    return {
      text: `${camelMatch[1]} ${camelMatch[2].toLowerCase()}`,
      reason: 'CamelCase detectado',
      confidence: 'high',
    };
  }

  // Heurística 2: Clíticos colados (sem hífen)
  const clitics = ['me', 'te', 'se', 'lhe', 'nos', 'vos'];
  for (const clitic of clitics) {
    if (word.endsWith(clitic) && word.length > clitic.length + 3) {
      const base = word.slice(0, -clitic.length);
      return {
        text: `${base} ${clitic}`,
        reason: `Clítico "${clitic}" colado`,
        confidence: 'high',
      };
    }
  }

  // Heurística 3: Palavras coladas óbvias (padrão comum em corpus gaúcho)
  const commonPatterns = [
    { pattern: /^(.*)(noel|natal|gaucho|gaúcho|pago|prenda)$/i, confidence: 'medium' as const },
    { pattern: /^(saudades?|querência)(do|da|de|minha?)$/i, confidence: 'high' as const },
    { pattern: /^(galpão|campo|tropa)(velho|velha|mansa?)$/i, confidence: 'high' as const },
  ];

  for (const { pattern, confidence } of commonPatterns) {
    const match = word.match(pattern);
    if (match) {
      return {
        text: `${match[1]} ${match[2]}`,
        reason: 'Padrão comum de palavras coladas',
        confidence,
      };
    }
  }

  // Heurística 4: Palavra muito longa sem espaço
  if (word.length > 15) {
    // Tentar dividir no meio
    const mid = Math.floor(word.length / 2);
    return {
      text: `${word.slice(0, mid)} ${word.slice(mid)}`,
      reason: 'Palavra muito longa (provável junção)',
      confidence: 'low',
    };
  }

  // Sem sugestão óbvia
  return {
    text: word,
    reason: 'Verificação manual necessária',
    confidence: 'low',
  };
}
