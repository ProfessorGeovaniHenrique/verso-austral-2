# 📊 Verso Austral - Audit Snapshot
**Data: 2024-12-02**  
**Versão: Pre-Refactoring Baseline**

---

## 1. Database State Snapshot

### 1.1 Core Tables
| Table | Count | Notes |
|-------|-------|-------|
| `songs` | 52,356 | ~14k potential duplicates |
| `artists` | 649 | Across 3 corpora |
| `corpora` | 3 | gaucho, nordestino, sertanejo |
| `semantic_disambiguation_cache` | 12,973 | Primary annotation cache |
| `semantic_tagset` | 728 | Hierarchical N1-N4 |
| `semantic_lexicon` | 9,891 | Seeded lexicon |
| `gutenberg_lexicon` | 64,392 | Portuguese dictionary |
| `dialectal_lexicon` | 5,968 | Regional vocabulary |
| `annotation_jobs` | 28 | Legacy jobs |
| `semantic_annotation_jobs` | 11 | Artist-based jobs |

### 1.2 Corpus Distribution
| Corpus | Artists | Songs | Status |
|--------|---------|-------|--------|
| Gaúcho | 412 | 26,236 | Active |
| Nordestino | 237 | 26,120 | Active |
| Sertanejo | 0 | 0 | **Empty - Candidate for removal** |

### 1.3 Data Quality Issues
| Issue | Count | Percentage |
|-------|-------|------------|
| Songs without lyrics | 12,060 | 23.0% |
| Songs with composer | 134 | 0.26% |
| Potential duplicates | ~14,196 | ~27% |

---

## 2. Codebase Inventory

### 2.1 Edge Functions (62 total)
```
supabase/functions/
├── _shared/                    # Shared utilities (CORS, helpers)
├── add-text-correction/        # Active - Text normalization
├── admin-reset-user-password/  # Active - Admin tool
├── analyze-and-suggest-fixes/  # Active - AI analysis
├── analyze-duplicates/         # ⚠️ Candidate for removal
├── annotate-artist-songs/      # Active - Main annotation orchestrator
├── annotate-pos-gemini/        # Active - POS tagging Layer 4
├── annotate-pos/               # Active - POS tagging hybrid
├── annotate-semantic-domain/   # Active - Semantic classification
├── annotate-semantic/          # ⚠️ Legacy - Consider consolidation
├── annotate-single-song/       # Active - Individual song annotation
├── apply-corpus-metadata/      # Active - Metadata application
├── assign-cultural-insignias/  # Active - Cultural markers
├── batch-populate-semantic-cache/ # Active - Cache population
├── batch-seed-semantic-lexicon/   # Active - Lexicon seeding
├── calculate-priority-score/   # Active - Priority calculation
├── cancel-dictionary-job/      # Active - Job management
├── clean-temp-storage/         # Active - Cleanup
├── clear-all-dictionaries/     # Active - Admin tool
├── clear-dictionary/           # Active - Admin tool
├── clear-music-catalog/        # Active - Admin tool
├── clear-song-metadata/        # Active - Admin tool
├── deduplicate-songs/          # Active - Deduplication
├── enrich-music-data/          # Active - Metadata enrichment
├── enrich-semantic-level/      # Active - Semantic depth enrichment
├── extract-music-titles/       # Active - Title extraction
├── generate-artist-bio/        # Active - Biography generation
├── get-job-songs-progress/     # Active - Progress tracking
├── get-lexicon-stats/          # Active - Statistics
├── health-aggregator/          # Active - Health checks
├── health-check-lexicon/       # Active - Lexicon health
├── import-dialectal-backend/   # Active - Dictionary import
├── import-gutenberg-backend/   # Active - Dictionary import
├── import-navarro-backend/     # Active - Dictionary import
├── import-rocha-pombo-backend/ # Active - Dictionary import
├── monitor-and-alert/          # Active - Monitoring
├── process-corpus-analysis/    # Active - Analysis processing
├── process-demo-corpus/        # Active - Demo processing
├── process-dialectal-dictionary/ # Active - Dictionary processing
├── process-gutenberg-dictionary/ # Active - Dictionary processing
├── process-music-data/         # Active - Music processing
├── process-nordestino-corpus/  # Active - Corpus processing
├── process-nordestino-navarro/ # Active - Corpus processing
├── process-pending-jobs/       # Active - Job queue
├── process-rocha-pombo-dictionary/ # Active - Dictionary processing
├── process-single-song-demo/   # Active - Demo processing
├── process-single-song/        # Active - Single song
├── reclassify-mg-words/        # Active - MG refinement
├── recover-stalled-jobs/       # Active - Job recovery
├── refine-quiz-question/       # Active - Quiz AI refinement
├── refine-tagset-suggestions/  # Active - Tagset suggestions
├── reprocess-unclassified/     # Active - NC reprocessing
├── scan-codebase-realtime/     # ⚠️ Candidate for removal
├── semantic-chat-assistant/    # Active - Chat assistant
├── send-critical-alert/        # Active - Alerting
├── send-invite-email/          # Active - Email invites
├── send-invite-magic-link/     # Active - Magic links
├── suggest-tagset-merge/       # Active - Merge suggestions
├── sync-construction-log/      # ⚠️ Candidate for removal
├── test-sentry-error/          # Active - Testing
├── validate-lexicon-batch/     # Active - Validation
```

