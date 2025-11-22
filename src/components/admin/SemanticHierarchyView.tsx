import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { EditTagsetDialog } from '@/components/admin/EditTagsetDialog';

interface SemanticTagset {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  categoria_pai: string | null;
  nivel_profundidade: number | null;
  status: string;
}

interface HierarchyNode {
  tagset: SemanticTagset;
  children: HierarchyNode[];
  level: number;
}

const buildHierarchy = (tagsets: SemanticTagset[]): HierarchyNode[] => {
  const rootNodes = tagsets.filter(t => t.nivel_profundidade === 1 && !t.categoria_pai);
  
  const attachChildren = (parent: HierarchyNode): void => {
    parent.children = tagsets
      .filter(t => t.categoria_pai === parent.tagset.codigo)
      .map(child => ({
        tagset: child,
        children: [],
        level: child.nivel_profundidade || 1
      }));
    
    parent.children.forEach(attachChildren);
  };
  
  const hierarchy = rootNodes.map(t => ({
    tagset: t,
    children: [],
    level: 1
  }));
  
  hierarchy.forEach(attachChildren);
  return hierarchy;
};

interface HierarchyLevelProps {
  nodes: HierarchyNode[];
  level: number;
  onEdit: (tagset: SemanticTagset) => void;
}

function HierarchyLevel({ nodes, level, onEdit }: HierarchyLevelProps) {
  const paddingClass = level === 2 ? 'pl-8' : level === 3 ? 'pl-12' : 'pl-16';
  
  return (
    <div className={`space-y-2 ${paddingClass}`}>
      {nodes.map(node => (
        <div key={node.tagset.codigo}>
          {node.children.length > 0 ? (
            <Collapsible>
              <div className="flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex-1 justify-start gap-2 h-auto py-2"
                  >
                    <ChevronDown className="h-3 w-3 shrink-0" />
                    <Badge variant="outline" className="text-xs shrink-0">
                      {node.tagset.codigo}
                    </Badge>
                    <span className="font-medium text-left flex-1">{node.tagset.nome}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {node.children.length}
                    </Badge>
                  </Button>
                </CollapsibleTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(node.tagset);
                  }}
                  className="h-8 w-8 shrink-0"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
              <CollapsibleContent>
                <HierarchyLevel nodes={node.children} level={level + 1} onEdit={onEdit} />
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <div className="flex items-center gap-2 py-2 px-3 rounded hover:bg-muted/50">
              <Badge variant="outline" className="text-xs">
                {node.tagset.codigo}
              </Badge>
              <span className="text-sm flex-1">{node.tagset.nome}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(node.tagset)}
                className="h-7 w-7 shrink-0"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function SemanticHierarchyView() {
  const [tagsets, setTagsets] = useState<SemanticTagset[]>([]);
  const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTagset, setEditingTagset] = useState<SemanticTagset | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchActiveTagsets();
  }, []);

  const fetchActiveTagsets = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('semantic_tagset')
        .select('*')
        .eq('status', 'ativo')
        .order('codigo');

      if (error) throw error;

      setTagsets(data || []);
      setHierarchy(buildHierarchy(data || []));
    } catch (error: any) {
      toast.error('Erro ao carregar hierarquia', {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (tagset: SemanticTagset) => {
    setEditingTagset(tagset);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditingTagset(null);
    setIsEditDialogOpen(false);
    fetchActiveTagsets(); // Recarregar hierarquia após edição
  };

  const nivel1Count = tagsets.filter(t => t.nivel_profundidade === 1).length;
  const nivel2Count = tagsets.filter(t => t.nivel_profundidade === 2).length;
  const nivel3Count = tagsets.filter(t => t.nivel_profundidade === 3).length;
  const nivel4Count = tagsets.filter(t => t.nivel_profundidade === 4).length;

  const availableParents = tagsets
    .filter(t => t.nivel_profundidade !== null && t.nivel_profundidade < 4)
    .map(t => ({
      codigo: t.codigo,
      nome: t.nome
    }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Taxonomia Aprovada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{nivel1Count}</div>
              <div className="text-xs text-muted-foreground">Nível 1</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{nivel2Count}</div>
              <div className="text-xs text-muted-foreground">Nível 2</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{nivel3Count}</div>
              <div className="text-xs text-muted-foreground">Nível 3</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{nivel4Count}</div>
              <div className="text-xs text-muted-foreground">Nível 4</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {hierarchy.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum domínio semântico aprovado ainda
            </CardContent>
          </Card>
        ) : (
          hierarchy.map(node => (
            <Card key={node.tagset.codigo}>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between h-auto py-4 px-6 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="default" className="text-sm">
                        {node.tagset.codigo}
                      </Badge>
                      <div className="text-left flex-1">
                        <div className="text-lg font-semibold">
                          {node.tagset.nome}
                        </div>
                        {node.tagset.descricao && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {node.tagset.descricao}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(node.tagset);
                        }}
                        className="shrink-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      {node.children.length > 0 && (
                        <Badge variant="secondary">
                          {node.children.length} subcategoria{node.children.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </Button>
                </CollapsibleTrigger>
                
                {node.children.length > 0 && (
                  <CollapsibleContent className="px-6 pb-4 pt-2">
                    <HierarchyLevel nodes={node.children} level={2} onEdit={handleEditClick} />
                  </CollapsibleContent>
                )}
              </Collapsible>
            </Card>
          ))
        )}
      </div>

      <EditTagsetDialog
        isOpen={isEditDialogOpen}
        onClose={handleCloseEditDialog}
        tagset={editingTagset ? {
          id: editingTagset.id,
          codigo: editingTagset.codigo,
          nome: editingTagset.nome,
          descricao: editingTagset.descricao,
          exemplos: (editingTagset as any).exemplos || null,
          nivel_profundidade: editingTagset.nivel_profundidade,
          categoria_pai: editingTagset.categoria_pai,
        } : null}
        availableParents={availableParents}
      />
    </div>
  );
}
