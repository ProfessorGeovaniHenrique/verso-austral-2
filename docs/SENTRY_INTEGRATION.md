# Sentry Integration - Production Monitoring Guide

## 📊 Overview

Verso Austral has **complete Sentry integration** for both frontend and backend, providing:
- ✅ **Automatic error capture** with context
- ✅ **Performance monitoring** for slow operations (>3s)
- ✅ **Error Boundaries** for graceful degradation
- ✅ **Strategic tagging** for filtering (feature, user_role, category)
- ✅ **Automatic alerts** for critical errors

---

## 🎯 Architecture

```
┌─────────────────────────────────────────────────┐
│  FRONTEND (React)                               │
│  ├─ src/lib/sentry.ts (init + tags)            │
│  ├─ src/lib/logger.ts (auto performance track) │
│  ├─ ErrorBoundary components                    │
│  └─ Automatic exception capture                 │
└─────────────────────────────────────────────────┘
                    ↓
            [Sentry.io Dashboard]
                    ↑
┌─────────────────────────────────────────────────┐
│  BACKEND (Edge Functions)                       │
│  ├─ _shared/sentry.ts (custom Deno client)     │
│  ├─ _shared/unified-logger.ts (integration)    │
│  └─ Automatic error + breadcrumb capture        │
└─────────────────────────────────────────────────┘
```

---

## 🔧 Frontend Integration

### **Sentry Initialization**

Located in `src/lib/sentry.ts`:

```typescript
initSentry(); // Called in main.tsx
```

**Features:**
- ✅ **Auto-tags**: `feature` (music-catalog, lexicon, etc.), `user_role`, `browser`
- ✅ **Auto-categorization**: auth, database, api, ui
- ✅ **Error filtering**: Ignores transient network errors
- ✅ **Sample rate**: 20% in production (cost optimization)

### **Error Boundaries**

**Global boundary** in `src/App.tsx`:
```typescript
<ErrorBoundary>
  <QueryClientProvider>
    {/* entire app */}
  </QueryClientProvider>
</ErrorBoundary>
```

**Route-specific boundaries**:
```typescript
// src/components/ErrorBoundaryRoute.tsx
<ErrorBoundaryRoute routeName="Music Catalog">
  <MusicCatalogContent />
</ErrorBoundaryRoute>
```

### **Performance Tracking**

Automatic tracking for slow operations (>3s):

```typescript
import { trackPerformance } from '@/lib/sentry';

const start = performance.now();
await heavyOperation();
const duration = performance.now() - start;

// Automatically sent to Sentry if duration > 3s
trackPerformance('heavyOperation', duration, { itemCount: 1000 });
```

**Integrated in logger**:
```typescript
const log = createLogger('MyComponent');

const start = Date.now();
await fetchData();
const duration = Date.now() - start;

// Automatically tracks if slow
log.performanceTrack('fetchData', duration, { userId: 'abc' });
```

---

## 🖥️ Backend Integration

### **Sentry Client**

Custom Deno-compatible client in `supabase/functions/_shared/sentry.ts`:

```typescript
import { captureException, captureMessage, addBreadcrumb } from '../_shared/sentry.ts';

// Capture error with context
captureException(error, {
  functionName: 'annotate-semantic',
  userId: user?.id,
  requestId: '123-456',
  extra: { corpus_type: 'gaucho' },
});
```

### **Integrated in Structured Logger**

All edge functions using `createEdgeLogger` automatically send errors to Sentry:

```typescript
const log = createEdgeLogger('my-function', requestId, userId);

// Automatically captured in Sentry
log.error('Fatal error occurred', error, { stage: 'processing' });
log.fatal('Critical system failure', error);
```

---

## 📋 Strategic Tags Reference

### **Frontend Tags**

| Tag | Values | Usage |
|-----|--------|-------|
| `feature` | music-catalog, lexicon, dictionary, semantic, admin, dashboard, general | Auto-detected from URL |
| `user_role` | admin, teacher, student, anonymous | From localStorage |
| `category` | auth, database, api, ui | Auto-classified by error type |
| `browser` | Chrome, Firefox, Safari, Edge | Auto-detected from user agent |
| `performance` | slow | Added for operations >3s |

### **Backend Tags**

| Tag | Values | Usage |
|-----|--------|-------|
| `function` | annotate-semantic, enrich-youtube-batch, etc. | Function name |
| `severity` | low, medium, high, critical | Manual classification |
| `edge_function` | true | Identifies backend errors |
| `stage` | processing, validation, database, api | Operation stage |

---

## 🚨 Alert Configuration

### **Recommended Sentry Alert Rules**

**Critical (Immediate Email/Slack):**
1. **Error Rate Spike**: Error rate > 5% in 5 minutes
2. **Auth Failures**: Tag `category:auth` with >10 errors in 10 minutes
3. **Database Errors**: Tag `category:database` with severity `fatal`
4. **Edge Function Failures**: Tag `edge_function:true` with >20 errors in 5 minutes

