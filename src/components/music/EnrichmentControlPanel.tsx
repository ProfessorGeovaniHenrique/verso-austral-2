/**
 * Painel centralizado para iniciar jobs de enriquecimento
 * Todos os tipos e escopos disponíveis em um único lugar
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Rocket, 
  Loader2, 
  Sparkles, 
  Youtube, 
  FileText, 
  Zap,
  Music,
  User,
  Globe,
  LetterText
} from 'lucide-react';
import { useEnrichmentJob, EnrichmentJobType, EnrichmentScope } from '@/hooks/useEnrichmentJob';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const JOB_TYPE_OPTIONS = [
  { value: 'metadata', label: 'Metadados', icon: Sparkles, description: 'Compositor, ano, álbum' },
  { value: 'youtube', label: 'YouTube', icon: Youtube, description: 'Links de vídeos' },
  { value: 'lyrics', label: 'Letras', icon: FileText, description: 'Buscar letras' },
  { value: 'full', label: 'Completo', icon: Zap, description: 'Todos os dados' },
] as const;

const SCOPE_OPTIONS = [
  { value: 'all', label: 'Global', icon: Globe, description: 'Todas as músicas' },
  { value: 'corpus', label: 'Por Corpus', icon: Music, description: 'Filtrar por corpus' },
  { value: 'artist', label: 'Por Artista', icon: User, description: 'Músicas de um artista' },
  { value: 'letter', label: 'Por Letra', icon: LetterText, description: 'Artistas por inicial' },
] as const;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface Corpus {
  id: string;
  name: string;
  normalized_name: string;
}

interface Artist {
  id: string;
  name: string;
}

export function EnrichmentControlPanel() {
  const [jobType, setJobType] = useState<EnrichmentJobType>('metadata');
  const [scope, setScope] = useState<EnrichmentScope>('all');
  const [selectedCorpus, setSelectedCorpus] = useState<string>('');
  const [selectedArtist, setSelectedArtist] = useState<string>('');
  const [selectedLetter, setSelectedLetter] = useState<string>('');
  const [forceReenrich, setForceReenrich] = useState(false);
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [isCountLoading, setIsCountLoading] = useState(false);

  // Data
  const [corpora, setCorpora] = useState<Corpus[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [filteredArtists, setFilteredArtists] = useState<Artist[]>([]);

  const { startJob, isStarting, hasActiveJob } = useEnrichmentJob();

  // Carregar corpora e artistas
  useEffect(() => {
    async function loadData() {
      const [corporaRes, artistsRes] = await Promise.all([
        supabase.from('corpora').select('id, name, normalized_name').order('name'),
        supabase.from('artists').select('id, name').order('name'),
      ]);

      if (corporaRes.data) setCorpora(corporaRes.data);
      if (artistsRes.data) setArtists(artistsRes.data);
    }
    loadData();
  }, []);

  // Filtrar artistas por corpus ou letra
  useEffect(() => {
    let filtered = [...artists];
    
    if (scope === 'letter' && selectedLetter) {
      filtered = filtered.filter(a => 
        a.name.toUpperCase().startsWith(selectedLetter)
      );
    }
    
    setFilteredArtists(filtered);
  }, [artists, scope, selectedLetter]);

  // Calcular músicas elegíveis
  useEffect(() => {
    async function calculateEligible() {
      setIsCountLoading(true);
      try {
        let query = supabase.from('songs').select('id', { count: 'exact', head: true });

        // Filtro por status (se não forçar re-enriquecimento)
        if (!forceReenrich) {
          if (jobType === 'youtube') {
            query = query.is('youtube_url', null);
          } else if (jobType === 'lyrics') {
            query = query.is('lyrics', null);
          } else {
            query = query.eq('status', 'pending');
          }
        }

        // Filtros por escopo
        if (scope === 'corpus' && selectedCorpus) {
          query = query.eq('corpus_id', selectedCorpus);
        } else if (scope === 'artist' && selectedArtist) {
          query = query.eq('artist_id', selectedArtist);
        } else if (scope === 'letter' && selectedLetter) {
          // Precisamos buscar artistas pela letra primeiro
          const artistIds = filteredArtists.map(a => a.id);
          if (artistIds.length > 0) {
            query = query.in('artist_id', artistIds);
          } else {
            setEligibleCount(0);
            setIsCountLoading(false);
            return;
          }
        }

        const { count, error } = await query;
        
        if (error) {
          console.error('Erro calculando elegíveis:', error);
          setEligibleCount(null);
        } else {
          setEligibleCount(count || 0);
        }
      } finally {
        setIsCountLoading(false);
      }
    }

    calculateEligible();
  }, [jobType, scope, selectedCorpus, selectedArtist, selectedLetter, forceReenrich, filteredArtists]);

  const handleStartJob = async () => {
    const params: Parameters<typeof startJob>[0] = {
      jobType,
      scope,
      forceReenrich,
    };

    if (scope === 'corpus' && selectedCorpus) {
      const corpus = corpora.find(c => c.id === selectedCorpus);
      params.corpusId = selectedCorpus;
      params.corpusType = corpus?.normalized_name;
    } else if (scope === 'artist' && selectedArtist) {
      const artist = artists.find(a => a.id === selectedArtist);
      params.artistId = selectedArtist;
      params.artistName = artist?.name;
    } else if (scope === 'letter' && selectedLetter) {
      // Para letra, enviamos os IDs dos artistas
      const artistIds = filteredArtists.map(a => a.id);
      if (artistIds.length === 0) {
        toast.error('Nenhum artista encontrado com esta inicial');
        return;
      }
      // Usamos scope 'selection' internamente para múltiplos artistas
      params.scope = 'selection';
      // Buscar IDs das músicas desses artistas
      const { data: songs } = await supabase
        .from('songs')
        .select('id')
        .in('artist_id', artistIds);
      
      if (songs && songs.length > 0) {
        params.songIds = songs.map(s => s.id);
      } else {
        toast.error('Nenhuma música encontrada');
        return;
      }
    }

    await startJob(params);
  };

  const isFormValid = () => {
    if (scope === 'corpus' && !selectedCorpus) return false;
    if (scope === 'artist' && !selectedArtist) return false;
    if (scope === 'letter' && !selectedLetter) return false;
    return true;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Iniciar Novo Job de Enriquecimento
        </CardTitle>
        <CardDescription>
          Configure e inicie um job para enriquecer as músicas do catálogo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tipo de Job */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Tipo de Enriquecimento</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {JOB_TYPE_OPTIONS.map(option => {
              const Icon = option.icon;
              const isSelected = jobType === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setJobType(option.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Icon className={`h-5 w-5 mb-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Escopo */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Escopo</Label>
          <RadioGroup value={scope} onValueChange={(v) => setScope(v as EnrichmentScope)}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SCOPE_OPTIONS.map(option => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      scope === option.value 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value={option.value} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{option.label}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </RadioGroup>
        </div>

        {/* Seletores dinâmicos */}
        {scope === 'corpus' && (
          <div className="space-y-2">
            <Label>Selecione o Corpus</Label>
            <Select value={selectedCorpus} onValueChange={setSelectedCorpus}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um corpus..." />
              </SelectTrigger>
              <SelectContent>
                {corpora.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {scope === 'artist' && (
          <div className="space-y-2">
            <Label>Selecione o Artista</Label>
            <Select value={selectedArtist} onValueChange={setSelectedArtist}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um artista..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {artists.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {scope === 'letter' && (
          <div className="space-y-2">
            <Label>Selecione a Inicial ({filteredArtists.length} artistas)</Label>
            <div className="flex flex-wrap gap-1">
              {ALPHABET.map(letter => (
                <Button
                  key={letter}
                  variant={selectedLetter === letter ? 'default' : 'outline'}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => setSelectedLetter(letter)}
                >
                  {letter}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Opções adicionais */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <Label htmlFor="force-reenrich" className="font-medium">
              Forçar Re-enriquecimento
            </Label>
            <p className="text-xs text-muted-foreground">
              Processar todas as músicas, mesmo as já enriquecidas
            </p>
          </div>
          <Switch
            id="force-reenrich"
            checked={forceReenrich}
            onCheckedChange={setForceReenrich}
          />
        </div>

        {/* Contagem e botão de ação */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
          <div className="text-center sm:text-left">
            {isCountLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculando...
              </div>
            ) : eligibleCount !== null ? (
              <div>
                <span className="text-2xl font-bold">{eligibleCount.toLocaleString()}</span>
                <span className="text-muted-foreground ml-2">músicas elegíveis</span>
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>

          <Button
            size="lg"
            onClick={handleStartJob}
            disabled={isStarting || hasActiveJob || !isFormValid() || eligibleCount === 0}
            className="gap-2"
          >
            {isStarting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Iniciando...
              </>
            ) : hasActiveJob ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Job em Andamento
              </>
            ) : (
              <>
                <Rocket className="h-5 w-5" />
                Iniciar Enriquecimento
              </>
            )}
          </Button>
        </div>

        {hasActiveJob && (
          <p className="text-sm text-center text-muted-foreground">
            Aguarde o job atual terminar ou cancele-o na tabela abaixo.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
