/**
 * 🔄 COMPARE MODE ALERT
 * Sprint AUD-U: Feedback visual para modo de comparação
 * 
 * Exibe alerta informativo quando modo compare está ativo
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { GitCompare, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompareModeAlertProps {
  artistA?: string | null;
  artistB?: string | null;
  corpusA?: string;
  corpusB?: string;
  className?: string;
  variant?: 'default' | 'compact';
}

export function CompareModeAlert({
  artistA,
  artistB,
  corpusA,
  corpusB,
  className,
  variant = 'default'
}: CompareModeAlertProps) {
  const hasArtists = artistA || artistB;
  const hasCorpora = corpusA || corpusB;
  
  if (!hasArtists && !hasCorpora) return null;
  
  if (variant === 'compact') {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 border border-primary/20",
        className
      )}>
        <GitCompare className="h-4 w-4 text-primary" />
        <span className="text-sm text-primary font-medium">Modo Comparação</span>
        {hasArtists && (
          <>
            <Badge variant="outline" className="text-xs">{artistA || 'Corpus A'}</Badge>
            <span className="text-muted-foreground">vs</span>
            <Badge variant="outline" className="text-xs">{artistB || 'Corpus B'}</Badge>
          </>
        )}
      </div>
    );
  }
  
  return (
    <Alert className={cn("border-primary/30 bg-primary/5", className)}>
      <GitCompare className="h-4 w-4 text-primary" />
      <AlertTitle className="text-primary flex items-center gap-2">
        Modo Comparação Ativo
        <Badge variant="secondary" className="text-xs">2 corpora</Badge>
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-1">
        <p className="text-sm text-muted-foreground">
          {hasArtists ? (
            <>
              Comparando <strong>{artistA || 'Corpus de Estudo'}</strong> com{' '}
              <strong>{artistB || 'Corpus de Referência'}</strong>.
            </>
          ) : (
            <>
              Comparando <strong>{corpusA || 'Corpus de Estudo'}</strong> com{' '}
              <strong>{corpusB || 'Corpus de Referência'}</strong>.
            </>
          )}
        </p>
        <p className="text-xs text-muted-foreground/80 flex items-center gap-1">
          <Info className="h-3 w-3" />
          Cada ocorrência mostra a fonte na coluna lateral.
        </p>
      </AlertDescription>
    </Alert>
  );
}
