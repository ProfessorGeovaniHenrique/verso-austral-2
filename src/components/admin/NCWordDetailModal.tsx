import { useState, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { HierarchicalTagsetSelector } from './HierarchicalTagsetSelector';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { extractKWICContext, KWICResult } from '@/lib/kwicUtils';
import { Loader2, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { NCWord, NCSuggestion } from '@/hooks/useNCCuration';

interface NCWordDetailModalProps {
  word: NCWord | null;
  suggestion?: NCSuggestion;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NCWordDetailModal({ 
  word, 
  suggestion, 
  open, 
  onOpenChange, 
  onSuccess 
}: NCWordDetailModalProps) {
  const queryClient = useQueryClient();
  const [selectedTagset, setSelectedTagset] = useState<{ codigo: string; nome: string } | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [aplicarATodas, setAplicarATodas] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Buscar todas as ocorrências com contexto KWIC
  const { data: occurrences, isLoading: loadingOccurrences } = useQuery({
    queryKey: ['nc-word-occurrences', word?.palavra],
    queryFn: async () => {
      if (!word) return [];

      // Buscar todas as ocorrências desta palavra
      const { data: cacheEntries } = await supabase
        .from('semantic_disambiguation_cache')
        .select('song_id, contexto_hash')
        .eq('palavra', word.palavra)
        .eq('tagset_codigo', 'NC')
        .limit(20);

      if (!cacheEntries || cacheEntries.length === 0) return [];

      // Buscar letras das músicas para KWIC
      const songIds = [...new Set(cacheEntries.map(e => e.song_id).filter(Boolean))];
      
      if (songIds.length === 0) return [];

      const { data: songs } = await supabase
        .from('songs')
        .select('id, title, lyrics, artist_id')
        .in('id', songIds);

      // Extrair KWIC de cada música
      const results: { songTitle: string; kwic: KWICResult[] }[] = [];
      
      for (const song of songs || []) {
        if (!song.lyrics) continue;
        const kwicResults = extractKWICContext(song.lyrics, word.palavra, 50);
        if (kwicResults.length > 0) {
          results.push({
            songTitle: song.title,
            kwic: kwicResults
          });
        }
      }

      return results;
    },
    enabled: !!word && open
  });

  // Pré-selecionar sugestão se existir
  useMemo(() => {
    if (suggestion && open) {
      setSelectedTagset({
        codigo: suggestion.tagset_sugerido,
        nome: suggestion.tagset_nome
      });
      setJustificativa(suggestion.justificativa);
    }
  }, [suggestion, open]);

  const handleSave = async () => {
    if (!word || !selectedTagset) return;

    setIsSubmitting(true);
    try {
      // Atualizar cache semântico
      const updateQuery = supabase
        .from('semantic_disambiguation_cache')
        .update({ 
          tagset_codigo: selectedTagset.codigo,
          confianca: 0.95
        });

      if (aplicarATodas) {
        await updateQuery.eq('palavra', word.palavra);
      } else {
        await updateQuery
          .eq('palavra', word.palavra)
          .eq('contexto_hash', word.contexto_hash);
      }

      // Registrar validação humana
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('human_validations').insert({
          palavra: word.palavra,
          tagset_original: 'NC',
          tagset_corrigido: selectedTagset.codigo,
          justificativa: justificativa.trim() || undefined,
          user_id: user.id,
          aplicado: true
        });
      }

      toast.success(`"${word.palavra}" classificada como ${selectedTagset.nome}`);
      queryClient.invalidateQueries({ queryKey: ['nc-words-curation'] });
      queryClient.invalidateQueries({ queryKey: ['nc-words'] });
      onSuccess?.();
      handleClose();
    } catch (error) {
      toast.error('Erro ao salvar classificação: ' + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      setSelectedTagset(null);
      setJustificativa('');
      setAplicarATodas(true);
    }
  };

  const handleApplySuggestion = () => {
    if (suggestion) {
      setSelectedTagset({
        codigo: suggestion.tagset_sugerido,
        nome: suggestion.tagset_nome
      });
      setJustificativa(suggestion.justificativa);
    }
  };

  const totalOccurrences = occurrences?.reduce((sum, o) => sum + o.kwic.length, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📝 Classificar: 
            <span className="font-mono text-primary">&quot;{word?.palavra}&quot;</span>
            <Badge variant="destructive" className="ml-2">NC</Badge>
          </DialogTitle>
          <DialogDescription>
            {totalOccurrences} ocorrências encontradas no corpus
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* Sugestão de IA */}
          {suggestion && (
            <div className="border rounded-lg p-4 bg-primary/5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="font-medium">Sugestão de IA</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={suggestion.fonte === 'dialectal_lexicon' ? 'default' : 'secondary'}>
                    {suggestion.fonte === 'dialectal_lexicon' && '📚 Léxico'}
                    {suggestion.fonte === 'pattern_match' && '🔤 Padrão'}
                    {suggestion.fonte === 'ai_gemini' && '🤖 Gemini'}
                  </Badge>
                  <Badge variant="outline">
                    {Math.round(suggestion.confianca * 100)}% confiança
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{suggestion.tagset_nome}</span>
                  <span className="text-muted-foreground ml-2 font-mono text-sm">
                    ({suggestion.tagset_sugerido})
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={handleApplySuggestion}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Aplicar
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{suggestion.justificativa}</p>
            </div>
          )}

          {/* Contexto KWIC */}
          <div className="space-y-2">
            <Label className="font-semibold">📋 Contexto KWIC</Label>
            {loadingOccurrences ? (
              <div className="flex items-center justify-center py-4 border rounded-lg bg-muted/50">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Carregando contextos...</span>
              </div>
            ) : occurrences && occurrences.length > 0 ? (
              <ScrollArea className="h-[150px] border rounded-lg p-3 bg-muted/30">
                {occurrences.map((occurrence, oi) => (
                  <div key={oi} className="mb-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      🎵 {occurrence.songTitle}
                    </div>
                    {occurrence.kwic.map((kwic, ki) => (
                      <div key={ki} className="text-sm font-mono leading-relaxed mb-1">
                        <span className="text-muted-foreground">{kwic.leftContext}</span>
                        {' '}
                        <span className="font-bold text-primary bg-primary/10 px-1 rounded">
                          [{kwic.keyword.toUpperCase()}]
                        </span>
                        {' '}
                        <span className="text-muted-foreground">{kwic.rightContext}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </ScrollArea>
            ) : (
              <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/30 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Contexto não disponível</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Seletor de Domínio */}
          <div className="space-y-2">
            <Label className="font-semibold">📂 Selecione o Domínio Semântico</Label>
            <div className="border rounded-lg p-3 bg-card max-h-[200px] overflow-y-auto">
              <HierarchicalTagsetSelector
                value={selectedTagset?.codigo || null}
                onChange={(codigo, nome) => setSelectedTagset({ codigo, nome })}
              />
            </div>
            {selectedTagset && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Selecionado:</span>
                <Badge variant="default">{selectedTagset.nome}</Badge>
                <span className="font-mono text-muted-foreground">({selectedTagset.codigo})</span>
              </div>
            )}
          </div>

          {/* Justificativa */}
          <div className="space-y-2">
            <Label htmlFor="justificativa" className="font-semibold">
              📝 Justificativa (opcional)
            </Label>
            <Textarea
              id="justificativa"
              placeholder="Explique brevemente a classificação..."
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Aplicar a todas */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="aplicar-todas"
              checked={aplicarATodas}
              onCheckedChange={(checked) => setAplicarATodas(checked === true)}
            />
            <Label
              htmlFor="aplicar-todas"
              className="text-sm cursor-pointer"
            >
              Aplicar a <strong>todas as {totalOccurrences} ocorrências</strong> desta palavra
            </Label>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!selectedTagset || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>✓ Salvar Classificação</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
