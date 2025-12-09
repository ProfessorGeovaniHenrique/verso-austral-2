/**
 * CatalogBreadcrumb
 * Sprint CAT-AUDIT-P1: Navegação contextual com breadcrumbs
 */

import { ChevronRight, Home, Music, User, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

type CatalogTab = 'songs' | 'artists' | 'enrichment-jobs' | 'stats' | 'metrics' | 'validation' | 'deduplication';

interface CatalogBreadcrumbProps {
  currentTab: CatalogTab;
  selectedLetter?: string;
  selectedArtist?: { id: string; name: string };
  selectedCorpus?: { id: string; name: string };
  onNavigate: (path: { tab?: CatalogTab; letter?: string; artist?: string }) => void;
}

const TAB_LABELS: Record<CatalogTab, string> = {
  'songs': 'Músicas',
  'artists': 'Artistas',
  'enrichment-jobs': 'Enriquecimento',
  'stats': 'Estatísticas',
  'metrics': 'Métricas',
  'validation': 'Validação',
  'deduplication': 'Deduplicação',
};

export function CatalogBreadcrumb({
  currentTab,
  selectedLetter,
  selectedArtist,
  selectedCorpus,
  onNavigate,
}: CatalogBreadcrumbProps) {
  const items: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    isActive?: boolean;
  }> = [];

  // Item raiz: Catálogo
  items.push({
    label: 'Catálogo',
    icon: <Music className="h-3.5 w-3.5" />,
    onClick: () => onNavigate({ tab: 'songs', letter: undefined, artist: undefined }),
  });

  // Tab atual
  items.push({
    label: TAB_LABELS[currentTab],
    onClick: () => onNavigate({ tab: currentTab, letter: undefined, artist: undefined }),
    isActive: !selectedLetter && !selectedArtist && !selectedCorpus,
  });

  // Corpus selecionado (se houver)
  if (selectedCorpus) {
    items.push({
      label: selectedCorpus.name,
      icon: <FolderOpen className="h-3.5 w-3.5" />,
      isActive: !selectedLetter && !selectedArtist,
    });
  }

  // Letra selecionada (apenas na aba de artistas)
  if (currentTab === 'artists' && selectedLetter && selectedLetter !== 'all') {
    items.push({
      label: selectedLetter.toUpperCase(),
      onClick: () => onNavigate({ tab: 'artists', letter: selectedLetter, artist: undefined }),
      isActive: !selectedArtist,
    });
  }

  // Artista selecionado
  if (selectedArtist) {
    items.push({
      label: selectedArtist.name,
      icon: <User className="h-3.5 w-3.5" />,
      isActive: true,
    });
  }

  return (
    <nav aria-label="Navegação do catálogo" className="flex items-center gap-1 text-sm">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          )}
          
          {item.onClick && !item.isActive ? (
            <button
              onClick={item.onClick}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "text-muted-foreground"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ) : (
            <span
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md",
                item.isActive 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-muted-foreground"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
