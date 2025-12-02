/**
 * Componente de Loading Padronizado
 * Sprint F4 - UI/UX Refactoring
 */

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  variant?: 'default' | 'inline' | 'fullscreen' | 'card';
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export function LoadingSpinner({ 
  size = 'md', 
  text, 
  className,
  variant = 'default' 
}: LoadingSpinnerProps) {
  const spinner = (
    <Loader2 className={cn(sizeClasses[size], 'animate-spin text-primary', className)} />
  );

  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center gap-2">
        {spinner}
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </span>
    );
  }

  if (variant === 'fullscreen') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          {spinner}
          {text && <p className="text-muted-foreground">{text}</p>}
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center space-y-2">
          {spinner}
          {text && <p className="text-sm text-muted-foreground">{text}</p>}
        </div>
      </div>
    );
  }

  // Default: centered with optional text
  return (
    <div className="flex items-center justify-center gap-2">
      {spinner}
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

// Button loading state helper
export function ButtonLoading({ text = 'Processando...' }: { text?: string }) {
  return (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {text}
    </>
  );
}

// Page loading skeleton
export function PageLoading({ text = 'Carregando...' }: { text?: string }) {
  return <LoadingSpinner variant="fullscreen" size="xl" text={text} />;
}

// Card/Section loading
export function SectionLoading({ text = 'Carregando...' }: { text?: string }) {
  return <LoadingSpinner variant="card" size="lg" text={text} />;
}
