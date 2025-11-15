import { motion } from 'framer-motion';
import { Globe, Settings, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SideIconsPanelProps {
  showOrbitalRings: boolean;
  onToggleOrbits: () => void;
  onOpenSettings: () => void;
  onOpenSearch: () => void;
}

export function SideIconsPanel({
  showOrbitalRings,
  onToggleOrbits,
  onOpenSettings,
  onOpenSearch,
}: SideIconsPanelProps) {
  const icons = [
    {
      icon: Globe,
      label: 'Toggle Orbital Rings',
      active: showOrbitalRings,
      onClick: onToggleOrbits,
    },
    {
      icon: Settings,
      label: 'Settings',
      active: false,
      onClick: onOpenSettings,
    },
    {
      icon: Search,
      label: 'Search',
      active: false,
      onClick: onOpenSearch,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="absolute left-5 top-1/2 -translate-y-1/2 flex flex-col gap-3"
    >
      {icons.map((item, index) => (
        <Tooltip key={index}>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={item.active ? 'default' : 'outline'}
              onClick={item.onClick}
              className={`w-14 h-14 rounded-lg transition-all ${
                item.active
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/50'
                  : 'border-primary/30 hover:border-primary hover:bg-primary/10'
              }`}
              style={{
                boxShadow: item.active ? '0 0 20px hsl(var(--primary) / 0.6)' : 'none',
              }}
            >
              <item.icon className="w-6 h-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{item.label}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </motion.div>
  );
}
