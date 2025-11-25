import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, X, Loader2, AlertTriangle } from 'lucide-react';
import { useTagsets } from '@/hooks/useTagsets';
import { toast } from 'sonner';
import { validateNivelAndPai } from '@/lib/tagsetValidation';
import { cn } from '@/lib/utils';

const editTagsetSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  descricao: z.string().max(500, 'Descrição deve ter no máximo 500 caracteres').optional(),
  exemplos: z.array(z.object({ value: z.string().min(1) })).optional(),
  nivel_profundidade: z.number().min(1).max(4),
  categoria_pai: z.string().optional(),
}).refine(
  (data) => data.nivel_profundidade === 1 || (data.categoria_pai && data.categoria_pai.trim() !== ''),
  {
    message: "Domínios de nível 2-4 devem ter uma categoria pai",
    path: ["categoria_pai"],
  }
);

type EditTagsetForm = z.infer<typeof editTagsetSchema>;

interface TagsetData {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  exemplos: string[] | null;
  nivel_profundidade: number | null;
  categoria_pai: string | null;
}

interface EditTagsetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tagset: TagsetData | null;
  availableParents: Array<{ codigo: string; nome: string }>;
}

export function EditTagsetDialog({
  isOpen,
  onClose,
  tagset,
  availableParents,
}: EditTagsetDialogProps) {
  const { updateTagset, tagsets } = useTagsets();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // ✅ VALIDAÇÃO: Filtrar pais para prevenir ciclos hierárquicos
  const getAvailableParents = (currentTagset: TagsetData | null): Array<{ codigo: string; nome: string }> => {
    if (!currentTagset) return availableParents;

    const descendants = new Set<string>();
    const visited = new Set<string>(); // Proteção contra ciclos
    
    const collectDescendants = (codigo: string) => {
      // Evitar recursão infinita
      if (visited.has(codigo)) return;
      visited.add(codigo);
      descendants.add(codigo);
      
      // Buscar filhos usando os tagsets completos
      const children = tagsets?.filter(t => t.categoria_pai === codigo) || [];
      children.forEach(child => collectDescendants(child.codigo));
    };
    
    collectDescendants(currentTagset.codigo);
    
    return availableParents.filter(t => 
      t.codigo !== currentTagset.codigo && 
      !descendants.has(t.codigo)
    );
  };

  const filteredParents = getAvailableParents(tagset);

  const form = useForm<EditTagsetForm>({
    resolver: zodResolver(editTagsetSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      exemplos: [],
      nivel_profundidade: 1,
      categoria_pai: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'exemplos',
  });

  const [newExemplo, setNewExemplo] = React.useState('');

  useEffect(() => {
    if (tagset) {
      form.reset({
        nome: tagset.nome,
        descricao: tagset.descricao || '',
        exemplos: (tagset.exemplos || []).map(e => ({ value: e })),
        nivel_profundidade: tagset.nivel_profundidade || 1,
        categoria_pai: tagset.categoria_pai || '',
      });
    }
  }, [tagset, form]);

  const handleAddExemplo = () => {
    if (newExemplo.trim()) {
      append({ value: newExemplo.trim() });
      setNewExemplo('');
    }
  };

  const onSubmit = async (data: EditTagsetForm) => {
    if (!tagset) return;

    setIsSubmitting(true);
    try {
      // 🔥 FASE 3: Validação robusta antes do submit
      console.log('[EditTagsetDialog] Validando dados antes do submit:', {
        nivel_profundidade: data.nivel_profundidade,
        categoria_pai: data.categoria_pai,
        codigo: tagset.codigo,
      });

      // Validação centralizada
      const validation = validateNivelAndPai(data.nivel_profundidade, data.categoria_pai);
      if (!validation.valid) {
        console.error('[EditTagsetDialog] Falha na validação:', validation.error);
        toast.error(validation.error || 'Erro de validação');
        setIsSubmitting(false);
        return;
      }

      // Validação adicional para nível 2+
      if (data.nivel_profundidade > 1 && (!data.categoria_pai || data.categoria_pai.trim() === '')) {
        const errorMsg = '⚠️ Selecione uma categoria pai para domínios de nível 2-4';
        console.error('[EditTagsetDialog] Categoria pai obrigatória para nível', data.nivel_profundidade);
        toast.error(errorMsg);
        setIsSubmitting(false);
        return;
      }

      // Garantir envio correto de NULL para categoria_pai
      const categoriaPaiValue = data.nivel_profundidade === 1 
        ? null 
        : (data.categoria_pai?.trim() || null);

      console.log('[EditTagsetDialog] Enviando atualização com valores validados:', {
        categoria_pai: categoriaPaiValue,
        nivel_profundidade: data.nivel_profundidade,
      });

      await updateTagset(tagset.id, {
        nome: data.nome,
        descricao: data.descricao || null,
        exemplos: (data.exemplos || []).map(e => e.value),
        nivel_profundidade: data.nivel_profundidade,
        categoria_pai: categoriaPaiValue,
        tagset_pai: categoriaPaiValue, // Sincronizar
      });

      toast.success('✅ Domínio semântico atualizado com sucesso!');
      onClose();
    } catch (error) {
      console.error('[EditTagsetDialog] Erro ao atualizar tagset:', error);
      toast.error('❌ Erro ao atualizar domínio semântico. Verifique o console.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nivelAtual = form.watch('nivel_profundidade');
  const categoriaPaiAtual = form.watch('categoria_pai');

  // 🔥 FASE 2: Validação de estado inconsistente
  const isStateInconsistent = nivelAtual > 1 && (!categoriaPaiAtual || categoriaPaiAtual.trim() === '');

  // 🔥 CORREÇÃO 1: useEffect para sincronizar categoria_pai com nivel_profundidade
  useEffect(() => {
    const categoriaPaiValue = form.getValues('categoria_pai');
    
    // Se mudou para nível 1 E tem pai definido → limpar
    if (nivelAtual === 1 && categoriaPaiValue) {
      console.log('[EditTagsetDialog] Nível 1 detectado, limpando categoria_pai');
      form.setValue('categoria_pai', '', { shouldValidate: true });
    }
    
    // Se mudou para nível 2+ E não tem pai → forçar validação
    if (nivelAtual > 1 && !categoriaPaiValue) {
      console.log('[EditTagsetDialog] Nível 2+ detectado sem pai, forçando validação');
      form.trigger('categoria_pai');
    }
  }, [nivelAtual, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Domínio Semântico</DialogTitle>
          <DialogDescription>
            Edição manual de {tagset?.codigo} - {tagset?.nome}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Domínio *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Cultura Gaúcha" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Descreva o domínio semântico..."
                      rows={4}
                    />
                  </FormControl>
                  <FormDescription>
                    Máximo 500 caracteres ({field.value?.length || 0}/500)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Exemplos</FormLabel>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newExemplo}
                  onChange={(e) => setNewExemplo(e.target.value)}
                  placeholder="Adicionar exemplo..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddExemplo();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleAddExemplo}
                  variant="outline"
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {fields.map((field, index) => (
                  <Badge key={field.id} variant="secondary" className="pr-1">
                    {form.watch(`exemplos.${index}.value`)}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1 hover:bg-transparent"
                      onClick={() => remove(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* 🔥 FASE 1: Alert de validação quando estado inconsistente */}
            {isStateInconsistent && (
              <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Atenção:</strong> Domínios de nível {nivelAtual} devem ter uma categoria pai selecionada.
                  Por favor, selecione uma categoria pai abaixo.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nivel_profundidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível Hierárquico *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o nível" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Nível 1 (Categoria Raiz)</SelectItem>
                        <SelectItem value="2">Nível 2</SelectItem>
                        <SelectItem value="3">Nível 3</SelectItem>
                        <SelectItem value="4">Nível 4</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoria_pai"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={cn(
                      nivelAtual > 1 && "text-primary font-semibold"
                    )}>
                      Categoria Pai {nivelAtual > 1 && <span className="text-destructive">*</span>}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={nivelAtual === 1}
                    >
                      <FormControl>
                        {/* 🔥 FASE 2: Indicador visual de campo obrigatório */}
                        <SelectTrigger className={cn(
                          isStateInconsistent && "border-destructive ring-2 ring-destructive/20"
                        )}>
                          <SelectValue placeholder={
                            nivelAtual === 1 
                              ? "Não aplicável" 
                              : "⚠️ Selecione uma categoria pai"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredParents.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            Nenhuma categoria disponível
                          </div>
                        ) : (
                          filteredParents.map((parent) => (
                            <SelectItem key={parent.codigo} value={parent.codigo}>
                              {parent.codigo} - {parent.nome}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription className={cn(
                      isStateInconsistent && "text-destructive font-medium"
                    )}>
                      {nivelAtual === 1 
                        ? '✓ Nível 1 não possui pai' 
                        : isStateInconsistent
                          ? '⚠️ Campo obrigatório - selecione acima'
                          : '✓ Obrigatório para níveis 2-4'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              {/* 🔥 FASE 2: Desabilitar botão Salvar se estado inconsistente */}
              <Button 
                type="submit" 
                disabled={isSubmitting || isStateInconsistent}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isStateInconsistent ? '⚠️ Selecione Categoria Pai' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
