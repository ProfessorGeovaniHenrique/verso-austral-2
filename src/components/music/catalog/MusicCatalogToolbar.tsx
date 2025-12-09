/**
 * Toolbar do MusicCatalog
 * Sprint F2.1 - Refatoração
 * Sprint CAT-AUDIT-P0 - Ação destrutiva movida para dropdown
 * Sprint CAT-AUDIT-P1 - Autocomplete + botão Analisar Corpus
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AdvancedExportMenu } from '@/components/music';
import { CatalogSearchAutocomplete } from './CatalogSearchAutocomplete';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutGrid, LayoutList, RefreshCw, Trash2, Loader2, MoreVertical, Settings, Microscope } from 'lucide-react';
import type { ViewMode } from '@/hooks/music-catalog';

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

interface MusicCatalogToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onRefresh: () => void;
  onClearCatalog: () => void;
  isClearingCatalog: boolean;
  totalSongs: number;
  totalArtists: number;
  // Sprint CAT-AUDIT-P1: Autocomplete
  artists?: Artist[];
  songs?: Song[];
  onSelectArtist?: (artistId: string) => void;
  onSelectSong?: (songId: string) => void;
  // Sprint CAT-AUDIT-P1: Analisar Corpus
  selectedCorpusFilter?: string;
}

export function MusicCatalogToolbar({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onRefresh,
  onClearCatalog,
  isClearingCatalog,
  totalSongs,
  totalArtists,
  artists = [],
  songs = [],
  onSelectArtist,
  onSelectSong,
  selectedCorpusFilter,
}: MusicCatalogToolbarProps) {
  const navigate = useNavigate();
  const [showClearDialog, setShowClearDialog] = useState(false);

  const handleAnalyzeCorpus = () => {
    const params = new URLSearchParams();
    if (selectedCorpusFilter && selectedCorpusFilter !== 'all') {
      params.set('corpus', selectedCorpusFilter);
    }
    navigate(`/analysis-tools${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <>
      <div className="border-b bg-muted/30 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Search with Autocomplete */}
            <div className="flex items-center gap-2 flex-1">
              <CatalogSearchAutocomplete
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
                artists={artists}
                songs={songs}
                onSelectArtist={onSelectArtist || (() => {})}
                onSelectSong={onSelectSong || (() => {})}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Sprint CAT-AUDIT-P1: Botão Analisar Corpus */}
              <Button 
                variant="default" 
                size="sm" 
                className="h-9 gap-2"
                onClick={handleAnalyzeCorpus}
              >
                <Microscope className="h-4 w-4" />
                <span className="hidden sm:inline">Analisar Corpus</span>
              </Button>
              
              <Button variant="ghost" size="sm" className="h-9 gap-2" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Atualizar</span>
              </Button>
              
              {/* View mode toggle */}
              <div className="flex items-center gap-1 border rounded-md p-0.5 bg-background/50">
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => onViewModeChange('table')}
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => onViewModeChange('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>

              <AdvancedExportMenu 
                onExport={(format) => {
                  // Export handled by AdvancedExportMenu
                }}
              />

              {/* Advanced Options Dropdown - Ações destrutivas aqui */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0"
                    disabled={isClearingCatalog}
                  >
                    {isClearingCatalog ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreVertical className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem disabled>
                    <Settings className="h-4 w-4 mr-2" />
                    Opções Avançadas
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    onClick={() => setShowClearDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar Catálogo...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Clear Catalog Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Ação Irreversível</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá excluir permanentemente <strong>todas as {totalSongs.toLocaleString()} músicas</strong>, 
              <strong> todos os {totalArtists.toLocaleString()} artistas</strong> e seus uploads.
              <br /><br />
              <span className="text-destructive font-medium">Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onClearCatalog();
                setShowClearDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
