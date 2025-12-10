import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Plus, AlertCircle, Save, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditVerbeteDialogProps {
  entry: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Definition {
  texto: string;
  ordem: number;
}

export function EditVerbeteDialog({ entry, open, onOpenChange, onSuccess }: EditVerbeteDialogProps) {
  const [editedVerbete, setEditedVerbete] = useState('');
  const [editedPOS, setEditedPOS] = useState('');
  const [editedDefinitions, setEditedDefinitions] = useState<Definition[]>([]);
  const [editedSynonyms, setEditedSynonyms] = useState<string[]>([]);
  const [editedVariantes, setEditedVariantes] = useState<string[]>([]);
  const [editedContextos, setEditedContextos] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [newSynonym, setNewSynonym] = useState('');
  const [newVariante, setNewVariante] = useState('');

  useEffect(() => {
    if (entry) {
      setEditedVerbete(entry.verbete || '');
      setEditedPOS(entry.classe_gramatical || '');
      
      const defs = entry.definicoes || [];
      setEditedDefinitions(
        defs.map((def: any, idx: number) => ({
          texto: typeof def === 'string' ? def : def.texto || '',
          ordem: idx + 1,
        }))
      );
      
      setEditedSynonyms(entry.sinonimos || []);
      setEditedVariantes(entry.variantes || []);
      setEditedContextos(
        typeof entry.contextos_culturais === 'string' 
          ? entry.contextos_culturais 
          : entry.contextos_culturais?.exemplo || ''
      );
      setHasChanges(false);
    }
  }, [entry]);

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!editedVerbete?.trim()) {
      errors.push('O verbete não pode estar vazio');
    }
    
    if (editedDefinitions.length === 0) {
      errors.push('Adicione pelo menos uma definição');
    }
    
    if (editedDefinitions.some(d => !d.texto?.trim())) {
      errors.push('Todas as definições devem ter texto');
    }
    
    if (!editedPOS) {
      errors.push('Selecione a classe gramatical');
    }
    
    return errors;
  };

  const handleSave = async () => {
    const errors = validateForm();
    
    if (errors.length > 0) {
      toast.error(errors.join('. '));
      return;
    }

    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('dialectal_lexicon')
        .update({
          verbete: editedVerbete.trim(),
          classe_gramatical: editedPOS,
          definicoes: editedDefinitions.map(d => ({ texto: d.texto.trim(), ordem: d.ordem })),
          sinonimos: editedSynonyms.filter(s => s.trim()),
          variantes: editedVariantes.filter(v => v.trim()),
          contextos_culturais: editedContextos ? { exemplo: editedContextos } : null,
          atualizado_em: new Date().toISOString(),
          manually_edited: true,
        })
        .eq('id', entry.id);

      if (error) throw error;

      toast.success('✅ Verbete atualizado com sucesso!');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const addDefinition = () => {
    setEditedDefinitions([
      ...editedDefinitions,
      { texto: '', ordem: editedDefinitions.length + 1 }
    ]);
    setHasChanges(true);
  };

  const updateDefinition = (index: number, texto: string) => {
    const updated = [...editedDefinitions];
    updated[index].texto = texto;
    setEditedDefinitions(updated);
    setHasChanges(true);
  };

  const removeDefinition = (index: number) => {
    const updated = editedDefinitions.filter((_, i) => i !== index);
    // Reordenar
    updated.forEach((def, idx) => {
      def.ordem = idx + 1;
    });
    setEditedDefinitions(updated);
    setHasChanges(true);
  };

  const addSynonym = () => {
    if (newSynonym.trim() && !editedSynonyms.includes(newSynonym.trim())) {
      setEditedSynonyms([...editedSynonyms, newSynonym.trim()]);
      setNewSynonym('');
      setHasChanges(true);
    }
  };

  const removeSynonym = (index: number) => {
    setEditedSynonyms(editedSynonyms.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const addVariante = () => {
    if (newVariante.trim() && !editedVariantes.includes(newVariante.trim())) {
      setEditedVariantes([...editedVariantes, newVariante.trim()]);
      setNewVariante('');
      setHasChanges(true);
    }
  };

  const removeVariante = (index: number) => {
    setEditedVariantes(editedVariantes.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  // Sprint AUDIT-P2: AlertDialog ao invés de window.confirm
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const handleClose = () => {
    if (hasChanges) {
      setShowDiscardDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardDialog(false);
    onOpenChange(false);
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Verbete: "{entry.verbete}"
          </DialogTitle>
          <DialogDescription>
            Edite o conteúdo textual do verbete. As alterações serão marcadas como edição manual.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <Tabs defaultValue="essencial" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="essencial">Essencial</TabsTrigger>
              <TabsTrigger value="avancado">Avançado</TabsTrigger>
            </TabsList>

            <TabsContent value="essencial" className="space-y-4 mt-4">
              {/* Verbete */}
              <div className="space-y-2">
                <Label htmlFor="verbete">Verbete *</Label>
                <Input
                  id="verbete"
                  value={editedVerbete}
                  onChange={(e) => {
                    setEditedVerbete(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="Ex: chimarrão"
                />
              </div>

              {/* Classe Gramatical */}
              <div className="space-y-2">
                <Label htmlFor="pos">Classe Gramatical *</Label>
                <Select
                  value={editedPOS}
                  onValueChange={(value) => {
                    setEditedPOS(value);
                    setHasChanges(true);
                  }}
                >
                  <SelectTrigger id="pos">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="s.m.">s.m. (substantivo masculino)</SelectItem>
                    <SelectItem value="s.f.">s.f. (substantivo feminino)</SelectItem>
                    <SelectItem value="adj.">adj. (adjetivo)</SelectItem>
                    <SelectItem value="v.t.d.">v.t.d. (verbo transitivo direto)</SelectItem>
                    <SelectItem value="v.i.">v.i. (verbo intransitivo)</SelectItem>
                    <SelectItem value="fraseol.">fraseol. (fraseologia)</SelectItem>
                    <SelectItem value="adv.">adv. (advérbio)</SelectItem>
                    <SelectItem value="interj.">interj. (interjeição)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Definições */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Definições *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDefinition}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {editedDefinitions.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhuma definição adicionada. Clique em "Adicionar" para criar uma.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {editedDefinitions.map((def, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <Badge variant="outline" className="mt-2 flex-shrink-0">
                          {idx + 1}
                        </Badge>
                        <Textarea
                          value={def.texto}
                          onChange={(e) => updateDefinition(idx, e.target.value)}
                          placeholder="Digite a definição..."
                          rows={2}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDefinition(idx)}
                          className="mt-1 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="avancado" className="space-y-4 mt-4">
              {/* Sinônimos */}
              <div className="space-y-2">
                <Label>Sinônimos</Label>
                <div className="flex gap-2">
                  <Input
                    value={newSynonym}
                    onChange={(e) => setNewSynonym(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSynonym();
                      }
                    }}
                    placeholder="Digite um sinônimo e pressione Enter"
                  />
                  <Button type="button" variant="outline" onClick={addSynonym}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {editedSynonyms.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editedSynonyms.map((syn, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1">
                        {syn}
                        <button
                          type="button"
                          onClick={() => removeSynonym(idx)}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Variantes */}
              <div className="space-y-2">
                <Label>Variantes</Label>
                <div className="flex gap-2">
                  <Input
                    value={newVariante}
                    onChange={(e) => setNewVariante(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addVariante();
                      }
                    }}
                    placeholder="Digite uma variante e pressione Enter"
                  />
                  <Button type="button" variant="outline" onClick={addVariante}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {editedVariantes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editedVariantes.map((variant, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1">
                        {variant}
                        <button
                          type="button"
                          onClick={() => removeVariante(idx)}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Contextos Culturais */}
              <div className="space-y-2">
                <Label htmlFor="contextos">Contextos Culturais</Label>
                <Textarea
                  id="contextos"
                  value={editedContextos}
                  onChange={(e) => {
                    setEditedContextos(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="Descreva o contexto cultural de uso..."
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* AlertDialog para descartar alterações */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Tem certeza que deseja descartá-las?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDiscard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
