import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ClearDictionariesCardProps {
  stats?: {
    gaucho: { total: number };
    navarro: { total: number };
    rochaPombo: { total: number };
    gutenberg: { total: number };
    overall: { total_entries: number };
  };
  onSuccess?: () => void;
}

export function ClearDictionariesCard({ stats, onSuccess }: ClearDictionariesCardProps) {
  const [isClearing, setIsClearing] = useState(false);

  const handleClearAllDictionaries = async () => {
    setIsClearing(true);
    try {
      const { data, error } = await supabase.functions.invoke('clear-all-dictionaries');
      
      if (error) throw error;
      
      toast.success('✅ Todos os dicionários foram limpos com sucesso');
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao limpar:', error);
      toast.error(`❌ Erro: ${error.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Operação Crítica: Limpeza de Dicionários
        </CardTitle>
        <CardDescription>
          Esta operação irá <strong>EXCLUIR PERMANENTEMENTE</strong> todos os verbetes dos 4 dicionários
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-2 bg-background rounded border">
              <p className="font-semibold">Gaúcho Unificado</p>
              <p className="text-muted-foreground">{stats.gaucho.total.toLocaleString()} verbetes</p>
            </div>
            <div className="p-2 bg-background rounded border">
              <p className="font-semibold">Navarro 2014</p>
              <p className="text-muted-foreground">{stats.navarro.total.toLocaleString()} verbetes</p>
            </div>
            <div className="p-2 bg-background rounded border">
              <p className="font-semibold">Rocha Pombo</p>
              <p className="text-muted-foreground">{stats.rochaPombo.total.toLocaleString()} verbetes</p>
            </div>
            <div className="p-2 bg-background rounded border">
              <p className="font-semibold">Gutenberg</p>
              <p className="text-muted-foreground">{stats.gutenberg.total.toLocaleString()} verbetes</p>
            </div>
          </div>
        )}
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              className="w-full"
              size="lg"
              disabled={isClearing}
            >
              <Trash2 className="h-5 w-5 mr-2" />
              Limpar Todos os Dicionários
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>⚠️ Confirmar Exclusão Permanente</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                {stats ? (
                  <>
                    <p className="font-semibold text-destructive text-base">
                      Esta ação irá EXCLUIR {stats.overall.total_entries.toLocaleString()} verbetes:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Gaúcho Unificado ({stats.gaucho.total.toLocaleString()} verbetes)</li>
                      <li>Navarro 2014 ({stats.navarro.total.toLocaleString()} verbetes)</li>
                      <li>Rocha Pombo ({stats.rochaPombo.total.toLocaleString()} verbetes)</li>
                      <li>Gutenberg ({stats.gutenberg.total.toLocaleString()} verbetes)</li>
                    </ul>
                  </>
                ) : (
                  <p className="font-semibold text-destructive text-base">
                    Esta ação irá EXCLUIR TODOS os verbetes dos 4 dicionários.
                  </p>
                )}
                <p className="text-sm font-semibold mt-4">
                  ⚠️ Esta operação NÃO pode ser desfeita!
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearAllDictionaries}
                className="bg-destructive hover:bg-destructive/90"
              >
                Sim, Excluir Tudo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
