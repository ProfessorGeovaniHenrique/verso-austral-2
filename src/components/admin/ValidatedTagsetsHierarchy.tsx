import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, RefreshCw, List, TreePine, ChevronRight, ChevronDown, Edit, Undo2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ValidatedTagsetsList } from "./ValidatedTagsetsList";

interface SemanticTagset {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  status: string;
  nivel_profundidade: number | null;
  categoria_pai: string | null;
  exemplos: string[] | null;
  validacoes_humanas: number | null;
  aprovado_em: string | null;
  aprovado_por: string | null;
  hierarquia_completa: string | null;
  tagsets_filhos?: string[] | null;
  criado_em?: string | null;
  created_at?: string;
}

interface ValidatedTagsetsHierarchyProps {
  tagsets: SemanticTagset[];
  onEdit: (tagset: SemanticTagset) => void;
  onRevert: (tagset: SemanticTagset) => void;
  onRefresh: () => void;
  onCreateNew: () => void;
}

type ViewMode = "list" | "tree";

interface TagsetTreeNode extends SemanticTagset {
  children: TagsetTreeNode[];
}

export function ValidatedTagsetsHierarchy({ 
  tagsets, 
  onEdit, 
  onRevert, 
  onRefresh,
  onCreateNew
}: ValidatedTagsetsHierarchyProps) {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [searchTerm, setSearchTerm] = useState("");
  const [nivelFilter, setNivelFilter] = useState<string>("all");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const activeTagsets = useMemo(() => {
    return tagsets.filter(t => t.status === 'ativo');
  }, [tagsets]);

  const filteredTagsets = useMemo(() => {
    let filtered = [...activeTagsets];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.codigo.toLowerCase().includes(term) || 
        t.nome.toLowerCase().includes(term)
      );
    }

    if (nivelFilter !== "all") {
      const nivel = parseInt(nivelFilter);
      filtered = filtered.filter(t => t.nivel_profundidade === nivel);
    }

    return filtered;
  }, [activeTagsets, searchTerm, nivelFilter]);

  // Estatísticas por nível
  const levelStats = useMemo(() => {
    const stats = { 1: 0, 2: 0, 3: 0, 4: 0 };
    filteredTagsets.forEach(t => {
      if (t.nivel_profundidade && t.nivel_profundidade <= 4) {
        stats[t.nivel_profundidade as keyof typeof stats]++;
      }
    });
    return stats;
  }, [filteredTagsets]);

  // Construir árvore hierárquica
  const buildTree = (items: SemanticTagset[]): TagsetTreeNode[] => {
    const map = new Map<string, TagsetTreeNode>();
    const roots: TagsetTreeNode[] = [];

    items.forEach(item => {
      map.set(item.codigo, { ...item, children: [] });
    });

    items.forEach(item => {
      const node = map.get(item.codigo)!;
      if (item.categoria_pai) {
        const parent = map.get(item.categoria_pai);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const treeData = useMemo(() => buildTree(filteredTagsets), [filteredTagsets]);

  const toggleExpand = (codigo: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(codigo)) {
        next.delete(codigo);
      } else {
        next.add(codigo);
      }
      return next;
    });
  };

  const renderTreeNode = (node: TagsetTreeNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.codigo);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} className="my-1">
        <div
          className="flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded-md transition-colors"
          style={{ marginLeft: `${level * 20}px` }}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => toggleExpand(node.codigo)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="w-6" />
          )}

          <Badge variant="outline" className="font-mono text-xs">
            {node.codigo}
          </Badge>

          <Badge variant="secondary">
            N{node.nivel_profundidade}
          </Badge>

          <span className="font-medium flex-1">{node.nome}</span>

          {hasChildren && (
            <Badge variant="outline" className="text-xs">
              {node.children.length} {node.children.length === 1 ? 'filho' : 'filhos'}
            </Badge>
          )}

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(node)}
              title="Editar domínio"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRevert(node)}
              title="Desfazer validação"
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const exportToCSV = () => {
    const csvData = [
      ['Código', 'Nome', 'Descrição', 'Nível', 'Hierarquia Completa', 'Categoria Pai', 'Validações', 'Aprovado em'],
      ...filteredTagsets.map(t => [
        t.codigo,
        t.nome,
        t.descricao || '',
        t.nivel_profundidade?.toString() || '',
        t.hierarquia_completa || '',
        t.categoria_pai || '',
        t.validacoes_humanas?.toString() || '0',
        t.aprovado_em ? format(new Date(t.aprovado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : ''
      ])
    ];

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dominios-validados-hierarquia-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    
    toast({
      title: "CSV Exportado",
      description: `${filteredTagsets.length} domínios exportados com hierarquia completa.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Domínios Semânticos Validados</CardTitle>
            <CardDescription>
              {filteredTagsets.length} {filteredTagsets.length === 1 ? 'domínio aprovado' : 'domínios aprovados'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={onCreateNew} variant="default" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Criar Novo DS
            </Button>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Estatísticas por Nível */}
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(nivel => (
            <Card key={nivel}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Nível {nivel}</p>
                  <p className="text-2xl font-bold">{levelStats[nivel as keyof typeof levelStats]}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Controles */}
        <div className="flex flex-wrap items-center gap-4">
          <Input 
            placeholder="Buscar código ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          
          <Select value={nivelFilter} onValueChange={setNivelFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os níveis</SelectItem>
              <SelectItem value="1">Nível 1</SelectItem>
              <SelectItem value="2">Nível 2</SelectItem>
              <SelectItem value="3">Nível 3</SelectItem>
              <SelectItem value="4">Nível 4</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex gap-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4 mr-2" />
              Lista
            </Button>
            <Button
              variant={viewMode === "tree" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("tree")}
            >
              <TreePine className="h-4 w-4 mr-2" />
              Árvore
            </Button>
          </div>
        </div>

        {/* Visualização */}
        {viewMode === "tree" ? (
          <div className="border rounded-lg p-4 max-h-[600px] overflow-y-auto">
            {filteredTagsets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum domínio validado encontrado
              </div>
            ) : (
              <div className="space-y-1">
                {treeData.map(node => renderTreeNode(node))}
              </div>
            )}
          </div>
        ) : (
          <ValidatedTagsetsList
            tagsets={filteredTagsets}
            onEdit={onEdit}
            onRevert={onRevert}
            onRefresh={onRefresh}
          />
        )}
      </CardContent>
    </Card>
  );
}
