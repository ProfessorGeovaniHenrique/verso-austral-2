import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lightbulb, AlertCircle } from 'lucide-react';
import { Tagset } from '@/hooks/useTagsets';

const tagsetSchema = z.object({
  codigo: z.string()
    .trim()
    .min(1, 'Código é obrigatório')
    .max(20, 'Código deve ter no máximo 20 caracteres')
    .regex(/^[0-9.]+$/, 'Código deve conter apenas números e pontos'),
  nome: z.string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .max(200, 'Nome deve ter no máximo 200 caracteres'),
  nivel_profundidade: z.number()
    .int()
    .min(1, 'Nível deve ser entre 1 e 4')
    .max(4, 'Nível deve ser entre 1 e 4'),
  categoria_pai: z.string().nullable(),
  descricao: z.string()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .nullable(),
  exemplos: z.array(z.string().trim().max(100))
    .max(50, 'Máximo de 50 exemplos permitidos')
});

interface TagsetEditorProps {
  tagset: Tagset;
  allTagsets: Tagset[];
  onSave: (id: string, updated: Partial<Tagset>) => Promise<void>;
  onClose: () => void;
}

export function TagsetEditor({ tagset, allTagsets, onSave, onClose }: TagsetEditorProps) {
  const [formData, setFormData] = useState({
    codigo: tagset.codigo,
    nome: tagset.nome,
    nivel_profundidade: tagset.nivel_profundidade || 1,
    categoria_pai: tagset.categoria_pai || '',
    descricao: tagset.descricao || '',
    exemplos: tagset.exemplos?.join(', ') || ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Filtrar tagsets que podem ser pais (nível inferior ao atual)
  const possibleParents = allTagsets.filter(t => 
    t.nivel_profundidade && 
    t.nivel_profundidade < formData.nivel_profundidade &&
    t.codigo !== tagset.codigo &&
    t.status === 'ativo'
  ).sort((a, b) => (a.hierarquia_completa || a.nome).localeCompare(b.hierarquia_completa || b.nome));

  // Validar código único (exceto o próprio tagset)
  const isCodeUnique = (code: string): boolean => {
    return !allTagsets.some(t => t.codigo === code && t.id !== tagset.id);
  };

  const handleSubmit = async () => {
    try {
      setErrors({});
      
      // Preparar dados para validação
      const dataToValidate = {
        codigo: formData.codigo,
        nome: formData.nome,
        nivel_profundidade: formData.nivel_profundidade,
        categoria_pai: formData.nivel_profundidade === 1 ? null : formData.categoria_pai || null,
        descricao: formData.descricao || null,
        exemplos: formData.exemplos
          .split(',')
          .map(e => e.trim())
          .filter(e => e.length > 0)
      };

      // Validar código único
      if (!isCodeUnique(dataToValidate.codigo)) {
        setErrors({ codigo: 'Este código já existe. Escolha outro código.' });
        return;
      }

      // Validar código hierárquico
      const codeParts = dataToValidate.codigo.split('.');
      if (codeParts.length !== dataToValidate.nivel_profundidade) {
        setErrors({ codigo: `Código deve ter ${dataToValidate.nivel_profundidade} ${dataToValidate.nivel_profundidade === 1 ? 'nível' : 'níveis'} (ex: ${Array(dataToValidate.nivel_profundidade).fill('01').join('.')})` });
        return;
      }

      // Validar pai obrigatório para níveis > 1
      if (dataToValidate.nivel_profundidade > 1 && !dataToValidate.categoria_pai) {
        setErrors({ categoria_pai: 'Tagset pai é obrigatório para níveis 2, 3 e 4' });
        return;
      }

      // Validação com zod
      const validated = tagsetSchema.parse(dataToValidate);

      setIsSaving(true);

      // Salvar no banco
      await onSave(tagset.id, {
        codigo: validated.codigo,
        nome: validated.nome,
        nivel_profundidade: validated.nivel_profundidade,
        categoria_pai: validated.categoria_pai,
        descricao: validated.descricao,
        exemplos: validated.exemplos.length > 0 ? validated.exemplos : null
      });

      onClose();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      } else {
        setErrors({ general: 'Erro ao salvar tagset. Tente novamente.' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Tagset</DialogTitle>
          <DialogDescription>
            Edite as informações do tagset "{tagset.nome}". Campos com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Código */}
          <div className="space-y-2">
            <Label htmlFor="codigo">Código *</Label>
            <Input
              id="codigo"
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
              placeholder="01 ou 01.01 ou 01.01.01"
              maxLength={20}
              className={errors.codigo ? 'border-red-500' : ''}
            />
            {errors.codigo && (
              <p className="text-sm text-red-600">{errors.codigo}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Use pontos para separar níveis (ex: 01, 01.01, 01.01.01)
            </p>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Nome do domínio semântico"
              maxLength={200}
              className={errors.nome ? 'border-red-500' : ''}
            />
            {errors.nome && (
              <p className="text-sm text-red-600">{errors.nome}</p>
            )}
          </div>

          {/* Nível Hierárquico */}
          <div className="space-y-2">
            <Label htmlFor="nivel">Nível Hierárquico *</Label>
            <Select 
              value={String(formData.nivel_profundidade)}
              onValueChange={(v) => setFormData({ 
                ...formData, 
                nivel_profundidade: Number(v),
                categoria_pai: Number(v) === 1 ? '' : formData.categoria_pai
              })}
            >
              <SelectTrigger id="nivel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="1">Nível 1 - DS Geral</SelectItem>
                <SelectItem value="2">Nível 2 - Subnível</SelectItem>
                <SelectItem value="3">Nível 3 - Especialização</SelectItem>
                <SelectItem value="4">Nível 4 - Detalhamento</SelectItem>
              </SelectContent>
            </Select>
            <Alert>
              <Lightbulb className="w-4 h-4" />
              <AlertDescription className="text-xs">
                O código deve ter {formData.nivel_profundidade} {formData.nivel_profundidade === 1 ? 'nível' : 'níveis'}.
                Exemplo: {Array(formData.nivel_profundidade).fill('01').join('.')}
              </AlertDescription>
            </Alert>
          </div>

          {/* Tagset Pai (apenas se não for nível 1) */}
          {formData.nivel_profundidade > 1 && (
            <div className="space-y-2">
              <Label htmlFor="pai">Pertence a (DS Pai) *</Label>
              <Select 
                value={formData.categoria_pai}
                onValueChange={(v) => setFormData({ ...formData, categoria_pai: v })}
              >
                <SelectTrigger id="pai" className={errors.categoria_pai ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecionar DS pai" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {possibleParents.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Nenhum DS pai disponível
                    </SelectItem>
                  ) : (
                    possibleParents.map(parent => (
                      <SelectItem key={parent.codigo} value={parent.codigo}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{parent.codigo}</span>
                          <span className="text-xs">{parent.hierarquia_completa || parent.nome}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.categoria_pai && (
                <p className="text-sm text-red-600">{errors.categoria_pai}</p>
              )}
            </div>
          )}

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descrição detalhada do domínio semântico"
              maxLength={1000}
              rows={3}
              className={errors.descricao ? 'border-red-500' : ''}
            />
            {errors.descricao && (
              <p className="text-sm text-red-600">{errors.descricao}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.descricao.length}/1000 caracteres
            </p>
          </div>

          {/* Exemplos */}
          <div className="space-y-2">
            <Label htmlFor="exemplos">Exemplos</Label>
            <Input
              id="exemplos"
              value={formData.exemplos}
              onChange={(e) => setFormData({ ...formData, exemplos: e.target.value })}
              placeholder="cavalo, boi, cachorro"
              className={errors.exemplos ? 'border-red-500' : ''}
            />
            {errors.exemplos && (
              <p className="text-sm text-red-600">{errors.exemplos}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Separe múltiplos exemplos com vírgulas. Máximo de 50 exemplos.
            </p>
          </div>

          {/* Erro geral */}
          {errors.general && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
