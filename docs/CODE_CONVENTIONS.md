# 📝 Code Conventions

## Naming Conventions

### Files
| Type | Pattern | Example |
|------|---------|---------|
| Components | PascalCase | `ArtistCard.tsx` |
| Hooks | camelCase with `use` prefix | `useSemanticAnnotation.ts` |
| Services | camelCase with `Service` suffix | `corpusDataService.ts` |
| Contexts | PascalCase with `Context` suffix | `AuthContext.tsx` |
| Edge Functions | kebab-case | `annotate-artist-songs/` |
| Types | PascalCase | `SemanticDomain.ts` |

### Variables & Functions
```typescript
// Variables: camelCase
const artistName = 'Luiz Marenco';
const isProcessing = false;

// Constants: SCREAMING_SNAKE_CASE
const MAX_CHUNK_SIZE = 50;
const API_TIMEOUT_MS = 4 * 60 * 1000;

// Functions: camelCase, verb-first
function fetchArtistSongs() {}
function processSemanticDomain() {}
function validateUserInput() {}

// Boolean variables: is/has/should prefix
const isLoading = true;
const hasError = false;
const shouldRefresh = true;
```

### TypeScript Types
```typescript
// Interfaces: PascalCase with 'I' prefix (optional)
interface Artist { }
interface ISemanticResult { }

// Types: PascalCase
type CorpusType = 'gaucho' | 'nordestino' | 'sertanejo';
type ProcessingStatus = 'pending' | 'processing' | 'complete';

// Enums: PascalCase
enum UserRole {
  Admin = 'admin',
  Researcher = 'researcher',
}
```

---

## Component Structure

### Standard Component
```tsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// Types at top
interface ComponentProps {
  title: string;
  onAction?: () => void;
}

// Component
export function ComponentName({ title, onAction }: ComponentProps) {
  // Hooks first
  const [state, setState] = useState<string>('');
  const { data, isLoading } = useQuery({ ... });

  // Effects
  useEffect(() => {
    // effect logic
  }, [dependency]);

  // Handlers
  const handleClick = () => {
    onAction?.();
  };

  // Early returns for loading/error states
  if (isLoading) return <Skeleton />;

  // Render
  return (
    <div className="...">
      {/* JSX */}
    </div>
  );
}
```

### Hook Structure
```typescript
import { useState, useEffect, useCallback } from 'react';

interface UseHookOptions {
  enabled?: boolean;
}

interface UseHookReturn {
  data: DataType | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useHookName(options: UseHookOptions = {}): UseHookReturn {
  const { enabled = true } = options;
  
  const [data, setData] = useState<DataType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    // fetch logic
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refetch();
  }, [enabled, refetch]);

  // IMPORTANT: Always cleanup intervals/subscriptions
  useEffect(() => {
    const intervalId = setInterval(() => {}, 5000);
    return () => clearInterval(intervalId); // ✅ Cleanup
  }, []);

  return { data, isLoading, error, refetch };
}
```

---

## Styling with Tailwind

### Use Semantic Tokens
```tsx
// ✅ CORRECT - Use design system tokens
<div className="bg-background text-foreground border-border">
<button className="bg-primary text-primary-foreground hover:bg-primary/90">

// ❌ WRONG - Hardcoded colors
<div className="bg-white text-black border-gray-200">
<button className="bg-purple-600 text-white hover:bg-purple-700">
```

### Responsive Design
```tsx
// Mobile-first approach
<div className="flex flex-col md:flex-row lg:grid lg:grid-cols-3">
  <div className="w-full md:w-1/2 lg:w-auto">
```

### Component Variants (shadcn pattern)
```tsx
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        outline: 'border border-input bg-background',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
```

---

## Error Handling

### Frontend
```typescript
try {
  const result = await apiCall();
  toast.success('Operação concluída!');
} catch (error) {
  console.error('[ComponentName] Error:', error);
  toast.error(error instanceof Error ? error.message : 'Erro desconhecido');
}
```

### Edge Functions
```typescript
try {
  // operation
} catch (error) {
  console.error('[function-name] Error:', error);
  
  // Log to Sentry if available
  if (Sentry) {
    Sentry.captureException(error);
  }
  
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }),
    { status: 500, headers: corsHeaders }
  );
}
```

---

## Database Queries

### Use Type-Safe Queries
```typescript
const { data, error } = await supabase
  .from('songs')
  .select('id, title, lyrics, artist:artists(name)')
  .eq('artist_id', artistId)
  .order('title');

// Always handle errors
if (error) throw error;
```

### Avoid N+1 Queries
```typescript
// ❌ WRONG - N+1 queries
for (const song of songs) {
  const { data } = await supabase
    .from('annotations')
    .select('*')
    .eq('song_id', song.id);
}

// ✅ CORRECT - Single query
const { data } = await supabase
  .from('annotations')
  .select('*')
  .in('song_id', songs.map(s => s.id));
```

---

## Logging

### Development
```typescript
// Use structured logging
console.log('[ComponentName] Action:', { param1, param2 });
console.warn('[ComponentName] Warning:', message);
console.error('[ComponentName] Error:', error);
```

### Production
```typescript
import { logger } from '@/lib/structured-logger';

logger.info('Operation completed', { userId, action });
logger.error('Operation failed', { error, context });
```

---

## Comments

### When to Comment
```typescript
// ✅ Explain WHY, not WHAT
// Skip empty corpora to avoid division by zero in statistics
if (corpus.songCount === 0) continue;

// ✅ Document complex algorithms
/**
 * Calculates Log-Likelihood score for keyword significance.
 * Uses Dunning's formula: 2 * sum(O * ln(O/E))
 * @see https://ucrel.lancs.ac.uk/llwizard.html
 */
function calculateLogLikelihood() {}

// ❌ Avoid obvious comments
// Set the name to the user's name
setName(user.name);
```

---

## Git Commit Messages

### Format
```
type(scope): short description

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation
- `style`: Formatting, no code change
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance

### Examples
```
feat(semantic): add MG word reclassification

fix(auth): resolve invite deletion permission error

refactor(hooks): consolidate annotation hooks

docs: add architecture documentation
```

---

## Testing Guidelines

### Unit Tests
```typescript
import { describe, it, expect } from 'vitest';

describe('functionName', () => {
  it('should return expected result for valid input', () => {
    const result = functionName(validInput);
    expect(result).toEqual(expectedOutput);
  });

  it('should throw error for invalid input', () => {
    expect(() => functionName(invalidInput)).toThrow();
  });
});
```

### Component Tests
```typescript
import { render, screen } from '@testing-library/react';

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```
