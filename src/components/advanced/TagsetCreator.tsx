import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, AlertCircle, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
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

interface TagsetCreatorProps {
  allTagsets: Tagset[];
  onSave: (newTagset: Partial<Tagset>) => Promise<void>;
  onClose: () => void;
  defaultLevel?: number;
}

export function TagsetCreator({ allTagsets, onSave, onClose, defaultLevel = 1 }: TagsetCreatorProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    nivel_profundidade: defaultLevel,
    categoria_pai: '',
    descricao: '',
    exemplos: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Sugerir próximo código baseado em tagsets existentes
  const suggestNextCode = (level: number, parentCode?: string): string => {
    if (level === 1) {
      const level1Codes = allTagsets
        .filter(t => t.nivel_profundidade === 1)
        .map(t => parseInt(t.codigo.split('.')[0]))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);
      
      const nextNum = level1Codes.length > 0 ? level1Codes[level1Codes.length - 1] + 1 : 1;
      return String(nextNum).padStart(2, '0');
    } else if (parentCode) {
      const childrenCodes = allTagsets
        .filter(t => t.categoria_pai === parentCode)
        .map(t => {
          const parts = t.codigo.split('.');
          return parseInt(parts[parts.length - 1]);
        })
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);
      
      const nextNum = childrenCodes.length > 0 ? childrenCodes[childrenCodes.length - 1] + 1 : 1;
      return `${parentCode}.${String(nextNum).padStart(2, '0')}`;
    }
    return '';
  };

  // Validar código único
  const isCodeUnique = (code: string): boolean => {
    return !allTagsets.some(t => t.codigo === code);
  };

  // Filtrar tagsets que podem ser pais
  const possibleParents = allTagsets.filter(t => 
    t.nivel_profundidade && 
    t.nivel_profundidade < formData.nivel_profundidade &&
    t.status === 'ativo'
  ).sort((a, b) => (a.hierarquia_completa || a.nome).localeCompare(b.hierarquia_completa || b.nome));

  const handleNext = () => {
    setErrors({});
    
    // Validações por passo
    if (step === 1) {
      if (!formData.codigo) {
        setErrors({ codigo: 'Código é obrigatório' });
        return;
      }
      if (!isCodeUnique(formData.codigo)) {
        setErrors({ codigo: 'Este código já existe. Escolha outro.' });
        return;
      }
      const codeParts = formData.codigo.split('.');
      if (codeParts.length !== formData.nivel_profundidade) {
        setErrors({ codigo: `Código deve ter ${formData.nivel_profundidade} ${formData.nivel_profundidade === 1 ? 'nível' : 'níveis'}` });
        return;
      }
    } else if (step === 2) {
      if (!formData.nome) {
        setErrors({ nome: 'Nome é obrigatório' });
        return;
      }
      if (formData.nivel_profundidade > 1 && !formData.categoria_pai) {
        setErrors({ categoria_pai: 'Tagset pai é obrigatório para níveis 2, 3 e 4' });
        return;
      }
    }
    
    setStep(step + 1);
  };

  const handleBack = () => {
    setErrors({});
    setStep(step - 1);
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

      // Validação final
      if (!isCodeUnique(dataToValidate.codigo)) {
        setErrors({ general: 'Este código já existe. Volte e escolha outro.' });
        return;
      }

      // Validação com zod
      const validated = tagsetSchema.parse(dataToValidate);

      setIsSaving(true);

      // Salvar no banco
      await onSave({
        codigo: validated.codigo,
        nome: validated.nome,
        nivel_profundidade: validated.nivel_profundidade,
        categoria_pai: validated.categoria_pai,
        descricao: validated.descricao,
        exemplos: validated.exemplos.length > 0 ? validated.exemplos : null,
        status: 'pendente'
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
        setErrors({ general: 'Erro ao criar tagset. Tente novamente.' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const suggestedCode = suggestNextCode(formData.nivel_profundidade, formData.categoria_pai);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Domínio Semântico</DialogTitle>
          <DialogDescription>
            Assistente passo a passo para criar um novo tagset. Passo {step} de 3
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 py-4">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center flex-1">
              <div className={`h-2 rounded-full flex-1 ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
              {s < 3 && <div className="w-2" />}
            </div>
          ))}
        </div>

        <div className="space-y-4 py-4">
          {/* Passo 1: Código e Nível */}
          {step === 1 && (
            <div className="space-y-4">
              <Alert>
                <Lightbulb className="w-4 h-4" />
                <AlertDescription>
                  <strong>Código sugerido:</strong> {suggestedCode || 'Configure o nível primeiro'}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="nivel">Nível Hierárquico *</Label>
                <Select 
                  value={String(formData.nivel_profundidade)}
                  onValueChange={(v) => {
                    const newLevel = Number(v);
                    setFormData({ 
                      ...formData, 
                      nivel_profundidade: newLevel,
                      categoria_pai: newLevel === 1 ? '' : formData.categoria_pai,
                      codigo: ''
                    });
                  }}
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
              </div>

              {formData.nivel_profundidade > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="pai-step1">Pertence a (DS Pai) *</Label>
                  <Select 
                    value={formData.categoria_pai}
                    onValueChange={(v) => {
                      setFormData({ ...formData, categoria_pai: v, codigo: '' });
                    }}
                  >
                    <SelectTrigger id="pai-step1" className={errors.categoria_pai ? 'border-red-500' : ''}>
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

              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <div className="flex gap-2">
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder={suggestedCode || "ex: 01 ou 01.01"}
                    maxLength={20}
                    className={errors.codigo ? 'border-red-500' : ''}
                  />
                  {suggestedCode && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFormData({ ...formData, codigo: suggestedCode })}
                    >
                      Usar Sugerido
                    </Button>
                  )}
                </div>
                {errors.codigo && (
                  <p className="text-sm text-red-600">{errors.codigo}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Use pontos para separar níveis. O código deve ter {formData.nivel_profundidade} {formData.nivel_profundidade === 1 ? 'nível' : 'níveis'}.
                </p>
              </div>
            </div>
          )}

          {/* Passo 2: Nome e Descrição */}
          {step === 2 && (
            <div className="space-y-4">
              <Card className="border-primary/20">
                <CardContent className="pt-6">
                  <div className="text-sm space-y-1">
                    <p className="text-muted-foreground">Você está criando:</p>
                    <p className="font-mono text-lg">{formData.codigo}</p>
                    <p className="text-xs text-muted-foreground">
                      Nível {formData.nivel_profundidade}
                      {formData.categoria_pai && ` • Filho de ${formData.categoria_pai}`}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Domínio Semântico *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="ex: Natureza, Atividades Humanas, Sentimentos"
                  maxLength={200}
                  className={errors.nome ? 'border-red-500' : ''}
                />
                {errors.nome && (
                  <p className="text-sm text-red-600">{errors.nome}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição detalhada do domínio semântico e seus limites"
                  maxLength={1000}
                  rows={4}
                  className={errors.descricao ? 'border-red-500' : ''}
                />
                {errors.descricao && (
                  <p className="text-sm text-red-600">{errors.descricao}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formData.descricao.length}/1000 caracteres
                </p>
              </div>
            </div>
          )}

          {/* Passo 3: Exemplos e Confirmação */}
          {step === 3 && (
            <div className="space-y-4">
              <Card className="border-primary/20">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold">{formData.nome}</p>
                      <p className="font-mono text-sm text-muted-foreground">{formData.codigo}</p>
                      {formData.descricao && (
                        <p className="text-sm text-muted-foreground">{formData.descricao}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="exemplos">Exemplos (opcional)</Label>
                <Input
                  id="exemplos"
                  value={formData.exemplos}
                  onChange={(e) => setFormData({ ...formData, exemplos: e.target.value })}
                  placeholder="cavalo, boi, cachorro, gato"
                  className={errors.exemplos ? 'border-red-500' : ''}
                />
                {errors.exemplos && (
                  <p className="text-sm text-red-600">{errors.exemplos}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Separe múltiplos exemplos com vírgulas. Máximo de 50 exemplos.
                </p>
              </div>

              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  O novo tagset será criado com status <strong>pendente</strong> e precisará ser aprovado antes de ser usado na anotação.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Erro geral */}
          {errors.general && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} disabled={isSaving}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            )}
          </div>
          {step < 3 ? (
            <Button onClick={handleNext}>
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Criando...' : 'Criar Tagset'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
