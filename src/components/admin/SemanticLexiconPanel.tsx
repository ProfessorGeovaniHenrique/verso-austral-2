import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Database, AlertTriangle, CheckCircle, Award, Loader2, Sparkles, Zap, CheckCheck } from 'lucide-react';
import { useSemanticLexiconData, SemanticLexiconEntry } from '@/hooks/useSemanticLexiconData';
import { SemanticLexiconFilters } from './SemanticLexiconFilters';
import { SemanticWordRow } from './SemanticWordRow';
import { SemanticValidationModal } from './SemanticValidationModal';
import { useReclassifyMG } from '@/hooks/useReclassifyMG';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function SemanticLexiconPanel() {
  const {
    entries,
    totalCount,
    stats,
    filters,
    page,
    totalPages,
    isLoading,
    updateFilter,
    toggleFlag,
    resetFilters,
    setPage,
    refetch,
  } = useSemanticLexiconData(50);

  const [selectedEntry, setSelectedEntry] = useState<SemanticLexiconEntry | null>(null);
  const [validationOpen, setValidationOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini' | 'gpt5'>('gemini');
  const [selectedBatchType, setSelectedBatchType] = useState<'MG' | 'DS'>('MG');
  const [isBulkValidating, setIsBulkValidating] = useState(false);

  const { reclassifyBatch, isProcessing, progress } = useReclassifyMG();

  // Find MG N1 only entries for batch processing
  const mgN1Entries = useMemo(() => 
    entries.filter(e => e.tagset_codigo === 'MG' && (e.fonte === 'rule_based' || !e.tagset_n2)),
    [entries]
  );

  // Find other DS N1 only entries (not MG, not NC)
  const dsN1Entries = useMemo(() => 
    entries.filter(e => 
      !e.tagset_codigo.includes('.') && // N1 only (no dots)
      e.tagset_codigo !== 'MG' && 
      e.tagset_codigo !== 'NC' &&
      !e.tagset_n2 // No N2 classification
    ),
    [entries]
  );

  const handleValidate = (entry: SemanticLexiconEntry) => {
    setSelectedEntry(entry);
    setValidationOpen(true);
  };

  const handleValidationSuccess = () => {
    refetch();
  };

  const handleOpenBatchDialog = (type: 'MG' | 'DS') => {
    setSelectedBatchType(type);
    setBatchDialogOpen(true);
  };

  const handleBatchRefine = async () => {
    setBatchDialogOpen(false);
    const entriesToProcess = selectedBatchType === 'MG' ? mgN1Entries : dsN1Entries;
    await reclassifyBatch(entriesToProcess, {
      model: selectedModel,
      onSuccess: refetch,
    });
  };

  // Validar todas as entradas da página atual (marcar como human_validated)
  const handleBulkValidate = async () => {
    if (entries.length === 0) return;
    
    setIsBulkValidating(true);
    try {
      const ids = entries.map(e => e.id);
      
      const { error } = await supabase
        .from('semantic_disambiguation_cache')
        .update({ 
          fonte: 'manual',
          confianca: 1.0
        })
        .in('id', ids);
      
      if (error) throw error;
      
      toast.success(`✅ ${entries.length} palavras validadas com sucesso`);
      refetch();
    } catch (error) {
      console.error('Erro ao validar em lote:', error);
      toast.error('Erro ao validar palavras em lote');
    } finally {
      setIsBulkValidating(false);
    }
  };

  const progressPercent = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  const batchEntries = selectedBatchType === 'MG' ? mgN1Entries : dsN1Entries;
  const batchTitle = selectedBatchType === 'MG' ? 'Marcadores Gramaticais' : 'Domínios Semânticos';

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Anotado</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total.toLocaleString() || '-'}</div>
            <p className="text-xs text-muted-foreground">palavras classificadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Baixa Confiança</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats?.lowConfidence.toLocaleString() || '-'}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.total ? ((stats.lowConfidence / stats.total) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precisa Revisão</CardTitle>
            <CheckCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.needsReview.toLocaleString() || '-'}</div>
            <p className="text-xs text-muted-foreground">conf. &lt; 80% + fonte auto</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MG apenas N1</CardTitle>
            <Sparkles className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.mgOnlyN1?.toLocaleString() || '-'}</div>
            <p className="text-xs text-muted-foreground">precisam refinamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outros DS N1</CardTitle>
            <Award className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{dsN1Entries.length.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">precisam refinamento</p>
          </CardContent>
        </Card>
      </div>

      {/* Batch Processing Progress */}
      {isProcessing && (
        <Card className="border-blue-500/50 bg-blue-500/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>Refinando palavras {selectedBatchType} com {selectedModel === 'gpt5' ? 'GPT-5' : 'Gemini'}...</span>
                  <span>{progress.current}/{progress.total} ({progressPercent}%)</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Filtros</CardTitle>
          <div className="flex gap-2">
            {mgN1Entries.length > 0 && !isProcessing && (
              <Button
                variant="outline"
                size="sm"
                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border-blue-500/30"
                onClick={() => handleOpenBatchDialog('MG')}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Refinar MG em Lote ({mgN1Entries.length})
              </Button>
            )}
            {dsN1Entries.length > 0 && !isProcessing && (
              <Button
                variant="outline"
                size="sm"
                className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 border-purple-500/30"
                onClick={() => handleOpenBatchDialog('DS')}
              >
                <Award className="h-4 w-4 mr-2" />
                Refinar DS em Lote ({dsN1Entries.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <SemanticLexiconFilters
            filters={filters}
            stats={stats}
            onUpdateFilter={updateFilter}
            onToggleFlag={toggleFlag}
            onReset={resetFilters}
          />
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Léxico Semântico Anotado</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Mostrando {entries.length} de {totalCount.toLocaleString()} entradas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkValidate}
              disabled={isBulkValidating || entries.length === 0 || isLoading}
              className="bg-green-500/10 hover:bg-green-500/20 text-green-600 border-green-500/30"
            >
              {isBulkValidating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4 mr-2" />
              )}
              Validar Página ({entries.length})
            </Button>
            <Badge variant="outline">
              Página {page + 1} de {totalPages || 1}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma entrada encontrada com os filtros atuais
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Palavra</TableHead>
                      <TableHead>Tagset</TableHead>
                      <TableHead>Domínio N1</TableHead>
                      <TableHead>POS</TableHead>
                      <TableHead>Conf.</TableHead>
                      <TableHead>Fonte</TableHead>
                      <TableHead>Flags</TableHead>
                      <TableHead className="w-32">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <SemanticWordRow
                        key={entry.id}
                        entry={entry}
                        onValidate={handleValidate}
                        onRefresh={refetch}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  {totalCount.toLocaleString()} entradas no total
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <span className="text-sm px-2">
                    {page + 1} / {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Validation Modal */}
      <SemanticValidationModal
        entry={selectedEntry}
        open={validationOpen}
        onOpenChange={setValidationOpen}
        onSuccess={handleValidationSuccess}
      />

      {/* Batch Refine Confirmation Dialog */}
      <AlertDialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {selectedBatchType === 'MG' ? (
                <Sparkles className="h-5 w-5 text-blue-600" />
              ) : (
                <Award className="h-5 w-5 text-purple-600" />
              )}
              Refinar {batchTitle} em Lote
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Serão processadas <strong>{batchEntries.length}</strong> palavras {selectedBatchType === 'MG' ? 'MG' : 'de domínios semânticos'} classificadas 
                apenas no nível 1, refinando-as para níveis mais específicos (N2-N4).
              </p>
              <div className="flex gap-2 pt-2">
                <Button
                  variant={selectedModel === 'gemini' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedModel('gemini')}
                  className={selectedModel === 'gemini' ? 'bg-blue-600' : ''}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Gemini (rápido)
                </Button>
                <Button
                  variant={selectedModel === 'gpt5' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedModel('gpt5')}
                  className={selectedModel === 'gpt5' ? 'bg-purple-600' : ''}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  GPT-5 (preciso)
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Tempo estimado: ~{Math.ceil(batchEntries.length / 15)} minutos
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchRefine}>
              Iniciar Refinamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