### 2.2 Frontend Hooks (97 total)
**Categories:**
- Authentication: `useAuth`, `useFeatureAccess`
- Data Fetching: `useCatalogData`, `useArtistSongs`, `useCorpusData`
- Semantic: `useSemanticAnnotation*`, `useSemanticPipelineStats`
- Admin: `useDictionaryImportJobs`, `useQuizQuestions`
- UI/UX: `useTour` variants, `useAchievements`

### 2.3 Pages (36 total)
**Active Pages:** 35
**Archived:** `src/pages/_archived/` (legacy dashboards)

### 2.4 Contexts (11 total)
```
AuthContext         - Authentication state
BatchProcessingContext - Batch operations
CorpusContext       - Corpus selection
DashboardAnaliseContext - Analysis state
ProcessingContext   - Processing state
QuizContext         - Quiz state
ResultsContext      - Results state
SubcorpusContext    - Subcorpus selection
ThemeContext        - Theme management
ToolsContext        - Tools state
WorkflowContext     - Workflow state
```

### 2.5 Services (35 total)
**Active:** 34
**Deprecated:** `_DEPRECATED_demoCorpusService.ts`

---

## 3. Known Issues to Address

### 3.1 Critical (Must Fix)
- [ ] Mock data in `corpusDataService.ts` (Math.random for LL/MI)
- [ ] ~14k song duplicates
- [ ] 12k songs without lyrics
- [ ] Empty Sertanejo corpus

### 3.2 High Priority
- [ ] CORS duplication across 61 edge functions
- [ ] 538 console.log statements in hooks
- [ ] Memory leaks in 6+ hooks (missing interval cleanup)
- [ ] config.toml references non-existent functions

### 3.3 Medium Priority
- [ ] Consolidate annotation edge functions
- [ ] Consolidate backend loggers
- [ ] Security: extensions in public schema
- [ ] Security: materialized view exposed

### 3.4 Low Priority
- [ ] Remove deprecated services
- [ ] Archive unused edge functions
- [ ] Standardize naming conventions

---

## 4. Config.toml Backup

```toml
# Snapshot of supabase/config.toml at 2024-12-02
project_id = "kywmhuubbsvclkorxrse"

[functions.annotate-single-song]
verify_jwt = false

[functions.extract-music-titles]
verify_jwt = false
timeout = 300

[functions.process-music-data]
verify_jwt = false

[functions.enrich-music-data]
verify_jwt = false

# ... (full content preserved in actual config.toml)
```

---

## 5. Dependency Map (Critical Paths)

### 5.1 Semantic Annotation Pipeline
```
User Action
    ↓
useSemanticAnnotationCatalog (hook)
    ↓
annotate-artist-songs (edge function)
    ↓
├── annotate-semantic-domain (classification)
├── annotate-pos (POS tagging)
└── semantic_disambiguation_cache (storage)
```

### 5.2 Music Enrichment Pipeline
```
User Action
    ↓
useEnrichment (hook)
    ↓
enrich-music-data (edge function)
    ↓
├── YouTube API (Layer 1)
├── GPT-5 (Layer 2)
├── Google Grounding (Layer 3)
└── Cross-Validation (Layer 4)
    ↓
songs table (persistence)
```

### 5.3 Authentication Flow
```
AuthContext
    ↓
useAuth (hook)
    ↓
├── Supabase Auth
├── user_roles table
└── invite_keys table
```

---

## 6. Refactoring Sprint Status

| Sprint | Description | Status | Risk |
|--------|-------------|--------|------|
| Sprint 0 | Audit & Backup | ✅ Complete | Zero |
| Sprint 1 | Critical Data Fixes | 🔲 Pending | Medium |
| Sprint 2 | Infrastructure Fixes | 🔲 Pending | Low |
| Sprint 3 | Context & State Fixes | 🔲 Pending | Medium |
| Sprint 4 | Code Cleanup | 🔲 Pending | Low |
| Sprint 5 | Security Fixes | 🔲 Pending | Low |
| Sprint 6 | Performance Optimization | 🔲 Pending | Low |
| Sprint 7 | Documentation | ✅ Complete | Zero |

---

**Next Steps:** Proceed with Sprint 1 (Critical Data Fixes) or Sprint 4 (Code Cleanup)
