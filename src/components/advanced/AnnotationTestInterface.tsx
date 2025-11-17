import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Sparkles, TestTube } from 'lucide-react';
import { useAnnotationJobMonitor } from '@/hooks/useAnnotationJobMonitor';
import { AnnotationDemoAlert } from './AnnotationDemoAlert';

const LETRA_TESTE = `A calma do tarumã, ganhou sombra mais copada
Pela várzea espichada com o sol da tarde caindo
Um pañuelo maragato se abriu no horizonte
Trazendo um novo reponte, prá um fim de tarde bem lindo`;

interface AnnotationResult {
  palavra: string;
  tagset_codigo: string;
  prosody: number;
  confianca: number;
}

export function AnnotationTestInterface() {
  const [texto, setTexto] = useState(LETRA_TESTE);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [results, setResults] = useState<AnnotationResult[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const { job } = useAnnotationJobMonitor(jobId);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  useEffect(() => {
    if (!job) return;
    if (job.status === 'completed') {
      loadResults(job.id);
      setIsAnnotating(false);
    } else if (job.status === 'failed') {
      setIsAnnotating(false);
    }
  }, [job]);

  const startAnnotation = async () => {
    // Se não autenticado e não está em modo demo, mostrar bloqueio
    if (!isAuthenticated && !demoMode) {
      toast.error('Ative o Modo Demonstração ou faça login para continuar');
      return;
    }

    setIsAnnotating(true);
    setResults([]);
    
    try {
      let data, error;

      if (demoMode) {
        // Em modo demo, fazer chamada direta via fetch para evitar header de auth inválido
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/annotate-semantic`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              corpus_type: 'marenco-verso',
              custom_text: texto,
              demo_mode: true
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro na requisição');
        }

        data = await response.json();
      } else {
        // Modo normal com autenticação
        const result = await supabase.functions.invoke('annotate-semantic', {
          body: { 
            corpus_type: 'marenco-verso', 
            custom_text: texto,
            demo_mode: false
          }
        });
        
        data = result.data;
        error = result.error;
        
        if (error) throw error;
      }

      setJobId(data.job.id);
      
      if (demoMode) {
        toast.success('Anotação DEMO iniciada! Dados temporários não serão salvos.', {
          duration: 5000,
        });
      } else {
        toast.success('Anotação iniciada! O progresso será monitorado em tempo real.');
      }
    } catch (error: any) {
      console.error('Erro:', error);
      setIsAnnotating(false);
      toast.error(error.message || 'Erro ao iniciar anotação');
    }
  };

  const loadResults = async (jobId: string) => {
    const { data } = await supabase
      .from('annotated_corpus')
      .select('*')
      .eq('job_id', jobId);
    if (data) setResults(data as any);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Teste de Anotação Semântica
          {demoMode && (
            <Badge variant="outline" className="ml-2 border-amber-500 text-amber-500">
              <TestTube className="w-3 h-3 mr-1" />
              Modo Demo
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {demoMode 
            ? 'Testando sem autenticação - dados temporários' 
            : 'Teste a anotação automática com IA'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isAuthenticated && !demoMode && (
          <AnnotationDemoAlert onEnableDemo={() => setDemoMode(true)} />
        )}

        {(!isAuthenticated || demoMode) && (
          <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
            <Switch 
              id="demo-mode" 
              checked={demoMode}
              onCheckedChange={setDemoMode}
              disabled={isAuthenticated}
            />
            <Label htmlFor="demo-mode" className="text-sm cursor-pointer">
              Modo Demonstração {demoMode ? '(Ativo)' : '(Inativo)'}
            </Label>
          </div>
        )}

        <Textarea 
          value={texto} 
          onChange={(e) => setTexto(e.target.value)} 
          className="min-h-[200px]" 
          placeholder="Digite ou cole o texto para anotação..."
        />
        
        <Button 
          onClick={startAnnotation} 
          disabled={isAnnotating || (!isAuthenticated && !demoMode)}
          className="w-full"
        >
          {isAnnotating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 
              Anotando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Iniciar Anotação {demoMode && '(Demo)'}
            </>
          )}
        </Button>

        {job && job.status === 'processing' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso da anotação</span>
              <span className="font-medium">{Math.round((job.progresso || 0) * 100)}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(job.progresso || 0) * 100}%` }}
              />
            </div>
          </div>
        )}
        
        {results.length > 0 && (
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Resultado da Anotação</span>
              <Badge variant="secondary">{results.length} palavras</Badge>
            </div>
            {demoMode && (
              <p className="text-xs text-amber-600">
                ⚠️ Dados temporários - não serão salvos permanentemente
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