**High (Email within 1 hour):**
1. **Performance Degradation**: Tag `performance:slow` with >50 events in 1 hour
2. **API Quota Issues**: Error message contains "quota" or "rate limit"

**Medium (Daily Digest):**
1. **Recurring Errors**: Same error >100 times in 24 hours
2. **New Error Types**: First-seen errors

### **How to Configure**

1. Go to Sentry dashboard → Alerts → Create Alert Rule
2. Select conditions from above
3. Configure notification channels (email, Slack, webhook)
4. Set frequency limits to avoid alert fatigue

---

## 📈 Custom Dashboard Widgets

### **Recommended Widgets for Verso Austral**

**Performance Overview:**
- Average response time (p50, p95, p99)
- Slow operations count (>3s)
- Top 10 slowest operations

**Error Tracking:**
- Error rate by feature (music-catalog, lexicon, annotation)
- Top 10 most frequent errors
- Error count by edge function

**User Impact:**
- Affected users (last 24h)
- Error sessions vs total sessions
- Geographic distribution of errors

**Business Metrics:**
- Enrichment failures (YouTube, biography, lyrics)
- Annotation job success rate
- API quota usage alerts

---

## 🧪 Testing Your Integration

### **Frontend Smoke Test**

Add temporary test button (dev only):

```typescript
// In any component
{import.meta.env.DEV && (
  <button onClick={() => {
    throw new Error('Test Sentry Frontend');
  }}>
    Test Sentry
  </button>
)}
```

**Expected Result:**
- Error appears in Sentry dashboard within 30s
- Tags present: `feature`, `user_role`, `category:ui`
- Error Boundary renders fallback UI

### **Backend Smoke Test**

Call edge function with forced error:

```bash
curl -X POST https://kywmhuubbsvclkorxrse.supabase.co/functions/v1/test-sentry \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

**Expected Result:**
- Error appears in Sentry backend project
- Tags present: `function:test-sentry`, `edge_function:true`
- Includes `requestId` for tracing

---

## 🔍 Debugging with Sentry

### **Trace a Request End-to-End**

1. **Get requestId from frontend logs:**
```typescript
const log = createLogger('MusicCatalog');
log.info('Enrichment started', { requestId: '123-456' });
```

2. **Search in Sentry:**
   - Go to Issues → Search
   - Filter by `requestId:123-456`
   - View breadcrumbs timeline

3. **Check backend logs:**
   - Supabase Edge Logs → Filter by `123-456`
   - See full request lifecycle

### **Monitor Performance Degradation**

1. Go to Sentry → Performance
2. Filter by tag: `performance:slow`
3. Sort by frequency
4. Identify bottlenecks (e.g., "fetchArtists taking 5s")

---

## 📊 Metrics to Monitor

### **Week 1 Baseline**
- Total errors per day
- P95 response time
- Error rate by feature
- Top 5 error types

### **Ongoing KPIs**
- **Error rate**: < 2% of total requests
- **P95 latency**: < 2 seconds
- **Critical errors**: 0 per day
- **Performance issues**: < 10 per hour

---

## 🛠️ Troubleshooting

### **"Errors not appearing in Sentry"**

1. Check `SENTRY_DSN_FRONTEND` / `SENTRY_DSN_BACKEND` secrets configured
2. Verify `initSentry()` called in `main.tsx`
3. Check browser console for Sentry init errors
4. Confirm sample rate allows event (20% in prod)

### **"Too many events / Quota exceeded"**

1. Increase `ignoreErrors` array in `sentry.ts`
2. Lower `tracesSampleRate` to 10%
3. Add more specific error filters
4. Review alert thresholds (may be too sensitive)

### **"Performance tracking not working"**

1. Ensure `trackPerformance` imported correctly
2. Check operation duration > 3000ms threshold
3. Verify Sentry Performance module enabled
4. Check sample rate for performance (tracesSampleRate)

---

## 🚀 Next Steps (Post-MVP)

1. **Advanced Monitoring**:
   - Session replay for debugging UX issues
   - User feedback widget for error reports
   - Release tracking to identify regression

2. **Alerts Optimization**:
   - Tune thresholds based on Week 1 baseline
   - Add Slack integration for critical alerts
   - Implement on-call rotation

3. **Custom Dashboards**:
   - Executive dashboard (error rate, uptime, users affected)
   - Developer dashboard (top errors, performance bottlenecks)
   - Business dashboard (enrichment success rate, API costs)

---

## 📚 Resources

- [Sentry React Docs](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Performance](https://docs.sentry.io/product/performance/)
- [Custom Dashboards](https://docs.sentry.io/product/dashboards/)
- [Alert Rules](https://docs.sentry.io/product/alerts/alert-types/)

---

**Status**: ✅ **PRODUCTION READY**  
**Coverage**: Frontend (100%) + Backend (100%)  
**Last Updated**: 2025-01-20
