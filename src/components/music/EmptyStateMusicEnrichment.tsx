import { Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateMusicEnrichmentProps {
  onImportClick: () => void;
}

export function EmptyStateMusicEnrichment({ onImportClick }: EmptyStateMusicEnrichmentProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="max-w-2xl w-full text-center">
        <CardContent className="pt-12 pb-12 space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-6">
              <Music className="h-16 w-16 text-primary" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Enriquecedor de Metadados Musicais
            </h1>
            <p className="text-muted-foreground text-lg">
              Nenhum arquivo carregado. Importe uma planilha Excel para começar.
            </p>
          </div>

          <div className="pt-4">
            <Button 
              size="lg" 
              onClick={onImportClick}
              className="min-w-[200px]"
            >
              Importar Dados
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
