import { Badge } from '@/components/ui/badge';
import { HardDrive, Database, Cloud } from 'lucide-react';

export type StorageSource = 'localStorage' | 'indexedDB' | 'cloud' | null;

interface StorageSourceBadgeProps {
  source: StorageSource;
  className?: string;
}

export function StorageSourceBadge({ source, className }: StorageSourceBadgeProps) {
  if (!source) return null;

  const config = {
    localStorage: {
      icon: HardDrive,
      label: 'Armazenamento Local',
      variant: 'secondary' as const,
    },
    indexedDB: {
      icon: Database,
      label: 'Armazenamento Estendido',
      variant: 'outline' as const,
    },
    cloud: {
      icon: Cloud,
      label: 'Nuvem',
      variant: 'default' as const,
    },
  };

  const { icon: Icon, label, variant } = config[source];

  return (
    <Badge variant={variant} className={className}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}
