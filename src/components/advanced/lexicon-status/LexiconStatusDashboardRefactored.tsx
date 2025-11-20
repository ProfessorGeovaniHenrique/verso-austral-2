import { useLexiconStats } from '@/hooks/useLexiconStats';
import { DictionaryStatusCard } from './DictionaryStatusCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, TrendingUp, Database, CheckCircle, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
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

export function LexiconStatusDashboardRefactored() {
  const { data: stats, isLoading, refetch, isRefetching } = useLexiconStats();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearAllDictionaries = async () => {
    setIsClearing(true);
    try {
      const { data, error } = await supabase.functions.invoke('clear-all-dictionaries');
      
      if (error) throw error;
      
      toast.success('✅ Todos os dicionários foram limpos com sucesso');
      await refetch();
    } catch (error: any) {
      console.error('Erro ao limpar:', error);
      toast.error(`❌ Erro: ${error.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Alert>
        <AlertDescription>Nenhuma estatística disponível</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Status dos Léxicos</h2>
          <p className="text-sm text-muted-foreground mt-1">Monitoramento em tempo real dos dicionários importados</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* ⚠️ CARD DE LIMPEZA - OPERAÇÃO CRÍTICA */}
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Operação Crítica: Limpeza de Dicionários
          </CardTitle>
          <CardDescription>
            Esta operação irá <strong>EXCLUIR PERMANENTEMENTE</strong> todos os verbetes dos 5 dicionários
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="p-2 bg-background rounded border">
              <p className="font-semibold">Gaúcho Unificado</p>
              <p className="text-muted-foreground">{stats.gaucho.total.toLocaleString()} verbetes</p>
            </div>
            <div className="p-2 bg-background rounded border">
              <p className="font-semibold">Navarro 2014</p>
              <p className="text-muted-foreground">{stats.navarro.total.toLocaleString()} verbetes</p>
            </div>
            <div className="p-2 bg-background rounded border">
              <p className="font-semibold">UNESP</p>
              <p className="text-muted-foreground">{stats.unesp.total.toLocaleString()} verbetes</p>
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
                  <p className="font-semibold text-destructive text-base">
                    Esta ação irá EXCLUIR {stats.overall.total_entries.toLocaleString()} verbetes:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Gaúcho Unificado ({stats.gaucho.total.toLocaleString()} verbetes)</li>
                    <li>Navarro 2014 ({stats.navarro.total.toLocaleString()} verbetes)</li>
                    <li>UNESP ({stats.unesp.total.toLocaleString()} verbetes)</li>
                    <li>Rocha Pombo ({stats.rochaPombo.total.toLocaleString()} verbetes)</li>
                    <li>Gutenberg ({stats.gutenberg.total.toLocaleString()} verbetes)</li>
                  </ul>
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

      {/* ✅ FASE 5: Métricas Gerais Destacadas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Entradas</p>
                <p className="text-3xl font-bold">{stats.overall.total_entries.toLocaleString()}</p>
              </div>
              <Database className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Validação</p>
                <p className="text-3xl font-bold">{(stats.overall.validation_rate * 100).toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Última Importação</p>
                <p className="text-lg font-bold">
                  {stats.overall.last_import 
                    ? new Date(stats.overall.last_import).toLocaleDateString('pt-BR')
                    : 'N/A'
                  }
                </p>
              </div>
              <RefreshCw className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Status por Dicionário (5 Dicionários)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          
          <DictionaryStatusCard
            nome="Gaúcho Unificado"
            status={stats.gaucho.total === 0 ? 'empty' : stats.gaucho.confianca_media < 0.7 ? 'warning' : 'healthy'}
            metricas={{
              total: stats.gaucho.total,
              validados: stats.gaucho.validados,
              confianca: stats.gaucho.confianca_media,
            }}
          />

          <DictionaryStatusCard
            nome="Navarro 2014"
            status={stats.navarro.total === 0 ? 'empty' : stats.navarro.confianca_media < 0.4 ? 'warning' : 'healthy'}
            metricas={{
              total: stats.navarro.total,
              validados: stats.navarro.validados,
              confianca: stats.navarro.confianca_media,
            }}
          />

          <DictionaryStatusCard
            nome="UNESP"
            status={stats.unesp.total === 0 ? 'empty' : 'healthy'}
            metricas={{
              total: stats.unesp.total,
              validados: stats.unesp.total,
              confianca: 1.0,
            }}
          />

          <DictionaryStatusCard
            nome="Rocha Pombo (ABL)"
            status={stats.rochaPombo.total === 0 ? 'empty' : 'healthy'}
            metricas={{
              total: stats.rochaPombo.total,
              validados: stats.rochaPombo.total,
              confianca: 1.0,
            }}
          />

          <DictionaryStatusCard
            nome="Gutenberg"
            status={stats.gutenberg.total === 0 ? 'empty' : stats.gutenberg.total < 10000 ? 'critical' : stats.gutenberg.total < 500000 ? 'warning' : 'healthy'}
            metricas={{
              total: stats.gutenberg.total,
              validados: stats.gutenberg.validados,
              confianca: stats.gutenberg.confianca_media,
            }}
          />
          
        </div>
      </div>

      {/* ✅ Card Especial: Validação Navarro 2014 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Validação Humana: Navarro 2014
          </CardTitle>
          <CardDescription>
            Valide manualmente os verbetes do dicionário Nordestino para aumentar a precisão
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Taxa atual de validação: <strong>{((stats.navarro.validados / Math.max(1, stats.navarro.total)) * 100).toFixed(2)}%</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              {(stats.navarro.total - stats.navarro.validados).toLocaleString()} verbetes disponíveis para validação
            </p>
          </div>
          <Link to="/admin/navarro-validation">
            <Button className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Validar Verbetes
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
