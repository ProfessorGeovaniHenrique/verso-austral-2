import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Music } from "lucide-react";
import { SongProgress } from "@/hooks/useJobSongsProgress";
import { cn } from "@/lib/utils";

interface SongsProgressListProps {
  songs: SongProgress[];
  completedCount: number;
  totalCount: number;
  isLoading: boolean;
}

export function SongsProgressList({ songs, completedCount, totalCount, isLoading }: SongsProgressListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (songs.length === 0) return null;

  const getStatusIcon = (status: 'completed' | 'processing' | 'pending') => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'processing':
        return '🔄';
      case 'pending':
        return '⏳';
    }
  };

  const getStatusColor = (status: 'completed' | 'processing' | 'pending') => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'processing':
        return 'text-blue-600 dark:text-blue-400';
      case 'pending':
        return 'text-muted-foreground';
    }
  };

  // Mostrar apenas músicas completas e a atual se colapsado
  const displayedSongs = isExpanded 
    ? songs 
    : songs.filter(s => s.status === 'completed' || s.status === 'processing');

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4" />
            <CardTitle className="text-base">Músicas Processadas</CardTitle>
            <Badge variant="secondary">
              {completedCount} / {totalCount}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 px-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Minimizar
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Ver Todas
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {isLoading && displayedSongs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              Carregando músicas...
            </div>
          ) : displayedSongs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma música processada ainda
            </div>
          ) : (
            displayedSongs.map((song) => (
              <div
                key={song.id}
                className={cn(
                  "flex items-center justify-between py-2 px-3 rounded-md",
                  "hover:bg-muted/50 transition-colors",
                  song.status === 'processing' && "bg-primary/5 border border-primary/20"
                )}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-base">{getStatusIcon(song.status)}</span>
                  <span className={cn(
                    "text-sm truncate",
                    getStatusColor(song.status),
                    song.status === 'processing' && "font-medium"
                  )}>
                    {song.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {song.processedWords} / {song.totalWords}
                  </span>
                  {song.status === 'processing' && (
                    <Badge variant="outline" className="text-xs">
                      {song.totalWords > 0 
                        ? `${Math.round((song.processedWords / song.totalWords) * 100)}%`
                        : '0%'
                      }
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
