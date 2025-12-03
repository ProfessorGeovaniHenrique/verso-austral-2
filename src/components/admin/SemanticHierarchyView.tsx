import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { EditTagsetDialog } from '@/components/admin/EditTagsetDialog';
import { SemanticConsultantChat } from '@/components/admin/SemanticConsultantChat';

interface SemanticTagset {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  categoria_pai: string | null;
  nivel_profundidade: number | null;
  status: string;
  exemplos?: string[] | null;
  hierarquia_completa?: string | null;
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

  // ========== EXPORT FUNCTIONS ==========
  const exportToCSV = () => {
    const csvData = [
      ['Código', 'Nome', 'Descrição', 'Nível', 'Hierarquia Completa', 'Categoria Pai', 'Exemplos'],
      ...tagsets.map(t => [
        t.codigo,
        t.nome,
        t.descricao || '',
        t.nivel_profundidade?.toString() || '',
        t.hierarquia_completa || t.codigo,
        t.categoria_pai || '',
        t.exemplos?.join('; ') || ''
      ])
    ];

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dominios-semanticos-hierarquia-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    toast.success(`${tagsets.length} domínios exportados em CSV`);
  };

  const exportToExcel = () => {
    const data = tagsets.map(t => ({
      'Código': t.codigo,
      'Nome': t.nome,
      'Descrição': t.descricao || '',
      'Nível': t.nivel_profundidade || '',
      'Hierarquia Completa': t.hierarquia_completa || t.codigo,
      'Categoria Pai': t.categoria_pai || '',
      'Exemplos': t.exemplos?.join('; ') || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Domínios Semânticos');
    
    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 12 },  // Código
      { wch: 35 },  // Nome
      { wch: 60 },  // Descrição
      { wch: 8 },   // Nível
      { wch: 25 },  // Hierarquia Completa
      { wch: 12 },  // Categoria Pai
      { wch: 40 },  // Exemplos
    ];

    XLSX.writeFile(wb, `dominios-semanticos-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success(`${tagsets.length} domínios exportados em Excel`);
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Taxonomia Aprovada</CardTitle>
            
            {/* Dropdown de Exportação */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV}>
                  <FileText className="h-4 w-4 mr-2" />
                  CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel (.xlsx)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
          exemplos: editingTagset.exemplos || null,
          nivel_profundidade: editingTagset.nivel_profundidade,
          categoria_pai: editingTagset.categoria_pai,
        } : null}
        availableParents={availableParents}
      />
      
      {/* ✨ Consultor Semântico IA - Floating Chat */}
      <SemanticConsultantChat totalDomains={tagsets.filter(t => t.status === 'ativo').length} />
    </div>
  );
}
