import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { HierarchicalTagsetSelector } from './HierarchicalTagsetSelector';
import { useNCWordValidation } from '@/hooks/useNCWordValidation';
import { extractKWICContext, KWICResult } from '@/lib/kwicUtils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';

interface NCWord {
  palavra: string;
  confianca: number;
  contexto_hash: string;
  song_id?: string;
}

interface NCWordValidationModalProps {
  word: NCWord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NCWordValidationModal({ word, open, onOpenChange, onSuccess }: NCWordValidationModalProps) {
  const [selectedTagset, setSelectedTagset] = useState<{ codigo: string; nome: string } | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [aplicarATodas, setAplicarATodas] = useState(true);

  const { submitValidation, isSubmitting } = useNCWordValidation();

  // Buscar letra da música para extrair KWIC
  const { data: songData, isLoading: loadingSong } = useQuery({
    queryKey: ['song-lyrics', word?.song_id],
    queryFn: async () => {
      if (!word?.song_id) return null;
      
      const { data, error } = await supabase
        .from('songs')
        .select('title, lyrics, artist_id')
        .eq('id', word.song_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!word?.song_id && open
  });

  // Extrair contexto KWIC
  const kwicResults: KWICResult[] = useMemo(() => {
    if (!songData?.lyrics || !word?.palavra) return [];
    return extractKWICContext(songData.lyrics, word.palavra, 50);
  }, [songData?.lyrics, word?.palavra]);

  const handleSave = () => {
    if (!word || !selectedTagset) return;

    submitValidation({
      palavra: word.palavra,
      tagset_codigo_novo: selectedTagset.codigo,
      tagset_nome: selectedTagset.nome,
      justificativa: justificativa.trim() || undefined,
      aplicar_a_todas: aplicarATodas,
      contexto_hash: word.contexto_hash,
      song_id: word.song_id
    }, {
      onSuccess: () => {
        onOpenChange(false);
        onSuccess?.();
        // Reset form
        setSelectedTagset(null);
        setJustificativa('');
        setAplicarATodas(true);
      }
    });
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      setSelectedTagset(null);
      setJustificativa('');
      setAplicarATodas(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📝 Validar Classificação: 
            <span className="font-mono text-primary">&quot;{word?.palavra}&quot;</span>
          </DialogTitle>
          <DialogDescription>
            Selecione o domínio semântico adequado para esta palavra com base no contexto de uso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contexto KWIC */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">📋 Contexto KWIC (Key Word In Context)</Label>
            {loadingSong ? (
              <div className="flex items-center justify-center py-4 border rounded-lg bg-muted/50">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Carregando contexto...</span>
              </div>
            ) : kwicResults.length > 0 ? (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                {kwicResults.map((kwic, index) => (
                  <div key={index} className="text-sm font-mono leading-relaxed">
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
            ) : (
              <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/30 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Contexto não disponível para esta palavra</span>
              </div>
            )}
          </div>

          {/* Status Atual */}
          <div className="flex items-center gap-2">
            <Label className="text-base font-semibold">🏷️ Classificação Atual:</Label>
            <Badge variant="destructive" className="text-xs">
              NC (Não Classificado)
            </Badge>
          </div>

          {/* Seletor Hierárquico */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">📂 Selecione o Domínio Semântico</Label>
            <div className="border rounded-lg p-4 bg-card">
              <HierarchicalTagsetSelector
                value={selectedTagset?.codigo || null}
                onChange={(codigo, nome) => setSelectedTagset({ codigo, nome })}
              />
            </div>
          </div>

          {/* Justificativa */}
          <div className="space-y-2">
            <Label htmlFor="justificativa" className="text-base font-semibold">
              📝 Justificativa (opcional)
            </Label>
            <Textarea
              id="justificativa"
              placeholder="Ex: 'Copada' refere-se à copa de uma árvore, portanto pertence ao domínio de Flora..."
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              rows={3}
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
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              ☑️ Aplicar classificação a <strong>todas as ocorrências</strong> desta palavra
            </Label>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedTagset || isSubmitting}
          >
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
