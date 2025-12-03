/**
 * SertanejoPopulateCard - Card para popular Corpus Sertanejo vazio
 * Scraping de Letras.mus.br/mais-acessadas/sertanejo
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Guitar,
  Music,
  Loader2,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Users,
  FileMusic,
} from 'lucide-react';
import { useLyricsEnrichment } from '@/hooks/useLyricsEnrichment';

interface SertanejoPopulateCardProps {
  onComplete?: () => void;
}

export function SertanejoPopulateCard({ onComplete }: SertanejoPopulateCardProps) {
  const [artistLimit, setArtistLimit] = useState<string>('25');
  const [songsPerArtist, setSongsPerArtist] = useState<string>('20');
  
  const { populateSertanejo, sertanejoProgress, isPopulating } = useLyricsEnrichment();

  const handlePopulate = async () => {
    await populateSertanejo(parseInt(artistLimit), parseInt(songsPerArtist));
    onComplete?.();
  };

  const isCompleted = sertanejoProgress.status === 'completed';
  const hasError = sertanejoProgress.status === 'error';

  return (
    <Card className="border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Guitar className="h-5 w-5 text-amber-600" />
          Corpus Sertanejo
          {isCompleted && <Badge variant="default" className="bg-green-500">Populado</Badge>}
        </CardTitle>
        <CardDescription>
          {isCompleted 
            ? 'O corpus foi populado com sucesso!' 
            : 'Este corpus ainda não possui artistas cadastrados.'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Info Section */}
        {!isCompleted && !isPopulating && (
          <>
            <div className="p-3 rounded-lg bg-white/50 dark:bg-black/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-muted-foreground">
                Popule automaticamente com os artistas mais acessados do gênero sertanejo 
                no <a 
                  href="https://www.letras.mus.br/mais-acessadas/sertanejo/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Letras.mus.br
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>

            {/* Configuration */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Artistas a importar
                </label>
                <Select value={artistLimit} onValueChange={setArtistLimit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 artistas</SelectItem>
                    <SelectItem value="25">25 artistas</SelectItem>
                    <SelectItem value="50">50 artistas</SelectItem>
                    <SelectItem value="100">100 artistas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Músicas por artista
                </label>
                <Select value={songsPerArtist} onValueChange={setSongsPerArtist}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 músicas</SelectItem>
                    <SelectItem value="20">20 músicas</SelectItem>
                    <SelectItem value="30">30 músicas</SelectItem>
                    <SelectItem value="50">50 músicas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Estimate */}
            <div className="text-xs text-muted-foreground">
              Estimativa: ~{parseInt(artistLimit) * parseInt(songsPerArtist)} músicas com letras verificadas
            </div>

            {/* Action Button */}
            <Button 
              className="w-full" 
              onClick={handlePopulate}
              disabled={isPopulating}
            >
              <Music className="h-4 w-4 mr-2" />
              Popular Corpus Sertanejo
            </Button>
          </>
        )}

        {/* Progress Section */}
        {isPopulating && (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
            
            <p className="text-center text-sm text-muted-foreground">
              Populando corpus... Isso pode levar alguns minutos.
            </p>

            <Progress value={50} className="h-2" />
            
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="p-2 rounded bg-white/50 dark:bg-black/20">
                <div className="font-bold text-amber-600 flex items-center justify-center gap-1">
                  <Users className="h-4 w-4" />
                  {sertanejoProgress.artistsCreated}
                </div>
                <div className="text-xs text-muted-foreground">Artistas</div>
              </div>
              <div className="p-2 rounded bg-white/50 dark:bg-black/20">
                <div className="font-bold text-amber-600 flex items-center justify-center gap-1">
                  <Music className="h-4 w-4" />
                  {sertanejoProgress.songsCreated}
                </div>
                <div className="text-xs text-muted-foreground">Músicas</div>
              </div>
              <div className="p-2 rounded bg-white/50 dark:bg-black/20">
                <div className="font-bold text-green-600 flex items-center justify-center gap-1">
                  <FileMusic className="h-4 w-4" />
                  {sertanejoProgress.songsWithLyrics}
                </div>
                <div className="text-xs text-muted-foreground">Com Letras</div>
              </div>
            </div>
          </div>
        )}

        {/* Completed Section */}
        {isCompleted && (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="p-3 rounded bg-white/50 dark:bg-black/20">
                <div className="text-2xl font-bold text-amber-600">
                  {sertanejoProgress.artistsCreated}
                </div>
                <div className="text-xs text-muted-foreground">Artistas</div>
              </div>
              <div className="p-3 rounded bg-white/50 dark:bg-black/20">
                <div className="text-2xl font-bold text-amber-600">
                  {sertanejoProgress.songsCreated}
                </div>
                <div className="text-xs text-muted-foreground">Músicas</div>
              </div>
              <div className="p-3 rounded bg-white/50 dark:bg-black/20">
                <div className="text-2xl font-bold text-green-600">
                  {sertanejoProgress.songsWithLyrics}
                </div>
                <div className="text-xs text-muted-foreground">Com Letras</div>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Todas as letras incluem link de atribuição para o site original.
            </p>
          </div>
        )}

        {/* Error Section */}
        {hasError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div className="text-sm text-red-800 dark:text-red-200">
              <strong>Erro:</strong> {sertanejoProgress.error || 'Falha ao popular corpus'}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}