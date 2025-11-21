import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MVPHeader } from '@/components/mvp/MVPHeader';
import { MVPFooter } from '@/components/mvp/MVPFooter';
import { AdminBreadcrumb } from '@/components/AdminBreadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, Clock, AlertCircle, Zap, Keyboard, RefreshCw, Database } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useDialectalLexicon } from '@/hooks/useDialectalLexicon';
import { useBackendLexicon, type LexiconEntry } from '@/hooks/useBackendLexicon';
import { ValidationInterface } from '@/components/advanced/ValidationInterface';
import { BatchValidationDialog } from '@/components/advanced/lexicon-status/BatchValidationDialog';
import { ClearDictionariesCard } from '@/components/advanced/lexicon-status/ClearDictionariesCard';
import { KeyboardShortcutsHelper } from '@/components/validation/KeyboardShortcutsHelper';
import { useLexiconStats } from '@/hooks/useLexiconStats';
import { VerbeteCard } from '@/components/validation/VerbeteCard';
import { useValidationShortcuts } from '@/hooks/useValidationShortcuts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const DICTIONARY_CONFIG: Record<string, { 
  displayName: string; 
  table: 'dialectal' | 'gutenberg' | 'synonyms'; 
  tipoDicionario?: string;
  edgeFunctionType: 'dialectal' | 'gutenberg' | 'rochaPombo' | 'unesp';
}> = {
  'gaucho_unificado': { 
    displayName: 'Gaúcho Unificado',
    table: 'dialectal',
    tipoDicionario: 'gaucho_unificado',
    edgeFunctionType: 'dialectal'
  },
  'rocha_pombo': { 
    displayName: 'Rocha Pombo (ABL)',
    table: 'synonyms',
    tipoDicionario: 'rocha_pombo',
    edgeFunctionType: 'rochaPombo'
  },
  'gutenberg': { 
    displayName: 'Gutenberg',
    table: 'gutenberg',
    edgeFunctionType: 'gutenberg'
  },
};

