import { memo } from 'react';
// @ts-ignore - react-window types
import { FixedSizeList } from 'react-window';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X, Edit2, Music } from 'lucide-react';
import type { SongMetadata } from '@/data/types/full-text-corpus.types';

interface EnrichedSongData extends SongMetadata {
  status: 'pending' | 'enriching' | 'enriched' | 'validated' | 'rejected' | 'error' | 'applied';
  sugestao?: {
    compositor?: string;
    artista?: string;
    album?: string;
    ano?: string;
    fonte: 'musicbrainz' | 'ai-inferred' | 'not-found';
    confianca: number;
    detalhes?: string;
  };
  compositorEditado?: string;
  fonteValidada?: 'musicbrainz' | 'ai-inferred' | 'manual';
  letra?: string;
}

interface VirtualizedSongListProps {
  songs: EnrichedSongData[];
  displaySongs: EnrichedSongData[];
  isEnriching: boolean;
  onValidate: (index: number, accept: boolean) => void;
  onEdit: (index: number, compositor: string) => void;
  editingComposer: Record<number, string>;
  onEditChange: (index: number, value: string) => void;
  onEditToggle: (index: number) => void;
}

// Componente de linha individual (MEMOIZADO)
const SongRow = memo(({ 
  index, 
  style,
  song,
  actualIndex,
  isEnriching,
  onValidate,
  onEdit,
  editingComposer,
  onEditChange,
  onEditToggle
}: { 
  index: number;
  style: any;
  song: EnrichedSongData;
  actualIndex: number;
  isEnriching: boolean;
  onValidate: (index: number, accept: boolean) => void;
  onEdit: (index: number, compositor: string) => void;
  editingComposer: Record<number, string>;
  onEditChange: (index: number, value: string) => void;
  onEditToggle: (index: number) => void;
}) => {
  const getStatusBadge = (status: EnrichedSongData['status']) => {
    const variants = {
      pending: { variant: 'outline' as const, label: 'Pendente', className: 'bg-gray-500/20' },
      enriching: { variant: 'secondary' as const, label: 'Processando...', className: 'bg-blue-500/20' },
      enriched: { variant: 'outline' as const, label: 'Aguardando', className: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' },
      validated: { variant: 'outline' as const, label: 'Validada', className: 'bg-green-500/20 text-green-700 dark:text-green-300' },
      rejected: { variant: 'outline' as const, label: 'Rejeitada', className: 'bg-red-500/20 text-red-700 dark:text-red-300' },
      applied: { variant: 'secondary' as const, label: 'Aplicada', className: '' },
      error: { variant: 'destructive' as const, label: 'Erro', className: '' }
    };
    
    const config = variants[status];
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const getConfidenceBadge = (confianca: number) => {
    if (confianca >= 85) {
      return <Badge variant="outline" className="bg-green-500/20 text-green-700">Alta ({confianca}%)</Badge>;
    } else if (confianca >= 70) {
      return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700">Média ({confianca}%)</Badge>;
    } else {
      return <Badge variant="outline" className="bg-red-500/20 text-red-700">Baixa ({confianca}%)</Badge>;
    }
  };

  const getFonteBadge = (fonte: 'musicbrainz' | 'ai-inferred' | 'not-found') => {
    const config = {
      'musicbrainz': { label: 'MusicBrainz', className: 'bg-blue-500/20 text-blue-700' },
      'ai-inferred': { label: 'Gemini AI', className: 'bg-purple-500/20 text-purple-700' },
      'not-found': { label: 'Não Encontrado', className: 'bg-gray-500/20' }
    };
    
    const { label, className } = config[fonte];
    return <Badge variant="outline" className={className}>{label}</Badge>;
  };

  return (
    <div style={style} className="px-2">
      <div className="border rounded-lg p-4 mb-2 bg-card">
        <div className="flex items-start justify-between gap-4">
          {/* Informações da música */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <h4 className="font-semibold truncate">{song.musica}</h4>
              {getStatusBadge(song.status)}
            </div>
            
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                <strong>Artista:</strong> {song.artista}
              </p>
              
              {song.sugestao && (
                <div className="mt-3 p-3 bg-muted/50 rounded border">
                  <div className="flex items-center gap-2 mb-2">
                    {getFonteBadge(song.sugestao.fonte)}
                    {getConfidenceBadge(song.sugestao.confianca)}
                  </div>
                  
                  <div className="space-y-1">
                    <p>
                      <strong>Compositor:</strong>{' '}
                      {editingComposer[actualIndex] !== undefined ? (
                        <Input
                          value={editingComposer[actualIndex]}
                          onChange={(e) => onEditChange(actualIndex, e.target.value)}
                          onBlur={() => onEdit(actualIndex, editingComposer[actualIndex])}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onEdit(actualIndex, editingComposer[actualIndex]);
                            }
                          }}
                          className="inline-block w-auto"
                          autoFocus
                        />
                      ) : (
                        <>
                          {song.sugestao.compositor || 'N/A'}
                          {song.status === 'enriched' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditToggle(actualIndex)}
                              className="ml-2 h-6 px-2"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                        </>
                      )}
                    </p>
                    
                    {song.sugestao.album && (
                      <p><strong>Álbum:</strong> {song.sugestao.album}</p>
                    )}
                    
                    {song.sugestao.ano && (
                      <p><strong>Ano:</strong> {song.sugestao.ano}</p>
                    )}
                    
                    {song.sugestao.detalhes && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {song.sugestao.detalhes}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Ações de validação */}
          {song.status === 'enriched' && song.sugestao && (
            <div className="flex gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="default"
                onClick={() => onValidate(actualIndex, true)}
                disabled={isEnriching}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onValidate(actualIndex, false)}
                disabled={isEnriching}
                className="border-red-500 text-red-600 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

SongRow.displayName = 'SongRow';

export function VirtualizedSongList({
  songs,
  displaySongs,
  isEnriching,
  onValidate,
  onEdit,
  editingComposer,
  onEditChange,
  onEditToggle
}: VirtualizedSongListProps) {
  // Criar função de renderização de linhas
  const Row = ({ index, style }: { index: number; style: any }) => {
    const song = displaySongs[index];
    const actualIndex = songs.indexOf(song);
    
    return (
      <SongRow
        index={index}
        style={style}
        song={song}
        actualIndex={actualIndex}
        isEnriching={isEnriching}
        onValidate={onValidate}
        onEdit={onEdit}
        editingComposer={editingComposer}
        onEditChange={onEditChange}
        onEditToggle={onEditToggle}
      />
    );
  };

  return (
    <FixedSizeList
      height={800}
      itemCount={displaySongs.length}
      itemSize={280}
      width="100%"
      className="scrollbar-thin"
    >
      {Row}
    </FixedSizeList>
  );
}
