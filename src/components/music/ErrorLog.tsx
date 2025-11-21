import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, RotateCcw, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export interface ErrorEntry {
  songId: string;
  songTitle: string;
  errorType: string;
  errorMessage: string;
  timestamp: Date;
  retryCount: number;
}

interface ErrorLogProps {
  errors: ErrorEntry[];
  onRetry: (songId: string) => void;
  onRetryAll: () => void;
  maxHeight?: string;
}

export function ErrorLog({ errors, onRetry, onRetryAll, maxHeight = '400px' }: ErrorLogProps) {
  // Group errors by type
  const errorsByType = errors.reduce((acc, error) => {
    if (!acc[error.errorType]) {
      acc[error.errorType] = [];
    }
    acc[error.errorType].push(error);
    return acc;
  }, {} as Record<string, ErrorEntry[]>);

  const totalErrors = errors.length;
  const errorTypes = Object.keys(errorsByType);

  if (totalErrors === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum erro registrado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Log de Erros
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {totalErrors} erro(s) em {errorTypes.length} categoria(s)
            </p>
          </div>
          
          {totalErrors > 0 && (
            <Button variant="outline" size="sm" onClick={onRetryAll}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Todos Novamente
            </Button>
          )}
        </div>

        {/* Error Type Summary */}
        <div className="flex flex-wrap gap-2 mt-4">
          {errorTypes.map(type => (
            <Badge key={type} variant="destructive">
              {type} ({errorsByType[type].length})
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea style={{ height: maxHeight }}>
          <div className="space-y-4">
            {Object.entries(errorsByType).map(([type, typeErrors]) => (
              <div key={type} className="space-y-2">
                <h4 className="font-semibold text-sm text-destructive sticky top-0 bg-background py-1">
                  {type} ({typeErrors.length})
                </h4>
                
                <div className="space-y-2">
                  {typeErrors.map((error) => (
                    <div
                      key={error.songId}
                      className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <p className="font-medium text-sm">{error.songTitle}</p>
                          <p className="text-xs text-muted-foreground">{error.errorMessage}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{format(error.timestamp, 'HH:mm:ss')}</span>
                            {error.retryCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {error.retryCount} tentativa(s)
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRetry(error.songId)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Tentar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
