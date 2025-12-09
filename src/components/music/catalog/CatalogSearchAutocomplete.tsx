/**
 * CatalogSearchAutocomplete
 * Sprint CAT-AUDIT-P1: Busca com autocomplete para artistas e músicas
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, User, Music, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Artist {
  id: string;
  name: string;
  genre?: string | null;
}

interface Song {
  id: string;
  title: string;
  artistName: string;
}

interface CatalogSearchAutocompleteProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  artists: Artist[];
  songs: Song[];
  onSelectArtist: (artistId: string) => void;
  onSelectSong: (songId: string) => void;
  className?: string;
}

export function CatalogSearchAutocomplete({
  searchQuery,
  onSearchChange,
  artists,
  songs,
  onSelectArtist,
  onSelectSong,
  className,
}: CatalogSearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtrar resultados com debounce implícito (useMemo)
  const filteredArtists = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    return artists
      .filter(a => a.name.toLowerCase().includes(query))
      .slice(0, 5);
  }, [artists, searchQuery]);

  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    return songs
      .filter(s => s.title.toLowerCase().includes(query))
      .slice(0, 5);
  }, [songs, searchQuery]);

  const totalResults = filteredArtists.length + filteredSongs.length;
  const hasResults = totalResults > 0;

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || !hasResults) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < totalResults - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : totalResults - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          if (highlightedIndex < filteredArtists.length) {
            onSelectArtist(filteredArtists[highlightedIndex].id);
          } else {
            const songIndex = highlightedIndex - filteredArtists.length;
            onSelectSong(filteredSongs[songIndex].id);
          }
          setIsOpen(false);
          onSearchChange('');
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  }, [isOpen, hasResults, totalResults, highlightedIndex, filteredArtists, filteredSongs, onSelectArtist, onSelectSong, onSearchChange]);

  // Highlight do termo buscado
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-primary/20 text-primary font-medium rounded px-0.5">{part}</mark>
        : part
    );
  };

  const handleSelect = (type: 'artist' | 'song', id: string) => {
    if (type === 'artist') {
      onSelectArtist(id);
    } else {
      onSelectSong(id);
    }
    setIsOpen(false);
    onSearchChange('');
  };

  return (
    <div ref={containerRef} className={cn("relative flex-1 max-w-sm", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          placeholder="Buscar músicas, artistas..."
          className="pl-9 pr-8 h-9 bg-background/50"
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {searchQuery && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              onSearchChange('');
              inputRef.current?.focus();
            }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && hasResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 overflow-hidden">
          <ScrollArea className="max-h-80">
            {/* Seção Artistas */}
            {filteredArtists.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 flex items-center gap-2">
                  <User className="h-3 w-3" />
                  Artistas ({filteredArtists.length})
                </div>
                {filteredArtists.map((artist, index) => (
                  <button
                    key={artist.id}
                    className={cn(
                      "w-full px-3 py-2 text-left flex items-center gap-3 hover:bg-accent transition-colors",
                      highlightedIndex === index && "bg-accent"
                    )}
                    onClick={() => handleSelect('artist', artist.id)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {highlightMatch(artist.name, searchQuery)}
                      </div>
                      {artist.genre && (
                        <div className="text-xs text-muted-foreground truncate">
                          {artist.genre}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Seção Músicas */}
            {filteredSongs.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 flex items-center gap-2">
                  <Music className="h-3 w-3" />
                  Músicas ({filteredSongs.length})
                </div>
                {filteredSongs.map((song, index) => {
                  const itemIndex = filteredArtists.length + index;
                  return (
                    <button
                      key={song.id}
                      className={cn(
                        "w-full px-3 py-2 text-left flex items-center gap-3 hover:bg-accent transition-colors",
                        highlightedIndex === itemIndex && "bg-accent"
                      )}
                      onClick={() => handleSelect('song', song.id)}
                      onMouseEnter={() => setHighlightedIndex(itemIndex)}
                    >
                      <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {highlightMatch(song.title, searchQuery)}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {song.artistName}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer com dica de teclado */}
          <div className="px-3 py-1.5 text-xs text-muted-foreground bg-muted/30 border-t flex items-center justify-between">
            <span>↑↓ para navegar</span>
            <span>Enter para selecionar</span>
          </div>
        </div>
      )}

      {/* Mensagem quando não há resultados */}
      {isOpen && searchQuery.length >= 2 && !hasResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum resultado para "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
}
