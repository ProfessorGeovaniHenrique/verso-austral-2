import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronRight, ChevronDown, Check, X, Info, Users, Edit } from 'lucide-react';
import { Tagset } from '@/hooks/useTagsets';

interface TagsetNode extends Tagset {
  children: TagsetNode[];
}

interface TagsetHierarchyTreeProps {
  tagsets: Tagset[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onEdit?: (tagset: Tagset) => void;
}

export function TagsetHierarchyTree({
  tagsets,
  selectedIds,
  onToggleSelect,
  onApprove,
  onReject,
  onEdit
}: TagsetHierarchyTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Construir árvore hierárquica
  const buildTree = (items: Tagset[]): TagsetNode[] => {
    const map = new Map<string, TagsetNode>();
    const roots: TagsetNode[] = [];

    // Criar nós
    items.forEach(item => {
      map.set(item.codigo, { ...item, children: [] });
    });

    // Construir hierarquia
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

    return roots.sort((a, b) => a.codigo.localeCompare(b.codigo));
  };

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

  const renderNode = (node: TagsetNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.codigo);
    const hasChildren = node.children.length > 0;
    const isSelected = selectedIds.includes(node.id);
    const needsApproval = node.status !== 'ativo' && !node.aprovado_por;
    
    // Cores por nível hierárquico
    const levelColors: Record<number, string> = {
      1: 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20',
      2: 'border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20',
      3: 'border-l-4 border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20',
      4: 'border-l-4 border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20'
    };
    
    const levelColor = levelColors[node.nivel_profundidade || 1] || levelColors[1];

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center gap-2 py-2 px-3 hover:bg-accent/50 rounded-md transition-colors ${levelColor} ${
            level > 0 ? 'ml-6' : ''
          }`}
        >
          {/* Expand/Collapse */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(node.codigo)}
              className="w-5 h-5 flex items-center justify-center hover:bg-accent rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          {/* Checkbox */}
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(node.id)}
          />

          {/* Código */}
          <Badge variant="outline" className="font-mono text-xs">
            {node.codigo}
          </Badge>
          
          {/* Badge de Nível */}
          <Badge variant="secondary" className="text-xs">
            N{node.nivel_profundidade || '?'}
          </Badge>
          
          {/* Badge de Filhos */}
          {hasChildren && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Users className="w-3 h-3" />
                    {node.children.length}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {node.children.length} {node.children.length === 1 ? 'filho' : 'filhos'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Nome com Tooltip de Hierarquia */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-semibold truncate">{node.nome}</span>
                  {node.hierarquia_completa && (
                    <Info className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-md">
                <div className="space-y-1">
                  {node.hierarquia_completa && (
                    <div className="text-xs font-medium">
                      Hierarquia: {node.hierarquia_completa}
                    </div>
                  )}
                  {node.tagset_pai && (
                    <div className="text-xs text-muted-foreground">
                      Pai: {node.tagset_pai}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Profundidade: Nível {node.nivel_profundidade || 'não definido'}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Status */}
          {node.status === 'ativo' && (
            <Badge className="bg-green-600 text-xs">Ativo</Badge>
          )}
          {needsApproval && (
            <Badge variant="secondary" className="text-xs">
              Pendente
            </Badge>
          )}
          {node.aprovado_por && (
            <Badge variant="outline" className="text-xs">
              ✓ Aprovado
            </Badge>
          )}

          {/* Ações rápidas */}
          <div className="flex gap-1">
            {/* Botão de edição */}
            {onEdit && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => onEdit(node)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Editar tagset</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Aprovação/Rejeição */}
            {needsApproval && onApprove && onReject && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => onApprove(node.id)}
                >
                  <Check className="w-4 h-4 text-green-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => onReject(node.id)}
                >
                  <X className="w-4 h-4 text-red-600" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Breadcrumb e Descrição (quando expandido) */}
        {isExpanded && (
          <div className="ml-14 mb-2 space-y-2">
            {/* Breadcrumb hierárquico */}
            {node.hierarquia_completa && (
              <div className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                {node.hierarquia_completa.split(' > ').map((part, i, arr) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className="font-medium text-foreground/70">{part}</span>
                    {i < arr.length - 1 && (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </span>
                ))}
              </div>
            )}
            
            {/* Descrição */}
            {node.descricao && (
              <p className="text-sm text-muted-foreground">{node.descricao}</p>
            )}
            
            {/* Exemplos */}
            {node.exemplos && node.exemplos.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs font-semibold text-muted-foreground">Exemplos:</span>
                {node.exemplos.map((ex, i) => (
                  <Badge key={i} variant="secondary" className="font-mono text-xs">
                    {ex}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Renderizar filhos */}
        {isExpanded && hasChildren && (
          <div className="ml-3 border-l-2 border-border/50">
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const tree = buildTree(tagsets);

  return (
    <div className="space-y-1">
      {tree.map(node => renderNode(node))}
    </div>
  );
}