export default function AdminDictionaryValidation() {
  const { tipo } = useParams<{ tipo: string }>();
  const config = DICTIONARY_CONFIG[tipo || ''];
  const queryClient = useQueryClient();
  
  const [posFilter, setPosFilter] = useState<string>('all');
  const [validationFilter, setValidationFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [validationOpen, setValidationOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [dbDiagnostics, setDbDiagnostics] = useState<any>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const { data: lexiconStats, refetch: refetchStats } = useLexiconStats();

  const ITEMS_PER_PAGE = 24;

  // Buscar dados baseado na tabela configurada
  const { entries: dialectalEntries, isLoading: dialectalLoading, refetch: dialectalRefetch } = useDialectalLexicon({
    tipo_dicionario: config?.tipoDicionario,
    searchTerm: searchTerm || undefined,
  });

  const { lexicon: gutenbergEntries, isLoading: gutenbergLoading, refetch: gutenbergRefetch } = useBackendLexicon({
    table: 'gutenberg_lexicon',
    searchTerm: searchTerm || undefined,
  });

  const { lexicon: synonymEntries, isLoading: synonymLoading, refetch: synonymRefetch } = useBackendLexicon({
    table: 'lexical_synonyms',
    searchTerm: searchTerm || undefined,
    fonte: 'rocha_pombo',
  });

  if (!config) {
    return (
      <div className="min-h-screen bg-background">
        <MVPHeader />
        <div className="container mx-auto py-8 px-4">
          <AdminBreadcrumb currentPage="Validação de Dicionário" />
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Dicionário não encontrado</CardTitle>
              <CardDescription>O tipo de dicionário solicitado não existe.</CardDescription>
            </CardHeader>
          </Card>
        </div>
        <MVPFooter />
      </div>
    );
  }

  const isLoading = config.table === 'dialectal' 
    ? dialectalLoading 
    : config.table === 'synonyms'
    ? synonymLoading
    : gutenbergLoading;

  const allEntries = config.table === 'dialectal' 
    ? dialectalEntries 
    : config.table === 'synonyms'
    ? synonymEntries
    : gutenbergEntries;

  const refetch = config.table === 'dialectal' 
    ? dialectalRefetch 
    : config.table === 'synonyms'
    ? synonymRefetch
    : gutenbergRefetch;

  // 🔍 DIAGNÓSTICO: Verificar estado do banco
  const checkDatabaseState = async () => {
    setIsCheckingDb(true);
    try {
      if (tipo === 'rocha_pombo') {
        const { data, error, count } = await supabase
          .from('lexical_synonyms')
          .select('id, palavra, pos, sinonimos', { count: 'exact' })
          .eq('fonte', 'rocha_pombo')
          .limit(5);

        if (error) throw error;

        const diagnostics = {
          totalRecords: count || 0,
          sampleData: data || [],
          hasPOS: data?.[0]?.pos !== undefined,
          hasSinonimos: data?.[0]?.sinonimos !== undefined,
          timestamp: new Date().toISOString()
        };

        console.log('🔍 DIAGNÓSTICO DO BANCO (Rocha Pombo):', diagnostics);
        setDbDiagnostics(diagnostics);
        toast.success(`🔍 Diagnóstico Completo: ${count} registros no banco`);
      } else {
        const { data, error, count } = await supabase
          .from('gutenberg_lexicon')
          .select('id, verbete, classe_gramatical, definicoes', { count: 'exact' })
          .limit(5);

        if (error) throw error;

        const diagnostics = {
          totalRecords: count || 0,
          sampleData: data || [],
          hasClasseGramatical: data?.[0]?.classe_gramatical !== undefined,
          hasDefinicoes: data?.[0]?.definicoes !== undefined,
          timestamp: new Date().toISOString()
        };

        console.log('🔍 DIAGNÓSTICO DO BANCO (Gutenberg):', diagnostics);
        setDbDiagnostics(diagnostics);
        toast.success(`🔍 Diagnóstico Completo: ${count} registros no banco`);
      }
    } catch (error: any) {
      console.error('❌ Erro ao verificar banco:', error);
      toast.error(`Erro no Diagnóstico: ${error.message}`);
    } finally {
      setIsCheckingDb(false);
    }
  };

  // 🔄 FORÇAR ATUALIZAÇÃO: Limpar cache e recarregar
  const handleForceRefresh = async () => {
    console.log('🔄 Forçando atualização completa...');
    
    // Limpar cache local do navegador
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    // Recarregar dados
    await refetch();

    toast.success('🔄 Cache limpo e dados recarregados');
  };

  // ⚠️ ALERTA: Verificar dados incompletos
  useEffect(() => {
    if (config.table === 'gutenberg' && allEntries.length > 0) {
      const firstEntry = allEntries[0];
      if (!firstEntry.classe_gramatical && !firstEntry.definicoes) {
        console.warn('⚠️ DADOS INCOMPLETOS DETECTADOS:', firstEntry);
      }
    }
  }, [allEntries, config.table]);

  // Aplicar filtros adicionais (filtro de tipo_dicionario já aplicado no hook)
  const filteredEntries = allEntries.filter((entry: any) => {
    if (posFilter !== 'all' && entry.classe_gramatical !== posFilter) return false;
    if (validationFilter === 'validated' && (!entry.validation_status || entry.validation_status === 'pending')) return false;
    if (validationFilter === 'pending' && (entry.validation_status && entry.validation_status !== 'pending')) return false;
    return true;
  });

  const validatedCount = allEntries.filter((e: any) => {
    if (config.table === 'dialectal' || config.table === 'synonyms') {
      return e.validado_humanamente === true || e.validation_status === 'approved';
    }
    return e.validado === true || e.validation_status === 'approved';
  }).length;
  const pendingCount = allEntries.filter((e: any) => 
    !e.validation_status || e.validation_status === 'pending'
  ).length;
  const validationRate = allEntries.length > 0 
    ? ((validatedCount / allEntries.length) * 100).toFixed(2) 
    : '0.00';

  // 📊 DEBUG: Log sample data to verify validation_status
  React.useEffect(() => {
    if (allEntries.length > 0 && config.table === 'gutenberg') {
      const sample = allEntries.slice(0, 5);
      console.log('📊 AMOSTRA GUTENBERG:', {
        total: allEntries.length,
        validatedCount,
        pendingCount,
        validationRate: `${validationRate}%`,
        sample: sample.map((e: any) => ({
          verbete: e.verbete || e.palavra,
          validado: e.validado,
          validation_status: e.validation_status
        }))
      });
    }
  }, [allEntries.length, validatedCount, config.table, validationRate]);

  const pendingHighConfidenceCount = allEntries.filter((e: any) => 
    (!e.validation_status || e.validation_status === 'pending') &&
    (e.confianca_extracao || e.confianca || 0) >= 0.9
  ).length;

  const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleValidate = (entry: any) => {
    // Adaptar formato para ValidationInterface
    const adaptedEntry = {
      id: entry.id,
      palavra: entry.verbete || entry.palavra,
      lema: entry.verbete_normalizado || entry.lema,
      pos: entry.classe_gramatical || entry.pos || 'unknown',
      tagset: null,
      tagset_codigo: null,
      prosody: 0,
      confianca: entry.confianca_extracao || entry.confianca,
      validado: entry.validado_humanamente || entry.validado
    };
    setSelectedEntry(adaptedEntry);
    setValidationOpen(true);
  };

  const handleValidationSuccess = () => {
    refetch();
    refetchStats();
    setValidationOpen(false);
    setSelectedEntry(null);
  };

  const handleApprove = async (id: string) => {
    try {
      const tableName = config.table === 'dialectal' 
        ? 'dialectal_lexicon' 
        : config.table === 'synonyms'
        ? 'lexical_synonyms'
        : 'gutenberg_lexicon';
      
      const updates: any = {
        validation_status: 'approved',
        reviewed_at: new Date().toISOString(),
      };
      
      if (config.table === 'dialectal' || config.table === 'synonyms') {
        updates.validado_humanamente = true;
      } else {
        updates.validado = true;
      }
      
      await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id);
      
      toast.success('Verbete aprovado com sucesso');
      refetch();
      refetchStats();
    } catch (error: any) {
      toast.error(`Erro ao aprovar: ${error.message}`);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const tableName = config.table === 'dialectal' 
        ? 'dialectal_lexicon' 
        : config.table === 'synonyms'
        ? 'lexical_synonyms'
        : 'gutenberg_lexicon';
      
      const updates: any = {
        validation_status: 'rejected',
        reviewed_at: new Date().toISOString(),
        validation_notes: 'Rejeitado durante revisão manual'
      };
      
      if (config.table === 'dialectal' || config.table === 'synonyms') {
        updates.validado_humanamente = false;
      } else {
        updates.validado = false;
      }
      
      await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id);
      
      toast.success('Verbete rejeitado');
      refetch();
      refetchStats();
    } catch (error: any) {
      toast.error(`Erro ao rejeitar: ${error.message}`);
    }
  };

  const selectedIndex = selectedEntryId 
    ? paginatedEntries.findIndex((e: any) => e.id === selectedEntryId)
    : -1;

  useValidationShortcuts({
    enabled: !validationOpen,
    onApprove: selectedEntryId ? () => handleApprove(selectedEntryId) : undefined,
    onReject: selectedEntryId ? () => handleReject(selectedEntryId) : undefined,
    onEdit: selectedEntryId 
      ? () => handleValidate(paginatedEntries.find((e: any) => e.id === selectedEntryId))
      : undefined,
    onNext: () => {
      if (selectedIndex < paginatedEntries.length - 1) {
        setSelectedEntryId(paginatedEntries[selectedIndex + 1].id);
      } else if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
        setSelectedEntryId(null);
      }
    },
    onPrevious: () => {
      if (selectedIndex > 0) {
        setSelectedEntryId(paginatedEntries[selectedIndex - 1].id);
      } else if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
        setSelectedEntryId(null);
      }
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MVPHeader />
      
      <div className="container mx-auto py-8 px-4">
        <AdminBreadcrumb currentPage={`Validação ${config.displayName}`} />

        <div className="flex justify-between items-center my-6">
          <h1 className="text-3xl font-bold">
            Validação: {config.displayName}
          </h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShortcuts(true)}
            >
              <Keyboard className="h-4 w-4 mr-2" />
              Atalhos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleForceRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Cache
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Badge de Status de Atualização */}
          {(isLoading || queryClient.isFetching({ queryKey: ['backend-lexicon'] }) > 0) && (
            <div className="fixed bottom-4 right-4 z-50">
              <Badge 
                variant="outline" 
                className="gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-primary/50 shadow-lg animate-pulse"
              >
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="font-medium">Atualizando dados...</span>
              </Badge>
            </div>
          )}

          {/* Painel de Validação em Tempo Real */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card de Validados */}
            <Card className="relative overflow-hidden border-2 border-green-500/20 bg-gradient-to-br from-green-500/10 via-background to-background">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent" />
              <CardContent className="relative pt-6 pb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-green-500/20 ring-2 ring-green-500/30">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Validados</p>
                      <p className="text-xs text-muted-foreground/70">Status: Aprovados</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                    {validationRate}%
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold tracking-tight text-green-600">
                      {validatedCount.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-lg text-muted-foreground">
                      / {allEntries.length.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <Progress value={parseFloat(validationRate)} className="h-2 bg-green-500/20" />
                </div>
              </CardContent>
            </Card>

            {/* Card de Pendentes */}
            <Card className="relative overflow-hidden border-2 border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 via-background to-background">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent" />
              <CardContent className="relative pt-6 pb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-yellow-500/20 ring-2 ring-yellow-500/30">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                      <p className="text-xs text-muted-foreground/70">Aguardando revisão</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30">
                    {(100 - parseFloat(validationRate)).toFixed(2)}%
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold tracking-tight text-yellow-600">
                      {pendingCount.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-lg text-muted-foreground">
                      restantes
                    </span>
                  </div>
                  <Progress value={100 - parseFloat(validationRate)} className="h-2 bg-yellow-500/20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Validação em Lote Destacada */}
          {tipo && pendingHighConfidenceCount > 0 && (
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Zap className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Validação Automática em Lote</CardTitle>
                      <CardDescription>
                        Valide automaticamente verbetes com alta confiança (≥90%)
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {pendingHighConfidenceCount} elegíveis
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    <strong>{pendingHighConfidenceCount} verbetes</strong> atendem aos critérios de validação automática.
                    Isso representará <strong>{((pendingHighConfidenceCount / pendingCount) * 100).toFixed(0)}%</strong> dos verbetes pendentes.
                  </AlertDescription>
                </Alert>
                
                <BatchValidationDialog 
                  batchSize={pendingHighConfidenceCount} 
                  dictionaryType={config.edgeFunctionType}
                  onSuccess={handleValidationSuccess}
                  trigger={
                    <Button size="lg" className="w-full gap-2">
                      <Zap className="h-5 w-5" />
                      Validar Todos Elegíveis ({pendingHighConfidenceCount})
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          )}

          {/* Card de Limpeza */}
          <ClearDictionariesCard 
            stats={lexiconStats}
            onSuccess={() => {
              refetchStats();
              refetch();
            }}
          />

          {/* 🔧 Ferramentas de Desenvolvimento - Collapsible (apenas Gutenberg) */}
          {config.table === 'gutenberg' && (
            <Collapsible 
              open={isDiagnosticsOpen} 
              onOpenChange={setIsDiagnosticsOpen}
            >
              <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-yellow-800 dark:text-yellow-200">
                        🔧 Ferramentas de Desenvolvimento
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">DEV TOOLS</Badge>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        {isDiagnosticsOpen ? 'Ocultar' : 'Mostrar'}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CardDescription>
                    Ferramentas para diagnosticar problemas com dados do Gutenberg
                  </CardDescription>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        onClick={checkDatabaseState}
                        disabled={isCheckingDb}
                        variant="outline"
                        size="sm"
                      >
                        <Database className="h-4 w-4 mr-2" />
                        {isCheckingDb ? 'Verificando...' : 'Verificar Banco'}
                      </Button>
                      <Button
                        onClick={handleForceRefresh}
                        variant="outline"
                        size="sm"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Forçar Atualização
                      </Button>
                    </div>

                    {/* ⚠️ Alerta de Dados Incompletos */}
                    {allEntries.length > 0 && !allEntries[0].classe_gramatical && !allEntries[0].definicoes && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>⚠️ Dados Incompletos Detectados</AlertTitle>
                        <AlertDescription>
                          Os verbetes estão sem classe_gramatical e definições. Clique em "Verificar Banco" 
                          para diagnóstico ou "Forçar Atualização" para limpar o cache.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* 📊 Diagnóstico do Banco (se disponível) */}
                    {dbDiagnostics && (
                      <Alert>
                        <Database className="h-4 w-4" />
                        <AlertTitle>📊 Resultado do Diagnóstico</AlertTitle>
                        <AlertDescription>
                          <div className="text-sm space-y-1 mt-2">
                            <div>📊 Total de registros: <strong>{dbDiagnostics.totalRecords}</strong></div>
                            <div>📝 Tem classe_gramatical: <strong>{dbDiagnostics.hasClasseGramatical ? '✅ Sim' : '❌ Não'}</strong></div>
                            <div>📚 Tem definições: <strong>{dbDiagnostics.hasDefinicoes ? '✅ Sim' : '❌ Não'}</strong></div>
                            <div className="text-xs text-muted-foreground mt-2">
                              Última verificação: {new Date(dbDiagnostics.timestamp).toLocaleString('pt-BR')}
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros de Busca</CardTitle>
              <CardDescription>Refine a lista de verbetes para validação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Classe Gramatical</label>
                  <Select value={posFilter} onValueChange={setPosFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="s.m.">s.m.</SelectItem>
                      <SelectItem value="s.f.">s.f.</SelectItem>
                      <SelectItem value="fraseol.">fraseol.</SelectItem>
                      <SelectItem value="v.t.d.">v.t.d.</SelectItem>
                      <SelectItem value="adj.">adj.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status Validação</label>
                  <Select value={validationFilter} onValueChange={setValidationFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="validated">Validados</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar Verbete</label>
                  <Input
                    placeholder="Digite para buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Atalhos de Teclado */}
              <Alert>
                <Keyboard className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Atalhos:</strong> A = Aprovar | R = Rejeitar | E = Editar | ↑↓ = Navegar
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Grade de Cards de Verbetes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Verbetes para Validação</CardTitle>
                  <CardDescription>
                    {filteredEntries.length} verbete(s) encontrado(s) | Página {currentPage} de {totalPages}
                  </CardDescription>
                </div>
                {totalPages > 1 && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filteredEntries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Nenhum verbete encontrado com os filtros selecionados.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedEntries.map((entry: any) => (
                    <div
                      key={entry.id}
                      onClick={() => setSelectedEntryId(entry.id)}
                    >
                      <VerbeteCard
                        entry={entry as LexiconEntry}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onEdit={handleValidate}
                        isSelected={selectedEntryId === entry.id}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Validação */}
      {selectedEntry && (
        <ValidationInterface
          entry={selectedEntry}
          open={validationOpen}
          onOpenChange={setValidationOpen}
          onSuccess={handleValidationSuccess}
        />
      )}

      {/* Modal de Atalhos de Teclado */}
      <KeyboardShortcutsHelper 
        open={showShortcuts} 
        onOpenChange={setShowShortcuts} 
      />

      <MVPFooter />
    </div>
  );
}
