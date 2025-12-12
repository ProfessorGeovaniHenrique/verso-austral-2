# 🏗️ Verso Austral - Architecture Documentation

## Overview

Verso Austral is a semantic analysis platform for Brazilian regional music corpora, built with React + Vite frontend and Supabase backend (Lovable Cloud).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| State | React Context, TanStack Query, Zustand |
| Backend | Supabase (PostgreSQL, Edge Functions) |
| AI | Lovable AI Gateway (GPT-5, Gemini) |
| Monitoring | Sentry |

---

## Project Structure

```
verso-austral/
├── src/
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui primitives
│   │   ├── music/         # Music catalog components
│   │   ├── semantic/      # Semantic analysis components
│   │   ├── admin/         # Admin dashboard components
│   │   └── dashboard/     # Dashboard components
│   ├── contexts/          # React contexts (11)
│   ├── hooks/             # Custom hooks (97)
│   ├── pages/             # Route pages (36)
│   ├── services/          # Business logic services (35)
│   ├── lib/               # Utilities and helpers
│   ├── data/              # Static data and mocks
│   └── integrations/      # External integrations
├── supabase/
│   ├── functions/         # Edge functions (62)
│   ├── migrations/        # Database migrations
│   └── config.toml        # Supabase configuration
├── docs/                  # Documentation
└── scripts/               # Build/maintenance scripts
```

---

## Core Subsystems

### 1. Semantic Annotation System

**Purpose:** Classify words from song lyrics into semantic domains (N1-N4 hierarchy).

**Components:**
- `useSemanticAnnotationJob` - Job management hook
- `useSemanticAnnotationCatalog` - Catalog integration
- `annotate-artist-songs` - Main orchestrator edge function
- `annotate-semantic-domain` - Classification engine
- `semantic_disambiguation_cache` - Results storage

**Flow:**
```
Artist Selection → Job Creation → Chunk Processing → Cache Storage → UI Display
```

**Key Design Decisions:**
- 50-word chunks (4-minute Edge Function timeout)
- Self-invoking job queue for long-running tasks
- Incremental cache accumulation
- 4-layer POS tagging (VA Grammar → spaCy → Gutenberg → Gemini)

### 2. Music Enrichment System

**Purpose:** Enrich song metadata (composer, year, album) from multiple sources.

**Components:**
- `useEnrichment` - Main enrichment hook
- `enrich-music-data` - 5-layer pipeline edge function
- Cross-validation engine for confidence scoring

**Layers:**
1. YouTube API (description parsing)
2. GPT-5 Knowledge Base
3. Google Search Grounding
4. Cross-Validation Engine
5. Persistence Layer

### 3. Dictionary Import System

**Purpose:** Import and process lexical dictionaries (Gutenberg, Dialectal, Navarro).

**Components:**
- `useDictionaryImportJobs` - Job monitoring
- `import-*-backend` - Import edge functions
- `process-*-dictionary` - Processing functions

### 4. Authentication & Authorization

**Components:**
- `AuthContext` - Global auth state
- `useAuth` - Auth operations hook
- `user_roles` table - Role-based access
- `invite_keys` table - Invitation system

**Roles:**
- `admin` - Full access
- `researcher` - Analysis tools
- `teacher` - Educational features
- `student` - Limited access

### 5. Quiz & Educational Module

**Components:**
- `QuizContext` - Quiz state management
- `useQuizQuestions` - Question CRUD
- `quiz_questions` table - Database storage
- `refine-quiz-question` - AI refinement

---

## Database Schema (Key Tables)

### Core Data
```sql
songs (id, title, lyrics, artist_id, composer, release_year, ...)
artists (id, name, biography, corpus_id, ...)
corpora (id, name, normalized_name, ...)
```

### Semantic Analysis
```sql
semantic_disambiguation_cache (palavra, tagset_codigo, confianca, ...)
semantic_tagset (codigo, nome, nivel_profundidade, ...)
semantic_lexicon (palavra, tagset_codigo, fonte, ...)
```

### Lexicons
```sql
gutenberg_lexicon (verbete, classe_gramatical, definicoes, ...)
dialectal_lexicon (verbete, categorias_tematicas, ...)
```

### Jobs & Monitoring
```sql
annotation_jobs (id, status, progresso, ...)
semantic_annotation_jobs (id, artist_id, processed_words, ...)
dictionary_import_jobs (id, tipo_dicionario, status, ...)
```

