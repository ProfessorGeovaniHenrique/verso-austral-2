/**
 * Componente Container de Página Padronizado
 * Sprint F5 - Layout Consistency
 */

import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'narrow' | 'wide' | 'full';
  withGradient?: boolean;
  withPadding?: boolean;
}

const containerVariants = {
  default: 'container mx-auto max-w-7xl',
  narrow: 'container mx-auto max-w-4xl',
  wide: 'container mx-auto max-w-[1400px]',
  full: 'w-full',
};

export function PageContainer({ 
  children, 
  className,
  variant = 'default',
  withGradient = false,
  withPadding = true,
}: PageContainerProps) {
  return (
    <div 
      className={cn(
        'min-h-screen bg-background',
        withGradient && 'bg-gradient-to-br from-background via-background to-primary/5',
        className
      )}
    >
      <div 
        className={cn(
          containerVariants[variant],
          withPadding && 'px-4 py-6 md:px-6 lg:px-8'
        )}
      >
        {children}
      </div>
    </div>
  );
}

// Header-aware container (accounts for fixed header)
export function PageContainerWithHeader({ 
  children, 
  className,
  ...props 
}: PageContainerProps) {
  return (
    <PageContainer 
      className={cn('pt-[80px]', className)} 
      {...props}
    >
      {children}
    </PageContainer>
  );
}

// Section container for consistent spacing within pages
interface SectionContainerProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export function SectionContainer({ 
  children, 
  className,
  title,
  description 
}: SectionContainerProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
