import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, RefreshCw, RotateCcw, Trash2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  criado_em: string | null;
}

interface RejectedTagsetsListProps {
  tagsets: SemanticTagset[];
  onRestore: (tagset: SemanticTagset) => void;
  onDelete: (tagset: SemanticTagset) => void;
  onRefresh: () => void;
}

const ITEMS_PER_PAGE = 20;

export function RejectedTagsetsList({ 
  tagsets, 
  onRestore, 
  onDelete, 
  onRefresh 
}: RejectedTagsetsListProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [nivelFilter, setNivelFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tagsetToDelete, setTagsetToDelete] = useState<SemanticTagset | null>(null);

  const rejectedTagsets = useMemo(() => {
    return tagsets.filter(t => t.status === 'rejeitado');
  }, [tagsets]);

  const filteredTagsets = useMemo(() => {
    let filtered = [...rejectedTagsets];

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

    // Ordenar por data de criação (mais recentes primeiro)
    filtered.sort((a, b) => {
      const dateA = a.criado_em ? new Date(a.criado_em).getTime() : 0;
      const dateB = b.criado_em ? new Date(b.criado_em).getTime() : 0;
      return dateB - dateA;
    });

    return filtered;
  }, [rejectedTagsets, searchTerm, nivelFilter]);

  const totalPages = Math.ceil(filteredTagsets.length / ITEMS_PER_PAGE);
  const paginatedTagsets = filteredTagsets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const exportToCSV = () => {
    const csvData = [
      ['Código', 'Nome', 'Descrição', 'Nível', 'Categoria Pai', 'Rejeitado em'],
      ...filteredTagsets.map(t => [
        t.codigo,
        t.nome,
        t.descricao || '',
        t.nivel_profundidade?.toString() || '',
        t.categoria_pai || '',
        t.criado_em ? format(new Date(t.criado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : ''
      ])
    ];

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dominios-rejeitados-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    
    toast({
      title: "CSV Exportado",
      description: `${filteredTagsets.length} domínios rejeitados exportados.`,
    });
  };

  const handleDeleteClick = (tagset: SemanticTagset) => {
    setTagsetToDelete(tagset);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (tagsetToDelete) {
      onDelete(tagsetToDelete);
      setDeleteConfirmOpen(false);
      setTagsetToDelete(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Domínios Semânticos Rejeitados
              </CardTitle>
              <CardDescription>
                {filteredTagsets.length} {filteredTagsets.length === 1 ? 'domínio rejeitado' : 'domínios rejeitados'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
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
        
        <CardContent>
          {/* Busca e Filtros */}
          <div className="flex gap-4 mb-6">
            <Input 
              placeholder="Buscar código ou nome..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="max-w-sm"
            />
            <Select value={nivelFilter} onValueChange={(value) => {
              setNivelFilter(value);
              setCurrentPage(1);
            }}>
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
          </div>

          {/* Tabela */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Categoria Pai</TableHead>
                  <TableHead>Rejeitado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTagsets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum domínio rejeitado encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTagsets.map(tagset => (
                    <TableRow key={tagset.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono border-destructive text-destructive">
                          {tagset.codigo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-[300px]">
                        <div className="truncate" title={tagset.nome}>
                          {tagset.nome}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          Nível {tagset.nivel_profundidade}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tagset.categoria_pai || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(tagset.criado_em)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => onRestore(tagset)}
                            title="Restaurar para validação"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteClick(tagset)}
                            title="Excluir permanentemente"
                            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredTagsets.length)} de {filteredTagsets.length}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-2 text-sm">
                  Página {currentPage} de {totalPages}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Domínio Permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente o domínio{" "}
              <span className="font-semibold text-foreground">
                {tagsetToDelete?.codigo} - {tagsetToDelete?.nome}
              </span>
              ?{" "}
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
