import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTagsets, Tagset } from '@/hooks/useTagsets';
import { TagsetHierarchyTree } from './TagsetHierarchyTree';
import { TagsetEditor } from './TagsetEditor';
import { TagsetCreator } from './TagsetCreator';
import { RefreshCw, CheckSquare, Square, ListChecks, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export function TagsetManager() {
  const { tagsets, stats, isLoading, refetch, approveTagsets, rejectTagsets, updateTagset, proposeTagset } = useTagsets();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingTagset, setEditingTagset] = useState<Tagset | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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

  const pendingCount = tagsets.filter(t => t.status !== 'ativo' && !t.aprovado_por).length;

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
          {/* Barra de ações */}
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

          {/* Árvore de tagsets */}
          {tagsets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum tagset encontrado.
            </div>
          ) : (
            <TagsetHierarchyTree
              tagsets={tagsets}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onApprove={handleApproveOne}
              onReject={handleRejectOne}
              onEdit={handleEdit}
            />
          )}
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
