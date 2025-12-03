/**
 * LyricsEnrichmentDashboard - Dashboard unificado de enriquecimento de letras
 * Mostra cards para cada corpus com status de cobertura
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Leaf, Guitar, Sun, Music2, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CorpusEnrichmentCard } from './CorpusEnrichmentCard';

interface CorpusCoverage {
  corpusId: string;
  corpusName: string;
  totalSongs: number;
  withLyrics: number;
  withoutLyrics: number;
  coveragePercent: number;
}

export function LyricsEnrichmentDashboard() {
  const [coverage, setCoverage] = useState<CorpusCoverage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCoverage();
  }, []);

  const fetchCoverage = async () => {
    try {
      // Buscar estatísticas por corpus
      const { data: corpora } = await supabase
        .from('corpora')
        .select('id, name, normalized_name')
        .in('normalized_name', ['gaucho', 'sertanejo', 'nordestino']);

      if (!corpora) return;

      const coverageData: CorpusCoverage[] = [];

      for (const corpus of corpora) {
        const { count: total } = await supabase
          .from('songs')
          .select('*', { count: 'exact', head: true })
          .eq('corpus_id', corpus.id);

        const { count: withLyrics } = await supabase
          .from('songs')
          .select('*', { count: 'exact', head: true })
          .eq('corpus_id', corpus.id)
          .not('lyrics', 'is', null)
          .neq('lyrics', '');

        const totalCount = total || 0;
        const withLyricsCount = withLyrics || 0;

        coverageData.push({
          corpusId: corpus.id,
          corpusName: corpus.name,
          totalSongs: totalCount,
          withLyrics: withLyricsCount,
          withoutLyrics: totalCount - withLyricsCount,
          coveragePercent: totalCount > 0 
            ? Math.round((withLyricsCount / totalCount) * 100 * 100) / 100 
            : 0,
        });
      }

      setCoverage(coverageData);
    } catch (error) {
      console.error('[LyricsEnrichmentDashboard] Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCorpusStats = (name: string) => 
    coverage.find(c => c.corpusName.toLowerCase().includes(name.toLowerCase()));

  const gauchoStats = getCorpusStats('gaúcho') || getCorpusStats('gaucho');
  const sertanejoStats = getCorpusStats('sertanejo');
  const nordestinoStats = getCorpusStats('nordestino');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music2 className="h-5 w-5" />
            Cobertura de Letras por Corpus
          </CardTitle>
          <CardDescription>
            Visão geral da cobertura de letras em cada corpus musical
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Gaúcho */}
            <div className="p-4 rounded-lg border bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="h-5 w-5 text-emerald-600" />
                <span className="font-semibold">Gaúcho</span>
              </div>
              <div className="text-3xl font-bold text-emerald-600">
                {gauchoStats?.coveragePercent || 0}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {gauchoStats?.withLyrics?.toLocaleString() || 0} de {gauchoStats?.totalSongs?.toLocaleString() || 0} músicas
              </div>
              {(gauchoStats?.withoutLyrics || 0) > 0 && (
                <Badge variant="outline" className="mt-2 text-amber-600 border-amber-300">
                  {gauchoStats?.withoutLyrics?.toLocaleString()} faltando
                </Badge>
              )}
            </div>

            {/* Sertanejo */}
            <div className="p-4 rounded-lg border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <Guitar className="h-5 w-5 text-amber-600" />
                <span className="font-semibold">Sertanejo</span>
              </div>
              <div className="text-3xl font-bold text-amber-600">
                {sertanejoStats?.coveragePercent || 0}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {sertanejoStats?.withLyrics?.toLocaleString() || 0} de {sertanejoStats?.totalSongs?.toLocaleString() || 0} músicas
              </div>
              {(sertanejoStats?.coveragePercent || 0) >= 99 && (
                <Badge variant="default" className="mt-2 bg-green-500">
                  ✓ Completo
                </Badge>
              )}
            </div>

            {/* Nordestino */}
            <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Sun className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">Nordestino</span>
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {nordestinoStats?.coveragePercent || 0}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {nordestinoStats?.withLyrics?.toLocaleString() || 0} de {nordestinoStats?.totalSongs?.toLocaleString() || 0} músicas
              </div>
              {(nordestinoStats?.withoutLyrics || 0) > 0 && (nordestinoStats?.withoutLyrics || 0) < 100 && (
                <Badge variant="outline" className="mt-2 text-amber-600 border-amber-300">
                  {nordestinoStats?.withoutLyrics} faltando
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs com cards de enriquecimento */}
      <Tabs defaultValue="populate" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="populate" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Popular Corpora
          </TabsTrigger>
          <TabsTrigger value="enrich" className="flex items-center gap-2">
            <Music2 className="h-4 w-4" />
            Enriquecer Letras
          </TabsTrigger>
        </TabsList>

        <TabsContent value="populate" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Card Gaúcho */}
            <CorpusEnrichmentCard
              corpusType="gaucho"
              title="Corpus Gaúcho"
              description="Popular com artistas tradicionalistas gaúchos"
              icon={Leaf}
              colorScheme="emerald"
              sourceUrl="https://musicatradicionalista.com.br/artistas"
              sourceName="musicatradicionalista.com.br"
              defaultArtistLimit={50}
              defaultSongsPerArtist={20}
              artistLimitOptions={[25, 50, 100, 200]}
              songsPerArtistOptions={[10, 15, 20, 30]}
              onComplete={fetchCoverage}
            />

            {/* Card Sertanejo */}
            <CorpusEnrichmentCard
              corpusType="sertanejo"
              title="Corpus Sertanejo"
              description="Popular com artistas sertanejos"
              icon={Guitar}
              colorScheme="amber"
              sourceUrl="https://www.letras.mus.br/mais-acessadas/sertanejo/"
              sourceName="letras.mus.br"
              defaultArtistLimit={30}
              defaultSongsPerArtist={15}
              artistLimitOptions={[15, 30, 45, 60]}
              songsPerArtistOptions={[10, 15, 20, 25]}
              onComplete={fetchCoverage}
            />
          </div>
        </TabsContent>

        <TabsContent value="enrich" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Enriquecer Músicas Existentes</CardTitle>
              <CardDescription>
                Buscar letras para músicas já cadastradas que não possuem letra
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Gaúcho Enrichment */}
                <div className="p-4 rounded-lg border space-y-3">
                  <div className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-emerald-600" />
                    <span className="font-medium">Gaúcho</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-600">
                    {gauchoStats?.withoutLyrics?.toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">músicas sem letra</p>
                  {(gauchoStats?.withoutLyrics || 0) > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Prioridade Alta
                    </Badge>
                  )}
                </div>

                {/* Sertanejo Enrichment */}
                <div className="p-4 rounded-lg border space-y-3">
                  <div className="flex items-center gap-2">
                    <Guitar className="h-5 w-5 text-amber-600" />
                    <span className="font-medium">Sertanejo</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {sertanejoStats?.withoutLyrics || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">músicas sem letra</p>
                  {(sertanejoStats?.withoutLyrics || 0) === 0 && (
                    <Badge variant="default" className="text-xs bg-green-500">
                      ✓ Completo
                    </Badge>
                  )}
                </div>

                {/* Nordestino Enrichment */}
                <div className="p-4 rounded-lg border space-y-3">
                  <div className="flex items-center gap-2">
                    <Sun className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Nordestino</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-600">
                    {nordestinoStats?.withoutLyrics || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">músicas sem letra</p>
                  {(nordestinoStats?.withoutLyrics || 0) > 0 && (nordestinoStats?.withoutLyrics || 0) < 100 && (
                    <Badge variant="outline" className="text-xs">
                      Prioridade Baixa
                    </Badge>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground mt-4 text-center">
                Use o card de População acima para buscar letras de novas fontes, 
                ou acesse o Catálogo Musical para enriquecer artistas específicos.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
