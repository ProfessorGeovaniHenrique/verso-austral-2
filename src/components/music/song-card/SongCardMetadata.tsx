/**
 * SongCard Metadata Component
 * Sprint CAT-AUDIT-P2 - Refatoração SongCard
 */

import { Sparkles, Edit } from 'lucide-react';

interface SongCardMetadataProps {
  composer?: string | null;
  album?: string;
  releaseYear?: string | null;
  enrichmentSource?: string | null;
  confidence: number;
  status?: string | null;
  isCompact?: boolean;
}

export function SongCardMetadata({
  composer,
  album,
  releaseYear,
  enrichmentSource,
  confidence,
  status,
  isCompact = false
}: SongCardMetadataProps) {
  const isEnriched = status === 'enriched';
  const displayYear = releaseYear && releaseYear !== '0000' ? releaseYear : null;

  if (isCompact) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          {composer && (
            <div className="bg-muted/30 rounded-lg p-2.5 border border-border/50">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Compositor</span>
                {isEnriched && <Sparkles className="w-3 h-3 text-green-500" />}
              </div>
              <p className="text-xs font-medium leading-tight line-clamp-2">{composer}</p>
            </div>
          )}
          {album && (
            <div className="bg-muted/30 rounded-lg p-2.5 border border-border/50">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Álbum:</span>
                {isEnriched && <Sparkles className="w-3 h-3 text-green-500" />}
              </div>
              <p className="text-xs font-medium leading-tight line-clamp-2">{album}</p>
            </div>
          )}
          {displayYear && (
            <div className="bg-muted/30 rounded-lg p-2.5 border border-border/50">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Ano de Lançamento</span>
                {isEnriched && <Sparkles className="w-3 h-3 text-green-500" />}
              </div>
              <p className="text-xs font-medium">{displayYear}</p>
            </div>
          )}
        </div>
        {(enrichmentSource || confidence > 0) && (
          <p className="text-[11px] text-muted-foreground">
            {enrichmentSource && <span>Fonte: {enrichmentSource}</span>}
            {enrichmentSource && confidence > 0 && <span> | </span>}
            {confidence > 0 && <span>Confiança: {(confidence * 100).toFixed(0)}%</span>}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div>
          <span className="text-muted-foreground">Compositor</span>
          <p className="text-foreground font-medium">{composer || 'Não identificado'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Ano de Lançamento</span>
          <p className="text-foreground font-medium flex items-center gap-1">
            {displayYear || '—'}
            {displayYear && <Edit className="w-3 h-3 text-muted-foreground cursor-pointer hover:text-foreground" />}
          </p>
        </div>
      </div>
      
      {/* Source and Confidence */}
      {(enrichmentSource || confidence > 0) && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {enrichmentSource && <span>Fonte: {enrichmentSource}</span>}
          {confidence > 0 && (
            <span className="text-success">Confiança: {(confidence * 100).toFixed(0)}%</span>
          )}
        </div>
      )}
    </>
  );
}
