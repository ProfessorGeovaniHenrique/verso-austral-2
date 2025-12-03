/**
 * TabScrapingJobs - Dashboard centralizado de jobs de scraping
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, Play, Pause, X, Loader2, Music, Users, CheckCircle, AlertCircle, Clock, Leaf, Guitar } from 'lucide-react';
import { useCorpusScrapingJob, CorpusType } from '@/hooks/useCorpusScrapingJob';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Card para iniciar scraping de um corpus específico
function ScrapingStartCard({ 
  corpusType, 
  title, 
  description, 
  icon: Icon, 
  color 
}: { 
  corpusType: CorpusType;
  title: string;
  description: string;
  icon: any;
  color: string;
}) {
  const [artistLimit, setArtistLimit] = useState(50);
  const [songsPerArtist, setSongsPerArtist] = useState(20);
  
  const { 
    activeJob, 
    isStarting, 
    isProcessing, 
    isPaused,
    progress,
    startJob, 
    pauseJob, 
    resumeJob,
    cancelJob,
    refetch 
  } = useCorpusScrapingJob(corpusType);

  const handleStart = () => startJob(artistLimit, songsPerArtist);

  return (
    <Card className={`border-l-4`} style={{ borderLeftColor: color }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeJob ? (
          // Job em andamento
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <Badge variant={activeJob.status === 'processando' ? 'default' : 'secondary'}>
                {activeJob.status === 'processando' ? '🔄 Processando' : 
                 activeJob.status === 'pausado' ? '⏸️ Pausado' : 
                 activeJob.status === 'concluido' ? '✅ Concluído' : activeJob.status}
              </Badge>
              <span className="text-muted-foreground">
                {activeJob.artists_processed}/{activeJob.total_artists} artistas
              </span>
            </div>
            
            <Progress value={progress} className="h-2" />
            
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Music className="h-3 w-3" />
                <span>{activeJob.songs_created || 0} músicas</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                <span>{activeJob.songs_with_lyrics || 0} com letras</span>
              </div>
            </div>

            <div className="flex gap-2">
              {isProcessing ? (
                <Button variant="outline" size="sm" onClick={pauseJob} className="flex-1">
                  <Pause className="h-4 w-4 mr-1" /> Pausar
                </Button>
              ) : isPaused ? (
                <Button variant="outline" size="sm" onClick={resumeJob} className="flex-1">
                  <Play className="h-4 w-4 mr-1" /> Retomar
                </Button>
              ) : null}
              <Button variant="destructive" size="sm" onClick={cancelJob}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          // Formulário para iniciar
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Limite de Artistas</Label>
                <Input 
                  type="number" 
                  value={artistLimit} 
                  onChange={(e) => setArtistLimit(Number(e.target.value))}
                  min={1}
                  max={500}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Músicas por Artista</Label>
                <Input 
                  type="number" 
                  value={songsPerArtist} 
                  onChange={(e) => setSongsPerArtist(Number(e.target.value))}
                  min={1}
                  max={100}
                  className="h-8"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleStart} 
              disabled={isStarting}
              className="w-full"
              style={{ backgroundColor: color }}
            >
              {isStarting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Iniciando...</>
              ) : (
                <><Play className="h-4 w-4 mr-2" /> Iniciar Scraping</>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Tabela de histórico de jobs
function ScrapingJobsTable() {
  const gauchoJob = useCorpusScrapingJob('gaucho');
  const sertanejoJob = useCorpusScrapingJob('sertanejo');
  
  // Combinar jobs de todos os corpus
  const allJobs = [
    gauchoJob.activeJob,
    gauchoJob.lastCompletedJob,
    sertanejoJob.activeJob,
    sertanejoJob.lastCompletedJob,
  ].filter(Boolean);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processando': return <Badge className="bg-blue-500">🔄 Processando</Badge>;
      case 'pausado': return <Badge variant="secondary">⏸️ Pausado</Badge>;
      case 'concluido': return <Badge className="bg-green-500">✅ Concluído</Badge>;
      case 'cancelado': return <Badge variant="destructive">❌ Cancelado</Badge>;
      case 'erro': return <Badge variant="destructive">⚠️ Erro</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCorpusBadge = (corpusType: string) => {
    switch (corpusType) {
      case 'gaucho': return <Badge variant="outline" className="border-green-500 text-green-600">🌿 Gaúcho</Badge>;
      case 'sertanejo': return <Badge variant="outline" className="border-yellow-500 text-yellow-600">🎸 Sertanejo</Badge>;
      default: return <Badge variant="outline">{corpusType}</Badge>;
    }
  };

  if (allJobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum job de scraping encontrado</p>
          <p className="text-xs mt-1">Inicie um scraping usando os cards acima</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Histórico de Jobs</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Corpus</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead>Músicas</TableHead>
              <TableHead>Última Atualização</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allJobs.map((job: any) => (
              <TableRow key={job.id}>
                <TableCell>{getCorpusBadge(job.corpus_type)}</TableCell>
                <TableCell>{getStatusBadge(job.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={job.total_artists > 0 ? (job.artists_processed / job.total_artists) * 100 : 0} 
                      className="w-20 h-2" 
                    />
                    <span className="text-xs text-muted-foreground">
                      {job.artists_processed}/{job.total_artists}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <span className="font-medium">{job.songs_created || 0}</span>
                    <span className="text-muted-foreground text-xs ml-1">
                      ({job.songs_with_lyrics || 0} com letra)
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {job.updated_at ? formatDistanceToNow(new Date(job.updated_at), { addSuffix: true, locale: ptBR }) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Estatísticas gerais
function ScrapingStats() {
  const gauchoJob = useCorpusScrapingJob('gaucho');
  const sertanejoJob = useCorpusScrapingJob('sertanejo');
  
  const totalSongs = (gauchoJob.activeJob?.songs_created || 0) + (sertanejoJob.activeJob?.songs_created || 0);
  const totalWithLyrics = (gauchoJob.activeJob?.songs_with_lyrics || 0) + (sertanejoJob.activeJob?.songs_with_lyrics || 0);
  const activeJobs = [gauchoJob.activeJob, sertanejoJob.activeJob].filter(j => j?.status === 'processando').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Loader2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Jobs Ativos</p>
              <p className="text-xl font-bold">{activeJobs}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Music className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Músicas Criadas</p>
              <p className="text-xl font-bold">{totalSongs.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <CheckCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Com Letras</p>
              <p className="text-xl font-bold">{totalWithLyrics.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Taxa Sucesso</p>
              <p className="text-xl font-bold">
                {totalSongs > 0 ? ((totalWithLyrics / totalSongs) * 100).toFixed(0) : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function TabScrapingJobs() {
  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <ScrapingStats />
      
      {/* Cards de início por corpus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ScrapingStartCard
          corpusType="gaucho"
          title="Corpus Gaúcho"
          description="musicatradicionalista.com.br"
          icon={Leaf}
          color="#059669"
        />
        <ScrapingStartCard
          corpusType="sertanejo"
          title="Corpus Sertanejo"
          description="letras.mus.br"
          icon={Guitar}
          color="#F59E0B"
        />
      </div>
      
      {/* Tabela de histórico */}
      <ScrapingJobsTable />
    </div>
  );
}
