import { useState } from 'react';
import { Music, Sparkles, Loader2, Eye, Trash2, MoreVertical, Folder, Youtube } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface Artist {
  id: string;
  name: string;
  genre: string | null;
  totalSongs: number;
  pendingSongs: number;
  enrichedPercentage: number;
}

interface ArtistCardProps {
  id: string;
  name: string;
  genre: string | null;
  totalSongs: number;
  pendingSongs: number;
  enrichedPercentage: number;
  corpusName?: string | null;
  corpusColor?: string | null;
  onViewDetails: () => void;
  onEnrich: () => Promise<void>;
  onEnrichYouTube?: () => Promise<void>;
  onAnnotateSemantic?: () => Promise<void>;
  isAnnotatingSemantic?: boolean;
  onDelete: () => Promise<void>;
}

export function ArtistCard({
  id,
  name,
  genre,
  totalSongs,
  pendingSongs,
  enrichedPercentage,
  corpusName,
  corpusColor,
  onViewDetails,
  onEnrich,
  onEnrichYouTube,
  onAnnotateSemantic,
  isAnnotatingSemantic = false,
  onDelete,
}: ArtistCardProps) {
  const [isEnriching, setIsEnriching] = useState(false);
  const [isEnrichingYT, setIsEnrichingYT] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const handleEnrich = async () => {
    setIsEnriching(true);
    try {
      await onEnrich();
    } finally {
      setIsEnriching(false);
    }
  };

  const handleEnrichYouTube = async () => {
    if (!onEnrichYouTube) return;
    setIsEnrichingYT(true);
    try {
      await onEnrichYouTube();
    } finally {
      setIsEnrichingYT(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      setShowDeleteAlert(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAnnotateSemantic = async () => {
    if (!onAnnotateSemantic) return;
    try {
      await onAnnotateSemantic();
    } catch (error) {
      console.error('Error annotating artist:', error);
    }
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg truncate" title={name}>
              {name}
            </CardTitle>
            <div className="flex items-center gap-2">
              {corpusName && (
                <Badge 
                  variant="outline" 
                  className="border-2 shrink-0"
                  style={{ borderColor: corpusColor || '#3B82F6' }}
                >
                  <Folder className="w-3 h-3 mr-1" />
                  {corpusName}
                </Badge>
              )}
              {genre && (
                <Badge variant="outline" className="shrink-0">
                  {genre}
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setShowDeleteAlert(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir artista
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Grid de Estatísticas */}
          <div className="grid grid-cols-2 gap-3">
            {/* Card 1 - Total */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <Music className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <div className="text-2xl font-bold">{totalSongs}</div>
            </div>

            {/* Card 2 - Pendentes */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <Sparkles className="h-4 w-4 text-yellow-600" />
                <span className="text-xs text-muted-foreground">Pendentes</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">{pendingSongs}</div>
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso de Enriquecimento</span>
              <span className="font-medium">{enrichedPercentage}%</span>
            </div>
            <Progress value={enrichedPercentage} className="h-2" />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onViewDetails}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver Detalhes
            </Button>

            {pendingSongs > 0 && (
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={handleEnrich}
                disabled={isEnriching}
              >
                {isEnriching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Enriquecer ({pendingSongs})
                  </>
                )}
              </Button>
            )}
          </div>
          
          {onEnrichYouTube && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleEnrichYouTube}
              disabled={isEnrichingYT}
            >
              {isEnrichingYT ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Buscando YouTube...
                </>
              ) : (
                <>
                  <Youtube className="h-4 w-4 mr-2" />
                  Enriquecer YouTube
                </>
              )}
            </Button>
          )}
          
          {onAnnotateSemantic && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleAnnotateSemantic}
              disabled={isAnnotatingSemantic}
            >
              {isAnnotatingSemantic ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Anotando...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
                  </svg>
                  Anotar Semanticamente
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá excluir permanentemente o artista "{name}" e todas as suas {totalSongs} músicas do catálogo. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir permanentemente
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
