/**
 * 🧭 SUB-TAB BREADCRUMB
 * Sprint AUD-U: Breadcrumb de contexto para sub-abas
 * 
 * Exibe localização atual em interfaces com múltiplos níveis de tabs
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubTabBreadcrumbProps {
  parentLabel: string;
  currentLabel: string;
  parentIcon?: React.ReactNode;
  currentIcon?: React.ReactNode;
  className?: string;
}

export function SubTabBreadcrumb({
  parentLabel,
  currentLabel,
  parentIcon,
  currentIcon,
  className
}: SubTabBreadcrumbProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 text-sm text-muted-foreground mb-4 px-1",
      className
    )}>
      <div className="flex items-center gap-1.5">
        {parentIcon}
        <span>{parentLabel}</span>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
      <div className="flex items-center gap-1.5 font-medium text-foreground">
        {currentIcon}
        <span>{currentLabel}</span>
      </div>
    </div>
  );
}
