# 🧪 Sentry Smoke Tests Guide

## **Quick Start Testing**

After implementing Sentry integration, use the built-in smoke test buttons (visible only in development mode):

### **1. Frontend Error Test**
1. Open the application in **development mode** (`npm run dev`)
2. Look for the **red testing panel** in the bottom-left corner
3. Click **"Force Frontend Error"** button
4. You should see:
   - ✅ Toast notification: "Error Sent to Sentry"
   - ✅ Console log: "✅ Test error captured and sent to Sentry"
   - ✅ Error appears in Sentry dashboard within 30 seconds

**Note:** Event handler errors (like `onClick`) are **not caught by React Error Boundaries**. They must be manually captured using `captureException()` to send to Sentry.

### **2. Backend Error Test**
1. Click **"Force Backend Error"** button in the test panel
2. You should see:
   - ✅ Edge function returns 500 error
   - ✅ Error logged to Supabase Edge Function logs
   - ✅ Error appears in Sentry backend dashboard within 30 seconds

---

## **Manual Testing Without Test Panel**

### **Frontend Manual Test**
```javascript
// Open browser console and paste:
throw new Error('Manual Sentry Frontend Test');
```

### **Backend Manual Test**
```bash
# Call test-sentry-error edge function
curl -X POST https://kywmhuubbsvclkorxrse.supabase.co/functions/v1/test-sentry-error \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5d21odXViYnN2Y2xrb3J4cnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNDY4OTcsImV4cCI6MjA3ODgyMjg5N30.XFZgYLAG2YLM2YiEsw_aFBamtR1y8llKXYJq5Yq8h64" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## **Verifying Errors in Sentry Dashboard**

### **Step 1: Access Sentry**
1. Login to https://sentry.io
2. Navigate to your **Verso Austral** project
3. Go to **Issues** tab

### **Step 2: Verify Frontend Error**
Look for error with:
- **Title:** "🧪 Sentry Frontend Smoke Test - This is a deliberate error"
- **Tags:**
  - `test_type`: `smoke_test`
  - `trigger`: `manual_button_click`
  - `category`: `frontend_test`
  - `feature`: (detected from URL, e.g., `music-catalog`)
  - `user_role`: (e.g., `admin` or `anonymous`)
  - `browser`: (e.g., `Chrome`)
- **Context:**
  - Stack trace pointing to `SentrySmokeTest.tsx`
  - URL where error occurred
  - User agent
  - Timestamp

### **Step 3: Verify Backend Error**
Look for error with:
- **Title:** "🧪 Sentry Backend Smoke Test - This is a deliberate error"
- **Tags:**
  - `function`: `test-sentry-error`
  - `edge_function`: `true`
  - `severity`: `high`
- **Context:**
  - `requestId`: UUID
  - `test_type`: `smoke_test`
  - Timestamp

---

## **Expected Timeline**

| Event | Time |
|-------|------|
| Error triggered | T+0s |
| Error sent to Sentry API | T+1-2s |
| Error appears in dashboard | T+5-30s |
| Alert notification sent (if configured) | T+1-5min |

---

## **Troubleshooting**

### **Error not appearing in Sentry:**

1. **Check DSN configuration:**
   ```bash
   # Frontend
   echo $VITE_SENTRY_DSN_FRONTEND
   
   # Backend (in Supabase dashboard)
   # Secrets → SENTRY_DSN_BACKEND
   ```

2. **Check Sentry initialization:**
   - Open browser console
   - Look for message: "Sentry initialized" or "Sentry DSN not configured"
   - If DSN warning appears, add the secret

3. **Check sample rate:**
   - In production, only 20% of events are captured
   - Override temporarily: `tracesSampleRate: 1.0` in `src/lib/sentry.ts`

4. **Check network:**
   - Open browser DevTools → Network tab
   - Look for requests to `sentry.io`
   - Should show 200 OK status

### **Error Boundary not catching error:**

1. Error Boundaries only catch errors in:
   - Render phase
   - Lifecycle methods
   - Constructors

2. Error Boundaries do NOT catch:
   - Async errors (use try/catch)
   - Event handlers (use try/catch)
   - Errors in Error Boundary itself

3. Verify Error Boundary is wrapping the component:
```tsx
<ErrorBoundary>
  <ComponentThatMightError />
</ErrorBoundary>
```

### **Backend error not appearing:**

1. **Check edge function deployed:**
   ```bash
   # Verify function exists
   curl https://kywmhuubbsvclkorxrse.supabase.co/functions/v1/test-sentry-error
   ```

2. **Check Supabase logs:**
   - Go to Lovable Cloud → Edge Functions
   - Select `test-sentry-error`
   - Check logs for "Test error captured"

3. **Check Sentry DSN secret:**
   - Ensure `SENTRY_DSN_BACKEND` is configured in project secrets

---

## **Success Criteria**

✅ **Smoke tests passed when:**
- Frontend error appears in Sentry Issues within 30 seconds
- Backend error appears in Sentry Issues within 30 seconds
- Error Boundary renders fallback UI on frontend error
- All expected tags are present (feature, severity, function)
- Stack traces are readable and complete
- Alert notifications are sent (if configured)

---

## **Next Steps After Successful Tests**

1. **Remove test panel from production:**
   - Test panel only renders in dev mode (`import.meta.env.PROD` check)
   - Safe to leave in code

2. **Configure alert rules:**
   - Follow instructions in `SENTRY_INTEGRATION.md`
   - Set up email/Slack notifications

3. **Monitor for real errors:**
   - Check dashboard daily for first week
   - Tune alert thresholds based on baseline

4. **Optional: Delete test edge function:**
   ```bash
   # After confirming Sentry works
   rm -rf supabase/functions/test-sentry-error
   ```

---

**Status**: Ready for testing ✅  
**Estimated test duration**: 5-10 minutes  
**Last Updated**: 2025-01-24
