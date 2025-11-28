import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, FileMusic, X } from 'lucide-react';

interface Song {
  id: string;
  title: string;
}

interface SongSearchInputProps {
  songs: Song[];
  value: string;
  onChange: (songId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export function SongSearchInput({
  songs,
  value,
  onChange,
  placeholder = "Digite para buscar...",
  disabled,
  isLoading
}: SongSearchInputProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Encontrar a música selecionada
  const selectedSong = songs.find(s => s.id === value);

  // Filtrar músicas conforme digitação
  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative space-y-2" data-tour="song-search">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={selectedSong ? selectedSong.title : searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            if (value) onChange(''); // Limpa seleção ao digitar
          }}
          onFocus={() => {
            if (!selectedSong) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="pl-9"
        />
      </div>

      {/* Dropdown de sugestões */}
      {isOpen && !selectedSong && searchTerm && filteredSongs.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 shadow-lg border">
          <ScrollArea className="max-h-[200px]">
            <div className="p-1">
              {filteredSongs.map(song => (
                <button
                  key={song.id}
                  onClick={() => {
                    onChange(song.id);
                    setSearchTerm('');
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-accent rounded flex items-center gap-2 transition-colors"
                >
                  <FileMusic className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">{song.title}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Badge de seleção */}
      {selectedSong && (
        <Badge variant="secondary" className="gap-1.5">
          <FileMusic className="h-3 w-3" />
          {selectedSong.title}
          <button 
            onClick={() => {
              onChange('');
              setSearchTerm('');
            }} 
            className="ml-1 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {/* Mensagem de nenhum resultado */}
      {isOpen && !selectedSong && searchTerm && filteredSongs.length === 0 && (
        <Card className="absolute z-50 w-full mt-1 p-3 shadow-lg border">
          <p className="text-sm text-muted-foreground text-center">
            Nenhuma música encontrada
          </p>
        </Card>
      )}
    </div>
  );
}
