import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface FilterState {
  minFrequency: number;
  prosody: ('positive' | 'neutral' | 'negative')[];
  categories: string[];
  searchQuery: string;
}

interface FilterToolbarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  categories: string[];
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  filters,
  onFilterChange,
  categories,
}) => {
  const toggleProsody = (prosody: 'positive' | 'neutral' | 'negative') => {
    const newProsody = filters.prosody.includes(prosody)
      ? filters.prosody.filter(p => p !== prosody)
      : [...filters.prosody, prosody];
    onFilterChange({ ...filters, prosody: newProsody });
  };

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    onFilterChange({ ...filters, categories: newCategories });
  };

  const resetFilters = () => {
    onFilterChange({
      minFrequency: 1,
      prosody: ['positive', 'neutral', 'negative'],
      categories: categories,
      searchQuery: '',
    });
  };

  const hasActiveFilters = 
    filters.minFrequency > 1 ||
    filters.prosody.length < 3 ||
    filters.categories.length < categories.length ||
    filters.searchQuery !== '';

  return (
    <div className="absolute top-16 left-0 right-0 z-10 mx-4">
      <div className="bg-[#2d2d2d]/90 backdrop-blur-md rounded-lg border border-border/50 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Frequency Slider */}
          <div className="flex items-center gap-3 min-w-[200px]">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">
                Min. ocorrências: {filters.minFrequency}
              </label>
              <Slider
                value={[filters.minFrequency]}
                onValueChange={([value]) => 
                  onFilterChange({ ...filters, minFrequency: value })
                }
                min={1}
                max={50}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          {/* Prosody Toggles */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Prosódia:</span>
            <Button
              variant={filters.prosody.includes('positive') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleProsody('positive')}
              className={filters.prosody.includes('positive') 
                ? 'bg-[#33a033] hover:bg-[#33a033]/90 border-[#33a033]' 
                : ''}
            >
              Positiva
            </Button>
            <Button
              variant={filters.prosody.includes('neutral') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleProsody('neutral')}
              className={filters.prosody.includes('neutral') 
                ? 'bg-[#777] hover:bg-[#777]/90 border-[#777]' 
                : ''}
            >
              Neutra
            </Button>
            <Button
              variant={filters.prosody.includes('negative') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleProsody('negative')}
              className={filters.prosody.includes('negative') 
                ? 'bg-[#d12a4d] hover:bg-[#d12a4d]/90 border-[#d12a4d]' 
                : ''}
            >
              Negativa
            </Button>
          </div>

          {/* Category Multi-Select */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Categorias:</span>
            {categories.map(category => (
              <Button
                key={category}
                variant={filters.categories.includes(category) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-2 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar palavra..."
                value={filters.searchQuery}
                onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
                className="pl-8 h-9"
              />
            </div>
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Limpar Filtros
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