---

## API Patterns

### Edge Function Standard Response
```typescript
return new Response(
  JSON.stringify({ success: true, data: result }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

### Error Handling
```typescript
try {
  // operation
} catch (error) {
  console.error('[function-name] Error:', error);
  return new Response(
    JSON.stringify({ success: false, error: error.message }),
    { status: 500, headers: corsHeaders }
  );
}
```

### React Query Pattern
```typescript
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['key', param],
  queryFn: () => fetchData(param),
  staleTime: 5 * 60 * 1000,
});
```

---

## State Management

### Global Contexts
| Context | Purpose | Persistence |
|---------|---------|-------------|
| AuthContext | User authentication | Supabase session |
| CorpusContext | Corpus selection | Memory |
| SubcorpusContext | Artist/song selection | localStorage |
| DashboardAnaliseContext | Analysis state | localStorage + versioning |
| QuizContext | Quiz progress | localStorage |
| ThemeContext | Theme preference | localStorage |

### Local State Patterns
- `useState` for simple component state
- `useReducer` for complex state logic
- Zustand for cross-component state (minimal usage)

---

## Performance Optimizations

### Implemented
- TanStack Virtual for large lists (30k+ songs)
- Materialized view (`artist_stats_mv`) for statistics
- Lazy loading for admin pages
- React Query caching with staleTime
- Chunk-based processing for long operations

### Recommended
- Code splitting by route
- Image lazy loading
- Service worker caching
- Database query optimization

---

## Security Model

### Row Level Security (RLS)
- All user-specific tables have RLS enabled
- Admin operations require `has_role(auth.uid(), 'admin')`
- Public read for educational content

### API Security
- Edge functions use JWT verification where appropriate
- Rate limiting on AI endpoints
- Input validation on all mutations

---

## Monitoring & Observability

### Logging
- `structured-logger.ts` - Production logging
- `unified-logger.ts` - Backend logging
- Sentry integration for error tracking

### Health Checks
- `health-aggregator` - System health
- `health-check-lexicon` - Lexicon health
- `monitor-and-alert` - Alerting system

---

## System Resilience & Backpressure

### Protection Layers

The system implements a 4-layer protection architecture to prevent database overload:

```
┌─────────────────────────────────────────────────────────────┐
│ L1: Pre-flight Check (Frontend)                             │
│     └── checkCanStartJob() before starting any job          │
├─────────────────────────────────────────────────────────────┤
│ L2: Job Slot Manager (Redis)                                │
│     └── Limits 5 concurrent jobs globally                   │
├─────────────────────────────────────────────────────────────┤
│ L3: Backpressure Detection (Edge Functions)                 │
│     └── Detects latency and activates cooldowns             │
├─────────────────────────────────────────────────────────────┤
│ L4: Kill Switch (Redis + Edge Functions)                    │
│     └── Stops everything immediately in emergency           │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| Job Slot Manager | `_shared/job-slot-manager.ts` | Redis-based concurrency control |
| Backpressure System | `_shared/backpressure.ts` | Latency detection & cooldowns |
| Health Check | `_shared/health-check.ts` | System health aggregation |
| Kill Switch | `emergency-kill-jobs/index.ts` | Emergency stop all jobs |
| Frontend Hook | `useBackpressureStatus.ts` | UI integration |
| Alert Component | `BackpressureAlert.tsx` | Visual feedback |

### Severity Levels

| Level | Active Jobs | Action |
|-------|-------------|--------|
| 🟢 Normal | 0-3 | None |
| 🟡 Elevated | 4-5 | 2x delay |
| 🟠 High | 6-8 | 4x delay, block new jobs |
| 🔴 Critical | 9+ | Kill switch, 30min cooldown |

### Emergency Documentation

- [Emergency Runbook](./EMERGENCY_RUNBOOK.md) - Step-by-step crisis procedures
- [Incident 2024-12-12](./INCIDENT_2024_12_12_SUPABASE_OVERLOAD.md) - Post-mortem analysis

---

## Development Guidelines

See [CODE_CONVENTIONS.md](./CODE_CONVENTIONS.md) for coding standards.
See [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) for edge function documentation.
See [EMERGENCY_RUNBOOK.md](./EMERGENCY_RUNBOOK.md) for emergency procedures.
