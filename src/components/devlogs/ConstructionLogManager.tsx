import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useConstructionPhases } from '@/hooks/useConstructionPhases';
import { useConstructionLogSync } from '@/hooks/useConstructionLogSync';
import { FileText, Plus, Save, Download, Clock, CheckCircle2, Loader2, Calendar, Target, RefreshCw, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ConstructionLogManager() {
  const { phases, isLoading, createPhase, exportToTypeScript } = useConstructionPhases();
  const { isSyncing, lastSyncResult, syncToDatabase, exportToTypeScript: exportFromDB, staticPhasesCount } = useConstructionLogSync();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    phase_number: 1,
    phase_name: '',
    date_start: '',
    date_end: '',
    status: 'planned' as 'completed' | 'in-progress' | 'planned',
    objective: '',
  });

  const handleSubmit = async () => {
    await createPhase.mutateAsync({
      ...formData,
      date_end: formData.date_end || undefined,
    });
    setIsDialogOpen(false);
    setFormData({
      phase_number: (phases?.length || 0) + 1,
      phase_name: '',
      date_start: '',
      date_end: '',
      status: 'planned',
      objective: '',
    });
  };

  const createTestPhase = async () => {
    await createPhase.mutateAsync({
      phase_number: (phases?.length || 0) + 1,
      phase_name: "Sistema de DevLogs Inteligentes - Sprint Consolidado",
      date_start: new Date().toISOString().split('T')[0],
      date_end: new Date().toISOString().split('T')[0],
      status: 'completed',
      objective: "Implementar análise contextual da IA + sistema de alertas realtime + GitHub Actions CI/CD + indicador de ROI em um único sprint para economia de créditos",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in-progress':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      'completed': 'default',
      'in-progress': 'secondary',
      'planned': 'outline'
    };
    const labels: Record<string, string> = {
      'completed': 'Concluído',
      'in-progress': 'Em Andamento',
      'planned': 'Planejado'
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Gerenciador de Construction Log
              </CardTitle>
              <CardDescription>
                Registre fases, decisões técnicas e métricas dinamicamente
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="mr-2">
                {staticPhasesCount} fases estáticas
              </Badge>
              <Button
                variant="secondary"
                onClick={syncToDatabase}
                disabled={isSyncing}
                className="gap-2"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Sincronizar com DB
              </Button>
              <Button
                variant="outline"
                onClick={exportFromDB}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar .ts
              </Button>
              <Button
                variant="outline"
                onClick={createTestPhase}
                disabled={createPhase.isPending}
                className="gap-2"
              >
                🧪 Criar Fase de Teste
              </Button>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Fase
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Nova Fase de Construção</DialogTitle>
                  <DialogDescription>
                    Registre uma nova fase do projeto com seus objetivos e dados
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Número da Fase</Label>
                      <Input
                        type="number"
                        value={formData.phase_number}
                        onChange={(e) => setFormData({ ...formData, phase_number: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planned">Planejado</SelectItem>
                          <SelectItem value="in-progress">Em Andamento</SelectItem>
                          <SelectItem value="completed">Concluído</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Nome da Fase</Label>
                    <Input
                      placeholder="Ex: Implementação do MVP"
                      value={formData.phase_name}
                      onChange={(e) => setFormData({ ...formData, phase_name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data de Início</Label>
                      <Input
                        type="date"
                        value={formData.date_start}
                        onChange={(e) => setFormData({ ...formData, date_start: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data de Fim (opcional)</Label>
                      <Input
                        type="date"
                        value={formData.date_end}
                        onChange={(e) => setFormData({ ...formData, date_end: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Objetivo</Label>
                    <Textarea
                      placeholder="Descreva o objetivo principal desta fase..."
                      value={formData.objective}
                      onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <Button 
                    onClick={handleSubmit} 
                    disabled={!formData.phase_name || !formData.date_start || !formData.objective || createPhase.isPending}
                    className="w-full gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {createPhase.isPending ? 'Salvando...' : 'Salvar Fase'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : phases && phases.length > 0 ? (
            <div className="space-y-4">
              {phases.map((phase) => (
                <Card key={phase.id} className="border-l-4 border-l-primary">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline">Fase {phase.phase_number}</Badge>
                          {getStatusBadge(phase.status)}
                          {getStatusIcon(phase.status)}
                        </div>
                        <CardTitle className="text-lg">{phase.phase_name}</CardTitle>
                        <CardDescription className="mt-2">{phase.objective}</CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => exportToTypeScript(phase.id)}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Exportar .ts
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Início: {format(new Date(phase.date_start), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      </div>
                      {phase.date_end && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Target className="h-4 w-4" />
                          <span>Fim: {format(new Date(phase.date_end), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        </div>
                      )}
                    </div>
                    {phase.technical_decisions && phase.technical_decisions.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Decisões Técnicas:</p>
                        <div className="space-y-2">
                          {phase.technical_decisions.map((decision) => (
                            <div key={decision.id} className="text-sm bg-muted/50 p-2 rounded">
                              <p className="font-medium">{decision.decision}</p>
                              <p className="text-muted-foreground text-xs">{decision.rationale}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {phase.phase_metrics && phase.phase_metrics.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Métricas:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {phase.phase_metrics.map((metric) => (
                            <div key={metric.id} className="text-sm bg-muted/50 p-2 rounded">
                              <p className="font-medium">{metric.metric_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {metric.value_before} → {metric.value_after} {metric.unit}
                                {metric.improvement_percentage && (
                                  <span className="text-green-600 ml-1">
                                    (+{metric.improvement_percentage.toFixed(1)}%)
                                  </span>
                                )}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma fase registrada ainda</p>
              <p className="text-sm text-muted-foreground mt-2">
                Clique em "Nova Fase" para começar
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
