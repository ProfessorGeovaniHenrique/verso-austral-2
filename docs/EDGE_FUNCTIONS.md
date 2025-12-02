# ⚡ Edge Functions Documentation

## Overview

Verso Austral uses 62 Supabase Edge Functions organized by domain.

---

## Function Categories

### 🎵 Music & Corpus Processing

| Function | Purpose | JWT | Status |
|----------|---------|-----|--------|
| `extract-music-titles` | Extract titles from corpus files | No | Active |
| `process-music-data` | Process imported music data | No | Active |
| `process-corpus-analysis` | Run corpus analysis | No | Active |
| `process-nordestino-corpus` | Process Nordestino corpus | No | Active |
| `process-nordestino-navarro` | Process Navarro variant | Yes | Active |
| `process-demo-corpus` | Demo corpus processing | No | Active |
| `process-single-song` | Process individual song | No | Active |
| `process-single-song-demo` | Demo single song processing | No | Active |
| `deduplicate-songs` | Remove duplicate songs | No | Active |
| `clear-music-catalog` | Clear music catalog | No | Active |
| `clear-song-metadata` | Clear song metadata | No | Active |

### 🧠 Semantic Annotation

| Function | Purpose | JWT | Status |
|----------|---------|-----|--------|
| `annotate-artist-songs` | Main annotation orchestrator | No | **Primary** |
| `annotate-single-song` | Single song annotation | No | Active |
| `annotate-semantic-domain` | Semantic domain classification | No | Active |
| `annotate-semantic` | Legacy semantic annotation | No | ⚠️ Consolidate |
| `annotate-pos` | POS tagging (hybrid 4-layer) | No | Active |
| `annotate-pos-gemini` | POS tagging via Gemini | No | Active |
| `assign-cultural-insignias` | Cultural marker assignment | No | Active |
| `reclassify-mg-words` | Reclassify grammatical markers | No | Active |
| `reprocess-unclassified` | Reprocess NC words | No | Active |
| `enrich-semantic-level` | Enrich semantic depth | No | Active |
| `batch-populate-semantic-cache` | Batch cache population | No | Active |
| `batch-seed-semantic-lexicon` | Seed semantic lexicon | No | Active |

### 📚 Dictionary Import

| Function | Purpose | JWT | Status |
|----------|---------|-----|--------|
| `import-gutenberg-backend` | Import Gutenberg dictionary | Yes | Active |
| `import-dialectal-backend` | Import dialectal dictionary | Yes | Active |
| `import-navarro-backend` | Import Navarro dictionary | Yes | Active |
| `import-rocha-pombo-backend` | Import Rocha Pombo | Yes | Active |
| `process-gutenberg-dictionary` | Process Gutenberg entries | No | Active |
| `process-dialectal-dictionary` | Process dialectal entries | No | Active |
| `process-rocha-pombo-dictionary` | Process Rocha Pombo | No | Active |
| `clear-dictionary` | Clear specific dictionary | No | Active |
| `clear-all-dictionaries` | Clear all dictionaries | No | Active |

### 🎯 Enrichment

| Function | Purpose | JWT | Status |
|----------|---------|-----|--------|
| `enrich-music-data` | 5-layer metadata enrichment | No | Active |
| `generate-artist-bio` | Generate artist biographies | No | Active |
| `apply-corpus-metadata` | Apply metadata to corpus | No | Active |

### 📊 Statistics & Monitoring

| Function | Purpose | JWT | Status |
|----------|---------|-----|--------|
| `get-lexicon-stats` | Lexicon statistics | No | Active |
| `get-job-songs-progress` | Job progress tracking | No | Active |
| `health-aggregator` | Aggregate health checks | No | Active |
| `health-check-lexicon` | Lexicon health check | No | Active |
| `monitor-and-alert` | System monitoring | No | Active |
| `calculate-priority-score` | Priority scoring | No | Active |

### 🔧 Job Management

| Function | Purpose | JWT | Status |
|----------|---------|-----|--------|
| `process-pending-jobs` | Process job queue | No | Active |
| `recover-stalled-jobs` | Recover stuck jobs | No | Active |
| `cancel-dictionary-job` | Cancel dictionary job | No | Active |
| `clean-temp-storage` | Clean temporary storage | No | Active |

### 👥 User & Admin

| Function | Purpose | JWT | Status |
|----------|---------|-----|--------|
| `admin-reset-user-password` | Admin password reset | Yes | Active |
| `send-invite-email` | Send invitation email | No | Active |
| `send-invite-magic-link` | Send magic link | Yes | Active |
| `send-critical-alert` | Send critical alerts | No | Active |

### 🎓 Educational

| Function | Purpose | JWT | Status |
|----------|---------|-----|--------|
| `refine-quiz-question` | AI quiz refinement | Yes | Active |
| `semantic-chat-assistant` | Chat assistant | Yes | Active |

### 🏷️ Tagset Management

| Function | Purpose | JWT | Status |
|----------|---------|-----|--------|
| `refine-tagset-suggestions` | Refine tagset suggestions | No | Active |
| `suggest-tagset-merge` | Suggest tagset merges | No | Active |
| `validate-lexicon-batch` | Batch lexicon validation | No | Active |

### 🔬 Analysis & Debug

| Function | Purpose | JWT | Status |
|----------|---------|-----|--------|
| `analyze-and-suggest-fixes` | AI code analysis | No | Active |
| `analyze-duplicates` | Duplicate analysis | No | ⚠️ Remove |
| `scan-codebase-realtime` | Realtime code scanning | No | ⚠️ Remove |
| `sync-construction-log` | Sync construction log | No | ⚠️ Remove |
| `test-sentry-error` | Sentry error testing | No | Active |
| `add-text-correction` | Add text corrections | Yes | Active |

---

## Shared Modules

### `_shared/` Directory
```
_shared/
├── cors.ts              # CORS headers (TO BE CREATED)
├── helpers.ts           # Common helpers
├── llm-client.ts        # AI model client
├── pos-enrichment.ts    # POS enrichment logic
├── semantic-rules-lexicon.ts  # Rule-based classification
├── structured-logger.ts # Logging utilities
├── text-normalizer.ts   # Text normalization
├── unified-logger.ts    # Unified logging
└── ... (other utilities)
```

---

## Function Patterns

### Standard Structure
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { param } = await req.json();
    
    // Business logic
    const result = await processData(param);
    
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[function-name] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

### Self-Invoking Pattern (Long Jobs)
```typescript
// Process chunk
const result = await processChunk(data);

// Self-invoke for next chunk if not complete
if (!isComplete) {
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/same-function`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
    body: JSON.stringify({ jobId, offset: nextOffset })
  });
}
```

---

## Deprecation Candidates

| Function | Reason | Action |
|----------|--------|--------|
| `analyze-duplicates` | Superseded by SQL deduplication | Remove |
| `scan-codebase-realtime` | Not in use | Remove |
| `sync-construction-log` | Legacy feature | Remove |
| `annotate-semantic` | Replaced by `annotate-semantic-domain` | Consolidate |

---

## Performance Notes

### Timeout Limits
- Default: 60 seconds
- Extended: 300 seconds (extract-music-titles)
- Chunk size: 50 words per invocation for semantic annotation

### Rate Limits
- Gemini API: Managed via batch processing (15 words/call)
- YouTube API: 10,000 daily quota
- GPT-5: Via Lovable AI Gateway (no explicit limit)

### Connection Pooling
- Avoid parallel database queries in loops
- Use aggregated queries with `.in()` operator
- Single connection per function invocation
