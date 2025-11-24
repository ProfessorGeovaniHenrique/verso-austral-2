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
import { Plus, X, Loader2 } from 'lucide-react';
import { useTagsets } from '@/hooks/useTagsets';
import { toast } from 'sonner';

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
      // Validações de negócio
      if (data.nivel_profundidade > 1 && !data.categoria_pai) {
        toast.error('Tagsets de nível 2-4 devem ter um pai');
        return;
      }

      if (data.nivel_profundidade === 1 && data.categoria_pai) {
        toast.warning('Tagsets de nível 1 não podem ter pai. Removendo pai...');
        data.categoria_pai = undefined;
      }

      await updateTagset(tagset.id, {
        nome: data.nome,
        descricao: data.descricao || null,
        exemplos: (data.exemplos || []).map(e => e.value),
        nivel_profundidade: data.nivel_profundidade,
        categoria_pai: data.categoria_pai || null,
      });

      toast.success('Domínio semântico atualizado com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar tagset:', error);
      toast.error('Erro ao atualizar domínio semântico');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nivelAtual = form.watch('nivel_profundidade');

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
                    <FormLabel>
                      Categoria Pai {nivelAtual > 1 ? '*' : ''}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={nivelAtual === 1}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o pai" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredParents.map((parent) => (
                          <SelectItem key={parent.codigo} value={parent.codigo}>
                            {parent.codigo} - {parent.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {nivelAtual === 1 ? 'Nível 1 não possui pai' : 'Obrigatório para níveis 2-4'}
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
