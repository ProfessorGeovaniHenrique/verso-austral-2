import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, ExternalLink, Database, Calendar, CheckCircle2 } from 'lucide-react';

interface DictionaryMetadata {
  nome: string;
  fonte: string;
  edicao?: string;
  ano?: number;
  tipo: 'dialectal' | 'gutenberg' | 'rochaPombo' | 'unesp' | 'nordestino_navarro';
  esperado: number;
  atual: number;
  githubUrl?: string;
  descricao: string;
  licenca?: string;
  customActions?: React.ReactNode;
}

interface DictionaryMetadataCardProps {
  metadata: DictionaryMetadata;
  onImport?: () => void;
  onVerify?: () => void;
  isImporting?: boolean;
}

export function DictionaryMetadataCard({ metadata, onImport, onVerify, isImporting }: DictionaryMetadataCardProps) {
  const completionRate = (metadata.atual / metadata.esperado) * 100;
  const isComplete = completionRate >= 95;
  const isPartial = completionRate >= 50 && completionRate < 95;
  
  const getStatusColor = () => {
    if (isComplete) return 'bg-green-500';
    if (isPartial) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="relative overflow-hidden">
      {/* Status indicator bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${getStatusColor()}`} />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <BookOpen className="h-5 w-5 text-primary mt-1" />
            <div>
              <CardTitle className="text-base">{metadata.nome}</CardTitle>
              <CardDescription className="text-xs mt-1">
                {metadata.fonte}
                {metadata.edicao && ` • ${metadata.edicao}`}
                {metadata.ano && ` • ${metadata.ano}`}
              </CardDescription>
            </div>
          </div>
          
          {isComplete && (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Descrição */}
        <p className="text-sm text-muted-foreground">{metadata.descricao}</p>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Database className="h-3 w-3" />
              <span>Atual</span>
            </div>
            <p className="text-lg font-semibold">{metadata.atual.toLocaleString()}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Database className="h-3 w-3" />
              <span>Esperado</span>
            </div>
            <p className="text-lg font-semibold">{metadata.esperado.toLocaleString()}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Completude</span>
            <span className="font-medium">{completionRate.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${getStatusColor()}`}
              style={{ width: `${Math.min(completionRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Licença */}
        {metadata.licenca && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{metadata.licenca}</span>
          </div>
        )}

        {/* Status badge */}
        <div className="flex items-center gap-2">
          <Badge 
            variant={isComplete ? 'default' : isPartial ? 'secondary' : 'outline'}
            className="text-xs"
          >
            {isComplete ? '✓ Completo' : isPartial ? 'Parcial' : 'Pendente'}
          </Badge>
        </div>

        {/* Ações */}
        <div className="flex gap-2 flex-wrap">
          {metadata.customActions}
          
          {onImport && (
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={onImport}
              disabled={isImporting}
            >
              {isImporting ? 'Importando...' : isComplete ? 'Reimportar' : 'Importar'}
            </Button>
          )}
          
          {onVerify && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="flex-1"
              onClick={onVerify}
            >
              Verificar
            </Button>
          )}
          
          {metadata.githubUrl && (
            <Button 
              size="sm" 
              variant="ghost"
              className="w-9 h-9 p-0"
              asChild
            >
              <a href={metadata.githubUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
