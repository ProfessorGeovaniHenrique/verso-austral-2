import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDevHistorySearch, SearchResult } from '@/hooks/useDevHistorySearch';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SearchBarProps {
  onResultClick?: (result: SearchResult) => void;
}

export function SearchBar({ onResultClick }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { results, isSearching } = useDevHistorySearch(query);
  
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'epic': return '🎯';
      case 'story': return '📝';
      case 'decision': return '💡';
      case 'phase': return '🚀';
      default: return '📄';
    }
  };
  
  return (
    <div className="w-full max-w-2xl">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar épicos, histórias, decisões técnicas..."
              className="pl-9 pr-9"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(e.target.value.length >= 2);
              }}
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => {
                  setQuery('');
                  setOpen(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </PopoverTrigger>
        
        <PopoverContent 
          className="w-[600px] p-0" 
          align="start"
          side="bottom"
        >
          <Command>
            <CommandList>
              {isSearching && (
                <CommandEmpty>Buscando...</CommandEmpty>
              )}
              
              {!isSearching && results.length === 0 && query.length >= 2 && (
                <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
              )}
              
              {!isSearching && results.length > 0 && (
                <ScrollArea className="h-[400px]">
                  <CommandGroup heading={`${results.length} resultados encontrados`}>
                    {results.map((result) => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => {
                          onResultClick?.(result);
                          setOpen(false);
                        }}
                        className="flex flex-col items-start gap-2 p-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-lg">{getResultIcon(result.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{result.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {result.contextPath}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {result.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 pl-7">
                          {result.description}
                        </p>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </ScrollArea>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {query && results.length > 0 && !open && (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{results.length} resultados</Badge>
          <span>Clique no campo para ver os resultados</span>
        </div>
      )}
    </div>
  );
}
