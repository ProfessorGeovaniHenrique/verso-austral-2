import { useState } from 'react';
import { MVPHeader } from '@/components/mvp/MVPHeader';
import { MVPFooter } from '@/components/mvp/MVPFooter';
import { AdminBreadcrumb } from '@/components/AdminBreadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, Clock, AlertCircle, Zap, Keyboard } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDialectalLexicon } from '@/hooks/useDialectalLexicon';
import { ValidationInterface } from '@/components/advanced/ValidationInterface';
import { BatchValidationDialog } from '@/components/advanced/lexicon-status/BatchValidationDialog';
import { KeyboardShortcutsHelper } from '@/components/validation/KeyboardShortcutsHelper';
import { VerbeteCard } from '@/components/validation/VerbeteCard';
import { useValidationShortcuts } from '@/hooks/useValidationShortcuts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { LexiconEntry } from '@/hooks/useBackendLexicon';

export default function AdminGauchoValidation() {
  const [posFilter, setPosFilter] = useState<string>('all');
  const [validationFilter, setValidationFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [validationOpen, setValidationOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const ITEMS_PER_PAGE = 24;

  // Buscar dados do dicionário Gaúcho
  const { entries: dialectalEntries, isLoading, refetch } = useDialectalLexicon({
    tipo_dicionario: 'dialectal_I',
    searchTerm: searchTerm || undefined,
  });

  const allEntries = dialectalEntries;

  // Filtros
  const filteredEntries = allEntries.filter((entry: any) => {
    if (posFilter !== 'all' && entry.classe_gramatical !== posFilter) return false;
    if (validationFilter === 'validated' && (!entry.validation_status || entry.validation_status === 'pending')) return false;
    if (validationFilter === 'pending' && (entry.validation_status && entry.validation_status !== 'pending')) return false;
    return true;
  });

  // Stats
  const validatedCount = allEntries.filter((e: any) => 
    e.validation_status && e.validation_status !== 'pending'
  ).length;
  const pendingCount = allEntries.filter((e: any) => 
    !e.validation_status || e.validation_status === 'pending'
  ).length;
  const validationRate = allEntries.length > 0 
    ? ((validatedCount / allEntries.length) * 100).toFixed(2) 
    : '0.00';

  const pendingHighConfidenceCount = allEntries.filter((e: any) => 
    (!e.validation_status || e.validation_status === 'pending') &&
    (e.confianca_extracao || 0) >= 0.9
  ).length;

  // Paginação
  const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Handlers
  const handleValidate = (entry: any) => {
    const adaptedEntry = {
      id: entry.id,
      palavra: entry.verbete || entry.palavra,
      lema: entry.verbete_normalizado || entry.lema,
      pos: entry.classe_gramatical || entry.pos || 'unknown',
      confianca: entry.confianca_extracao || entry.confianca || 0,
      validado: entry.validado_humanamente || entry.validado,
      tagset_codigo: entry.tagset_codigo || 'UNKNOWN',
      prosody: entry.prosody || 0,
      contexto_exemplo: entry.contextos_culturais?.exemplo || '',
    };
    setSelectedEntry(adaptedEntry);
    setValidationOpen(true);
  };

  const handleValidationSuccess = () => {
    refetch();
    setValidationOpen(false);
    setSelectedEntry(null);
  };

  const handleApprove = async (id: string) => {
    try {
      await supabase
        .from('dialectal_lexicon')
        .update({
          validation_status: 'approved',
          validado_humanamente: true,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);
      
      toast.success('Verbete aprovado com sucesso');
      refetch();
    } catch (error: any) {
      toast.error(`Erro ao aprovar: ${error.message}`);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await supabase
        .from('dialectal_lexicon')
        .update({
          validation_status: 'rejected',
          validado_humanamente: false,
          reviewed_at: new Date().toISOString(),
          validation_notes: 'Rejeitado durante revisão manual'
        })
        .eq('id', id);
      
      toast.success('Verbete rejeitado');
      refetch();
    } catch (error: any) {
      toast.error(`Erro ao rejeitar: ${error.message}`);
    }
  };

  // Atalhos de teclado
  const selectedIndex = selectedEntryId 
    ? paginatedEntries.findIndex((e) => e.id === selectedEntryId)
    : -1;

  useValidationShortcuts({
    enabled: !validationOpen,
    onApprove: selectedEntryId ? () => handleApprove(selectedEntryId) : undefined,
    onReject: selectedEntryId ? () => handleReject(selectedEntryId) : undefined,
    onEdit: selectedEntryId 
      ? () => handleValidate(paginatedEntries.find((e) => e.id === selectedEntryId))
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
        <AdminBreadcrumb currentPage="Validação Dicionário Gaúcho" />

        <div className="flex justify-between items-center my-6">
          <h1 className="text-3xl font-bold">
            🐎 Dicionário Gaúcho Unificado
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
          </div>
        </div>

        <div className="space-y-6">
          {/* Cards de Progresso */}
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

          {/* Validação em Lote */}
          {pendingHighConfidenceCount > 0 && (
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
              <CardContent>
                <BatchValidationDialog 
                  batchSize={pendingHighConfidenceCount} 
                  dictionaryType="dialectal"
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
