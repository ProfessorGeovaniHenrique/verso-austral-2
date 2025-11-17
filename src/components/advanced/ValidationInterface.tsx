import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useHumanValidation } from '@/hooks/useHumanValidation';
import { useTagsets } from '@/hooks/useTagsets';
import { LexiconEntry } from '@/hooks/useBackendLexicon';
import { Loader2 } from 'lucide-react';
import { notifications } from '@/lib/notifications';

interface ValidationInterfaceProps {
  entry: LexiconEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ValidationInterface({ entry, open, onOpenChange, onSuccess }: ValidationInterfaceProps) {
  const [status, setStatus] = useState<'correct' | 'incorrect' | null>(null);
  const [tagsetCorrigido, setTagsetCorrigido] = useState('');
  const [prosodiaCorrigida, setProsodiaCorrigida] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [sugestaoNovoDS, setSugestaoNovoDS] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { submitValidation, isSubmitting } = useHumanValidation();
  const { tagsets } = useTagsets();

  const validateFields = (): boolean => {
    const errors: string[] = [];
    
    if (status === 'incorrect') {
      if (!tagsetCorrigido || tagsetCorrigido.trim() === '') {
        errors.push('Selecione o tagset corrigido');
      }
      if (!prosodiaCorrigida || prosodiaCorrigida === '') {
        errors.push('Informe a prosódia corrigida (-3 a +3)');
      }
      if (!justificativa || justificativa.trim().length < 10) {
        errors.push('Justificativa deve ter pelo menos 10 caracteres');
      }
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async () => {
    if (!entry) return;

    // ✅ Validar campos antes de submeter
    if (!validateFields()) {
      notifications.warning('Campos obrigatórios', 'Preencha todos os campos marcados como obrigatórios');
      return;
    }

    const success = await submitValidation({
      palavra: entry.palavra,
      tagset_original: entry.tagset_codigo,
      tagset_corrigido: status === 'incorrect' ? tagsetCorrigido : null,
      prosody_original: entry.prosody,
      prosody_corrigida: status === 'incorrect' ? parseInt(prosodiaCorrigida) : null,
      contexto: entry.contexto_exemplo,
      justificativa: status === 'incorrect' ? justificativa : null,
      sugestao_novo_ds: sugestaoNovoDS || null
    });

    if (success) {
      handleClose();
      onSuccess?.();
    }
  };

  const handleClose = () => {
    setStatus(null);
    setTagsetCorrigido('');
    setProsodiaCorrigida('');
    setJustificativa('');
    setSugestaoNovoDS('');
    onOpenChange(false);
  };

  const getProsodyBadge = (prosody: number) => {
    if (prosody > 0) return <Badge className="bg-green-600">Positiva (+{prosody})</Badge>;
    if (prosody < 0) return <Badge variant="destructive">Negativa ({prosody})</Badge>;
    return <Badge variant="secondary">Neutra (0)</Badge>;
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Validação: "{entry.palavra}"</DialogTitle>
          <DialogDescription>
            Revise a anotação automática e forneça correções se necessário
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dados Atuais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Anotação Automática</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Badge>POS: {entry.pos || 'N/A'}</Badge>
                <Badge variant="outline">Lema: {entry.lema || 'N/A'}</Badge>
                <Badge variant="outline">Tagset: {entry.tagset_codigo}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prosódia Semântica:</p>
                {getProsodyBadge(entry.prosody)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confiança:</p>
                <div className="flex items-center gap-2">
                  <Progress value={entry.confianca * 100} className="flex-1" />
                  <span className="text-sm">{(entry.confianca * 100).toFixed(0)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contexto */}
          {entry.contexto_exemplo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Contexto no Corpus</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-sm bg-muted p-3 rounded">
                  ...{entry.contexto_exemplo}...
                </p>
              </CardContent>
            </Card>
          )}

          {/* Validação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Sua Validação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={status === 'correct' ? 'default' : 'outline'}
                  onClick={() => setStatus('correct')}
                >
                  ✓ Está Correto
                </Button>
                <Button
                  variant={status === 'incorrect' ? 'default' : 'outline'}
                  onClick={() => setStatus('incorrect')}
                >
                  ✗ Está Incorreto
                </Button>
              </div>

              {status === 'incorrect' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tagset Correto</Label>
                      <Select value={tagsetCorrigido} onValueChange={setTagsetCorrigido}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {tagsets.map((t) => (
                            <SelectItem key={t.id} value={t.codigo}>
                              {t.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Prosódia Corrigida</Label>
                      <Select value={prosodiaCorrigida} onValueChange={setProsodiaCorrigida}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Positiva (+1)</SelectItem>
                          <SelectItem value="0">Neutra (0)</SelectItem>
                          <SelectItem value="-1">Negativa (-1)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Justificativa *</Label>
                    <Textarea
                      placeholder="Explique por que a anotação está incorreta..."
                      value={justificativa}
                      onChange={(e) => setJustificativa(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Sugerir Novo Domínio Semântico (Opcional)</Label>
                    <Input
                      placeholder="Ex: AGRICULTURA, PECUÁRIA..."
                      value={sugestaoNovoDS}
                      onChange={(e) => setSugestaoNovoDS(e.target.value)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ✅ Exibição de erros de validação */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!status || (status === 'incorrect' && (!tagsetCorrigido || !prosodiaCorrigida || !justificativa)) || isSubmitting}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Validação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
