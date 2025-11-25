import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTagsets, Tagset, TagsetStatus } from '@/hooks/useTagsets';
import { TagsetHierarchyTree } from './TagsetHierarchyTree';
import { TagsetEditor } from './TagsetEditor';
import { TagsetCreator } from './TagsetCreator';
import { HierarchySuggester } from './HierarchySuggester';
import { TagsetSearchFilters, SortOption, NivelFilter } from './TagsetSearchFilters';
import { RefreshCw, CheckSquare, Square, ListChecks, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Clock, BarChart3, Lightbulb } from 'lucide-react';

export function TagsetManager() {
  const { tagsets, stats, isLoading, refetch, approveTagsets, rejectTagsets, updateTagset, proposeTagset } = useTagsets();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingTagset, setEditingTagset] = useState<Tagset | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Estados de busca e filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('nome');
  const [nivelFilter, setNivelFilter] = useState<NivelFilter>('todos');

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === tagsets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tagsets.map(t => t.id));
    }
  };

  const handleSelectPending = () => {
    const pendingIds = tagsets
      .filter(t => t.status !== 'ativo' && !t.aprovado_por)
      .map(t => t.id);
    setSelectedIds(pendingIds);
  };

  const handleApproveSelected = async () => {
    if (selectedIds.length === 0) {
      toast.error('Nenhum tagset selecionado');
      return;
    }

    setIsProcessing(true);
    try {
      await approveTagsets(selectedIds);
      setSelectedIds([]);
      await refetch();
      toast.success(`${selectedIds.length} tagset(s) aprovados com sucesso`);
    } catch (err) {
      console.error('Erro ao aprovar:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectSelected = async () => {
    if (selectedIds.length === 0) {
      toast.error('Nenhum tagset selecionado');
      return;
    }

    setIsProcessing(true);
    try {
      await rejectTagsets(selectedIds);
      setSelectedIds([]);
      await refetch();
      toast.success(`${selectedIds.length} tagset(s) rejeitados`);
    } catch (err) {
      console.error('Erro ao rejeitar:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveOne = async (id: string) => {
    setIsProcessing(true);
    try {
      await approveTagsets([id]);
      await refetch();
      toast.success('Tagset aprovado');
    } catch (err) {
      console.error('Erro ao aprovar:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectOne = async (id: string) => {
    setIsProcessing(true);
    try {
      await rejectTagsets([id]);
      await refetch();
      toast.success('Tagset rejeitado');
    } catch (err) {
      console.error('Erro ao rejeitar:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (tagset: Tagset) => {
    setEditingTagset(tagset);
  };

  const handleSaveTagset = async (id: string, updates: Partial<Tagset>) => {
    await updateTagset(id, updates);
    await refetch();
    setEditingTagset(null);
  };

  const handleCreateTagset = async (newTagset: Partial<Tagset>) => {
    await proposeTagset(newTagset as any);
    await refetch();
    setIsCreating(false);
  };

  const handleAcceptSuggestion = async (tagsetId: string, tagsetPaiCodigo: string) => {
    setIsProcessing(true);
    try {
      await updateTagset(tagsetId, {
        tagset_pai: tagsetPaiCodigo,
        status: 'ativo'
      });
      await approveTagsets([tagsetId]);
      await refetch();
      toast.success("Sugestão aceita e tagset aprovado!");
    } catch (error) {
      console.error("Erro ao aceitar sugestão:", error);
      toast.error("Erro ao aceitar sugestão");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyFullEdit = async (tagsetId: string, updates: Partial<Tagset>) => {
    setIsProcessing(true);
    try {
      // Garantir sincronização entre tagset_pai e categoria_pai
      const syncedUpdates = {
        ...updates,
        categoria_pai: updates.tagset_pai || updates.categoria_pai,
        status: 'ativo' as TagsetStatus
      };
      
      await updateTagset(tagsetId, syncedUpdates);
      await approveTagsets([tagsetId]);
      await refetch();
      toast.success("Tagset editado e aprovado!");
    } catch (error) {
      console.error("Erro ao aplicar edição completa:", error);
      toast.error("Erro ao aplicar edição");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectTagsetFromSuggestion = async (tagsetId: string) => {
    setIsProcessing(true);
    try {
      await rejectTagsets([tagsetId]);
      await refetch();
      toast.info("Tagset rejeitado");
    } catch (error) {
      console.error("Erro ao rejeitar tagset:", error);
      toast.error("Erro ao rejeitar tagset");
    } finally {
      setIsProcessing(false);
    }
  };

  // Funções de filtro e ordenação
  const filterAndSortTagsets = useMemo(() => {
    let filtered = [...tagsets];

    // Aplicar busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.nome.toLowerCase().includes(query) || 
        t.codigo.toLowerCase().includes(query) ||
        t.descricao?.toLowerCase().includes(query)
      );
    }

    // Aplicar filtro de nível
    if (nivelFilter !== 'todos') {
      const nivel = parseInt(nivelFilter);
      filtered = filtered.filter(t => t.nivel_profundidade === nivel);
    }

    // Aplicar ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'nome':
          return a.nome.localeCompare(b.nome);
        case 'codigo':
          return a.codigo.localeCompare(b.codigo);
        case 'data-criacao':
          return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
        case 'validacoes':
          return (b.validacoes_humanas || 0) - (a.validacoes_humanas || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [tagsets, searchQuery, nivelFilter, sortBy]);

  const pendingCount = tagsets.filter(t => t.status !== TagsetStatus.ATIVO && !t.aprovado_por).length;
  const tagsetsAtivos = filterAndSortTagsets.filter(t => t.status === TagsetStatus.ATIVO);
  const tagsetsPendentes = filterAndSortTagsets.filter(t => t.status === TagsetStatus.PROPOSTO);
  const tagsetsRejeitados = filterAndSortTagsets.filter(t => t.status === TagsetStatus.REJEITADO);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Taxonomia Semântica</CardTitle>
              <CardDescription>
                {stats.totalTagsets} categorias | {stats.activeTagsets} ativas | {stats.approvedTagsets} aprovadas
                {pendingCount > 0 && ` | ${pendingCount} pendentes`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsCreating(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Novo DS Geral (Nível 1)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Busca e Filtros */}
          <TagsetSearchFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            nivelFilter={nivelFilter}
            onNivelChange={setNivelFilter}
            resultCount={filterAndSortTagsets.length}
          />

          <Tabs defaultValue="ativos" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="ativos" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Ativos
                <Badge variant="secondary">{tagsetsAtivos.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="pendentes" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Propostos
                <Badge variant="secondary">{tagsetsPendentes.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="sugestoes" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Sugestões
                <Badge variant="secondary">{tagsetsPendentes.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="rejeitados" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Rejeitados
                <Badge variant="secondary">{tagsetsRejeitados.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* Tab Ativos */}
            <TabsContent value="ativos" className="space-y-4">
              {tagsets.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="gap-2"
                  >
                    {selectedIds.length === tagsets.length ? (
                      <>
                        <Square className="w-4 h-4" />
                        Desmarcar Todos
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-4 h-4" />
                        Selecionar Todos
                      </>
                    )}
                  </Button>

                  {pendingCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectPending}
                      className="gap-2"
                    >
                      <ListChecks className="w-4 h-4" />
                      Selecionar Pendentes ({pendingCount})
                    </Button>
                  )}

                  <div className="flex-1" />

                  {selectedIds.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {selectedIds.length} selecionado{selectedIds.length !== 1 ? 's' : ''}
                      </span>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleApproveSelected}
                        disabled={isProcessing}
                      >
                        Aprovar Selecionados
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleRejectSelected}
                        disabled={isProcessing}
                      >
                        Rejeitar Selecionados
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {tagsetsAtivos.length === 0 ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Nenhum tagset ativo encontrado.
                  </AlertDescription>
                </Alert>
              ) : (
                <TagsetHierarchyTree
                  tagsets={tagsetsAtivos}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onApprove={handleApproveOne}
                  onReject={handleRejectOne}
                  onEdit={handleEdit}
                />
              )}
            </TabsContent>

            {/* Tab Pendentes */}
            <TabsContent value="pendentes" className="space-y-4">
              {tagsetsPendentes.length === 0 ? (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Nenhum tagset proposto aguardando aprovação.
                  </AlertDescription>
                </Alert>
              ) : (
                <TagsetHierarchyTree
                  tagsets={tagsetsPendentes}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onApprove={handleApproveOne}
                  onReject={handleRejectOne}
                  onEdit={handleEdit}
                />
              )}
            </TabsContent>

            {/* Tab Sugestões */}
            <TabsContent value="sugestoes" className="space-y-4">
              <HierarchySuggester
                tagsetsPendentes={tagsetsPendentes}
                tagsetsAtivos={tagsetsAtivos}
                onAcceptSuggestion={handleAcceptSuggestion}
                onRejectTagset={handleRejectTagsetFromSuggestion}
                onEditManual={handleEdit}
                onApplyFullEdit={handleApplyFullEdit}
              />
            </TabsContent>

            {/* Tab Rejeitados */}
            <TabsContent value="rejeitados" className="space-y-4">
              {tagsetsRejeitados.length === 0 ? (
                <Alert>
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nenhum tagset foi rejeitado ainda.
                  </AlertDescription>
                </Alert>
              ) : (
                <TagsetHierarchyTree
                  tagsets={tagsetsRejeitados}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onApprove={handleApproveOne}
                  onReject={handleRejectOne}
                  onEdit={handleEdit}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      {editingTagset && (
        <TagsetEditor
          tagset={editingTagset}
          allTagsets={tagsets}
          onSave={handleSaveTagset}
          onClose={() => setEditingTagset(null)}
        />
      )}

      {/* Modal de Criação */}
      {isCreating && (
        <TagsetCreator
          allTagsets={tagsets}
          onSave={handleCreateTagset}
          onClose={() => setIsCreating(false)}
          defaultLevel={1}
        />
      )}
    </>
  );
}
