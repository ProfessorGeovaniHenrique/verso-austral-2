import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  phaseFilter: string;
  onPhaseFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  resultsCount?: number;
  onClear: () => void;
}

export function SearchBar({
  searchTerm,
  onSearchChange,
  phaseFilter,
  onPhaseFilterChange,
  statusFilter,
  onStatusFilterChange,
  resultsCount,
  onClear
}: SearchBarProps) {
  const hasActiveFilters = searchTerm || phaseFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar em todos os logs..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => onSearchChange('')}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <Select value={phaseFilter} onValueChange={onPhaseFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por fase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as fases</SelectItem>
            <SelectItem value="0">Fase 0</SelectItem>
            <SelectItem value="1">Fase 1</SelectItem>
            <SelectItem value="2">Fase 2</SelectItem>
            <SelectItem value="3">Fase 3</SelectItem>
            <SelectItem value="4">Fase 4</SelectItem>
            <SelectItem value="5">Fase 5</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="completed">Concluídas</SelectItem>
            <SelectItem value="in-progress">Em Progresso</SelectItem>
            <SelectItem value="planned">Planejadas</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={onClear} className="gap-2">
            <X className="w-4 h-4" />
            Limpar
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filtros ativos:</span>
          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Busca: "{searchTerm}"
              <X className="w-3 h-3 cursor-pointer" onClick={() => onSearchChange('')} />
            </Badge>
          )}
          {phaseFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Fase {phaseFilter}
              <X className="w-3 h-3 cursor-pointer" onClick={() => onPhaseFilterChange('all')} />
            </Badge>
          )}
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {statusFilter === 'completed' ? 'Concluídas' : statusFilter === 'in-progress' ? 'Em Progresso' : 'Planejadas'}
              <X className="w-3 h-3 cursor-pointer" onClick={() => onStatusFilterChange('all')} />
            </Badge>
          )}
          {resultsCount !== undefined && (
            <span className="text-muted-foreground ml-2">
              ({resultsCount} resultado{resultsCount !== 1 ? 's' : ''})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
