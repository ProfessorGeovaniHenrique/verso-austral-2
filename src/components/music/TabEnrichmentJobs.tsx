/**
 * Aba de monitoramento de jobs de enriquecimento
 * Centraliza controles de iniciar jobs + histórico
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  RefreshCw, 
  Loader2, 
  Play, 
  Pause, 
  X, 
  CheckCircle2,
  AlertCircle,
  Clock,
  Database
} from 'lucide-react';
import { useEnrichmentJobsList, EnrichmentJob, EnrichmentStatus, EnrichmentJobType } from '@/hooks/useEnrichmentJob';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EnrichmentControlPanel } from './EnrichmentControlPanel';

const JOB_TYPE_LABELS: Record<EnrichmentJobType, string> = {
  metadata: 'Metadados',
  youtube: 'YouTube',
  lyrics: 'Letras',
  full: 'Completo',
};

const STATUS_CONFIG: Record<EnrichmentStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pendente: { label: 'Pendente', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  processando: { label: 'Processando', variant: 'default', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  pausado: { label: 'Pausado', variant: 'outline', icon: <Pause className="h-3 w-3" /> },
  concluido: { label: 'Concluído', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
  erro: { label: 'Erro', variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
  cancelado: { label: 'Cancelado', variant: 'secondary', icon: <X className="h-3 w-3" /> },
};

export function TabEnrichmentJobs() {
  const { jobs, isLoading, refetch } = useEnrichmentJobsList();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filtrar jobs
  const filteredJobs = jobs.filter(job => {
    if (statusFilter !== 'all' && job.status !== statusFilter) return false;
    if (typeFilter !== 'all' && job.job_type !== typeFilter) return false;
    return true;
  });

  // Estatísticas
  const stats = {
    total: jobs.length,
    processing: jobs.filter(j => j.status === 'processando').length,
    paused: jobs.filter(j => j.status === 'pausado').length,
    completed: jobs.filter(j => j.status === 'concluido').length,
    failed: jobs.filter(j => j.status === 'erro').length,
  };

  // Ações
  const handlePause = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      const { error } = await supabase
        .from('enrichment_jobs')
        .update({ status: 'pausado' })
        .eq('id', jobId);
      
      if (error) throw error;
      toast.info('Job pausado');
      refetch();
    } catch (err) {
      toast.error('Erro ao pausar job');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (job: EnrichmentJob) => {
    setActionLoading(job.id);
    try {
      const { error } = await supabase.functions.invoke('enrich-songs-batch', {
        body: { jobId: job.id, continueFrom: job.current_song_index }
      });
      
      if (error) throw error;
      toast.success('Job retomado');
      refetch();
    } catch (err) {
      toast.error('Erro ao retomar job');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      const { error } = await supabase
        .from('enrichment_jobs')
        .update({ is_cancelling: true })
        .eq('id', jobId);
      
      if (error) throw error;
      toast.info('Cancelamento solicitado');
      refetch();
    } catch (err) {
      toast.error('Erro ao cancelar job');
    } finally {
      setActionLoading(null);
    }
  };

  const calculateProgress = (job: EnrichmentJob) => {
    if (job.total_songs === 0) return 0;
    return Math.round((job.songs_processed / job.total_songs) * 100);
  };

  const isJobAbandoned = (job: EnrichmentJob) => {
    if (job.status !== 'processando' || !job.last_chunk_at) return false;
    return new Date().getTime() - new Date(job.last_chunk_at).getTime() > 5 * 60 * 1000;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Painel de controle para iniciar novos jobs */}
      <EnrichmentControlPanel />

      {/* Header com estatísticas */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total de Jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
            <p className="text-xs text-muted-foreground">Processando</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.paused}</div>
            <p className="text-xs text-muted-foreground">Pausados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Concluídos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">Erros</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5" />
              Jobs de Enriquecimento
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="processando">Processando</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="erro">Erro</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="metadata">Metadados</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="lyrics">Letras</SelectItem>
                <SelectItem value="full">Completo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabela de jobs */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Escopo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Processadas</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum job encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobs.map((job) => {
                    const progress = calculateProgress(job);
                    const abandoned = isJobAbandoned(job);
                    const statusCfg = STATUS_CONFIG[job.status as EnrichmentStatus];

                    return (
                      <TableRow key={job.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {JOB_TYPE_LABELS[job.job_type as EnrichmentJobType]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {job.artist_name || job.corpus_type || 'Global'}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {job.scope}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusCfg.variant} className="gap-1">
                            {statusCfg.icon}
                            {statusCfg.label}
                            {abandoned && ' (Travado)'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="w-24">
                            <Progress value={progress} className="h-2" />
                            <span className="text-xs text-muted-foreground">
                              {progress}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="text-green-600">{job.songs_succeeded}</span>
                            {' / '}
                            <span>{job.total_songs}</span>
                            {job.songs_failed > 0 && (
                              <span className="text-red-600 ml-1">
                                ({job.songs_failed} falhas)
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {job.tempo_inicio ? (
                              <>
                                <div>{format(new Date(job.tempo_inicio), 'dd/MM HH:mm')}</div>
                                <div className="text-muted-foreground">
                                  {formatDistanceToNow(new Date(job.tempo_inicio), { 
                                    addSuffix: true, 
                                    locale: ptBR 
                                  })}
                                </div>
                              </>
                            ) : '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {job.status === 'processando' && !job.is_cancelling && (
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handlePause(job.id)}
                                disabled={actionLoading === job.id}
                              >
                                {actionLoading === job.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Pause className="h-4 w-4" />
                                )}
                              </Button>
                            )}

                            {(job.status === 'pausado' || abandoned) && (
                              <Button
                                size="icon"
                                variant="default"
                                onClick={() => handleResume(job)}
                                disabled={actionLoading === job.id}
                              >
                                {actionLoading === job.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                            )}

                            {['processando', 'pausado', 'pendente'].includes(job.status) && !job.is_cancelling && (
                              <Button
                                size="icon"
                                variant="destructive"
                                onClick={() => handleCancel(job.id)}
                                disabled={actionLoading === job.id}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}

                            {job.is_cancelling && (
                              <Badge variant="secondary" className="gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Cancelando
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
