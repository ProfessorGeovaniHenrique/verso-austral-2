import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ChevronLeft, 
  ChevronRight, 
  Search,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { getAllFindings, type AuditFinding } from "@/data/developer-logs/audits-registry";

const severityColors = {
  critical: 'bg-red-500/10 text-red-600 border-red-500/30',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  low: 'bg-green-500/10 text-green-600 border-green-500/30'
};

const statusIcons = {
  resolved: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  'in-progress': <Clock className="h-4 w-4 text-amber-600" />,
  open: <AlertCircle className="h-4 w-4 text-red-600" />,
  'wont-fix': <span className="text-muted-foreground">—</span>,
  deferred: <Clock className="h-4 w-4 text-muted-foreground" />
};

const ITEMS_PER_PAGE = 10;

export function AuditFindingsTable() {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const allFindings = useMemo(() => getAllFindings(), []);

  const filteredFindings = useMemo(() => {
    return allFindings.filter(f => {
      const matchesSearch = search === '' || 
        f.description.toLowerCase().includes(search.toLowerCase()) ||
        f.component.toLowerCase().includes(search.toLowerCase()) ||
        f.id.toLowerCase().includes(search.toLowerCase());
      
      const matchesSeverity = severityFilter === 'all' || f.severity === severityFilter;
      const matchesCategory = categoryFilter === 'all' || f.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || f.status === statusFilter;

      return matchesSearch && matchesSeverity && matchesCategory && matchesStatus;
    });
  }, [allFindings, search, severityFilter, categoryFilter, statusFilter]);

  const totalPages = Math.ceil(filteredFindings.length / ITEMS_PER_PAGE);
  const paginatedFindings = filteredFindings.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar findings..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>

        <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Severidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="critical">Crítica</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="functional">Functional</SelectItem>
            <SelectItem value="ux">UX</SelectItem>
            <SelectItem value="accessibility">Accessibility</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="resolved">Resolvido</SelectItem>
            <SelectItem value="in-progress">Em Progresso</SelectItem>
            <SelectItem value="open">Aberto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead className="w-[100px]">Severidade</TableHead>
              <TableHead className="w-[100px]">Categoria</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-[120px]">Componente</TableHead>
              <TableHead className="w-[80px]">Status</TableHead>
              <TableHead className="w-[100px]">Sprint</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedFindings.map((finding) => (
              <TableRow key={`${finding.auditName}-${finding.id}`}>
                <TableCell className="font-mono text-xs">{finding.id}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={severityColors[finding.severity]}>
                    {finding.severity}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm capitalize">{finding.category}</TableCell>
                <TableCell className="text-sm max-w-[300px] truncate" title={finding.description}>
                  {finding.description}
                </TableCell>
                <TableCell className="text-sm font-mono text-xs">{finding.component}</TableCell>
                <TableCell>{statusIcons[finding.status]}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {finding.resolvedIn || '—'}
                </TableCell>
              </TableRow>
            ))}
            {paginatedFindings.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum finding encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {((page - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(page * ITEMS_PER_PAGE, filteredFindings.length)} de {filteredFindings.length} findings
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            {page} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
