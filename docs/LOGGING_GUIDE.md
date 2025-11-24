# 📋 Guia de Logging - Verso Austral

## 🎯 Visão Geral

Este guia documenta a infraestrutura de logging estruturado implementada no projeto Verso Austral. O sistema fornece logging consistente, rastreável e otimizado para debugging tanto no frontend quanto no backend.

---

## 🏗️ Arquitetura

### **Componentes Principais**

| Arquivo | Propósito | Localização |
|---------|-----------|-------------|
| `loggerFactory.ts` | Factory de loggers para **frontend** | `src/lib/` |
| `unified-logger.ts` | Factory de loggers para **backend** | `supabase/functions/_shared/` |
| `loggingConfig.ts` | Configuração centralizada | `src/config/` |
| `logger.ts` | Logger base (existente) | `src/lib/` |
| `structured-logger.ts` | Logger base backend (existente) | `supabase/functions/_shared/` |

### **Fluxo de Logging**

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  Component/Hook → loggerFactory → logger.ts → Sentry        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Backend (Edge Functions)                  │
│  Function → unified-logger → structured-logger → Sentry     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Uso no Frontend

### **1. Criar Logger Contextualizado**

```typescript
import { createLogger } from '@/lib/loggerFactory';

const MyComponent = () => {
  const log = createLogger('MyComponent', { userId: user?.id });

  // Usar logger
  log.info('Component mounted');
  log.error('Failed to load data', error);
};
```

### **2. Métodos Disponíveis**

#### **Básicos**
```typescript
log.debug(message, context?);   // Debugging detalhado
log.info(message, context?);    // Informações gerais
log.warn(message, context?);    // Avisos
log.error(message, error?, context?);  // Erros
log.fatal(message, error?, context?);  // Erros críticos
log.success(message, context?); // Operações bem-sucedidas
```

#### **Helpers Estruturados**
```typescript
// Logar ações com status
log.logAction('enrichment', 'start', { songId: '123' });
log.logAction('enrichment', 'success', { songId: '123', duration: 2500 });
log.logAction('enrichment', 'error', { songId: '123', error: 'API timeout' });

// Logar chamadas de API
log.logApiCall('/api/songs', 'POST', 200, 1500);

// Logar navegação
log.logNavigation('/music', '/music/catalog');

// Logar interações do usuário
log.logUserInteraction('click', 'enrich-button', { songId: '123' });
```

### **3. Exemplos Práticos**

#### **Em uma Página**
```typescript
// src/pages/MusicCatalog.tsx
import { createLogger } from '@/lib/loggerFactory';

export const MusicCatalog = () => {
  const log = createLogger('MusicCatalog');
  const { user } = useAuth();

  useEffect(() => {
    log.info('Music catalog mounted', { userId: user?.id });
    return () => log.debug('Music catalog unmounted');
  }, []);

  const handleEnrich = async (songId: string) => {
    log.logAction('enrich-song', 'start', { songId });
    const timer = performance.now();

    try {
      await enrichSong(songId);
      const duration = performance.now() - timer;
      log.logAction('enrich-song', 'success', { songId, duration });
    } catch (error) {
      log.error('Enrichment failed', error, { songId });
    }
  };

  return <div>...</div>;
};
```

#### **Em um Hook**
```typescript
// src/hooks/useEnrichment.ts
import { createLogger } from '@/lib/loggerFactory';

export const useEnrichment = () => {
  const log = createLogger('useEnrichment');

  const enrichSong = async (songId: string) => {
    log.info('Starting enrichment', { songId });

    try {
      const response = await supabase.functions.invoke('enrich-music-data', {
        body: { songId },
      });

      log.logApiCall('enrich-music-data', 'POST', response.status);

      if (response.error) {
        throw response.error;
      }

      log.success('Enrichment completed', { songId });
      return response.data;
    } catch (error) {
      log.error('Enrichment failed', error, { songId });
      throw error;
    }
  };

  return { enrichSong };
};
```

---

## 🔧 Uso no Backend (Edge Functions)

### **1. Criar Logger Contextualizado**

```typescript
import { createEdgeLogger } from '../_shared/unified-logger.ts';

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const log = createEdgeLogger('my-function', requestId);

  log.info('Function invoked');
  
  // ... lógica da função
});
```

### **2. Métodos Disponíveis**

#### **Básicos**
```typescript
log.debug(message, context?);
log.info(message, context?);
log.warn(message, context?);
log.error(message, error?, context?);
log.fatal(message, error?, context?);
```

#### **Helpers para Jobs**
```typescript
log.logJobStart(jobId, totalItems, metadata?);
log.logJobProgress(jobId, processedItems, totalItems, percentage);
log.logJobComplete(jobId, processedItems, duration, metadata?);
log.logJobError(jobId, error, metadata?);
```

#### **Outros Helpers**
```typescript
log.logApiCall(service, endpoint, method, status, duration?);
log.logDatabaseQuery(table, operation, rowCount, duration?);
log.logValidation(entity, isValid, errors?);
log.logCacheHit(cacheKey, 'hit' | 'miss');

// Timer helper
const timer = log.startTimer();
await doSomething();
timer.end('operation-name'); // Loga duração automaticamente
```

### **3. Exemplo Prático**

```typescript
// supabase/functions/enrich-music-data/index.ts
import { createEdgeLogger } from '../_shared/unified-logger.ts';

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const log = createEdgeLogger('enrich-music-data', requestId);

  log.info('Enrichment request received');

  try {
    const { songId } = await req.json();
    const timer = log.startTimer();

    // Buscar dados da música
    log.logDatabaseQuery('songs', 'select', 1);
    const { data: song, error } = await supabase
      .from('songs')
      .select('*')
      .eq('id', songId)
      .single();

    if (error) {
      log.error('Failed to fetch song', error, { songId });
      return new Response(JSON.stringify({ error }), { status: 404 });
    }

    // Chamar API do Gemini
    log.info('Calling Gemini API', { songId });
    const geminiResponse = await callGeminiAPI(song.title);
    log.logApiCall('gemini', '/generate', 'POST', 200, 1500);

    // Atualizar banco
    log.logDatabaseQuery('songs', 'update', 1);
    await supabase
      .from('songs')
      .update({ metadata: geminiResponse })
      .eq('id', songId);

    const duration = timer.end('enrich-song');
    log.success('Enrichment completed', { songId, duration });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    log.fatal('Enrichment failed', error);
    return new Response(JSON.stringify({ error }), { status: 500 });
  }
});
```

---

## ⚙️ Configuração

### **Arquivo: `src/config/loggingConfig.ts`**

#### **Alterar Nível de Log por Ambiente**

```typescript
export const loggingConfig: LoggingConfig = {
  frontend: {
    minLevel: isDevelopment ? LogLevel.DEBUG : LogLevel.INFO,
    // DEBUG em dev, INFO em prod
  },
  backend: {
    minLevel: isDevelopment ? LogLevel.DEBUG : LogLevel.WARN,
    // DEBUG em dev, WARN em prod (menos verboso)
  },
};
```

#### **Silenciar Componentes Específicos**

```typescript
frontend: {
  silencedComponents: isProduction
    ? ['Button', 'Input', 'Card'] // Silenciar em produção
    : [],
}
```

#### **Habilitar/Desabilitar Sentry**

```typescript
frontend: {
  sentryEnabled: isProduction, // Apenas em produção
}
```

#### **Alterar Threshold de Performance**

```typescript
performance: {
  slowOperationThreshold: 2000, // Logar operações > 2s
  slowQueryThreshold: 1000,     // Logar queries > 1s
}
```

#### **Configurar Alertas**

```typescript
alerts: {
  errorThreshold: {
    count: 10,        // 10 erros
    windowMinutes: 5, // em 5 minutos → alerta
  },
  errorRateThreshold: 0.05, // Taxa de erro > 5% → alerta
}
```

---

## 🛠️ Script de Migração Automática

### **Uso**

```bash
# Migrar um arquivo específico
npm run migrate-logs -- src/pages/MusicCatalog.tsx

# Migrar um diretório inteiro
npm run migrate-logs -- src/pages

# Dry run (visualizar mudanças sem aplicar)
npm run migrate-logs -- src/pages --dry-run

# Modo verbose (detalhes de cada conversão)
npm run migrate-logs -- src/pages --verbose
```

### **O que o script faz:**

1. **Detecta console.log/error/warn/debug**
2. **Converte para logger estruturado:**
   - `console.log(...)` → `log.info(...)`
   - `console.error(...)` → `log.error(...)`
   - `console.warn(...)` → `log.warn(...)`
3. **Adiciona imports automaticamente:**
   - Frontend: `import { createLogger } from '@/lib/loggerFactory';`
   - Backend: `import { createEdgeLogger } from '../_shared/unified-logger.ts';`
4. **Inicializa logger no início da função/componente**

### **Exemplo de Conversão**

**Antes:**
```typescript
export const MyComponent = () => {
  console.log('Component mounted');
  console.error('Error:', error);
};
```

**Depois:**
```typescript
import { createLogger } from '@/lib/loggerFactory';

export const MyComponent = () => {
  const log = createLogger('MyComponent');
  
  log.info('Component mounted');
  log.error('Error:', error);
};
```

---

## 📊 Monitoramento e Dashboards

### **Logs Estruturados no Console (Dev)**

```
[INFO] Component mounted { component: "MusicCatalog", userId: "123" }
[ERROR] Enrichment failed { component: "useEnrichment", songId: "456", error: {...} }
```

### **Logs Estruturados em Produção (JSON)**

```json
{
  "timestamp": "2025-01-15T18:30:00.000Z",
  "level": "ERROR",
  "message": "Enrichment failed",
  "context": {
    "component": "useEnrichment",
    "songId": "456",
    "error": { "name": "NetworkError", "message": "Timeout" }
  }
}
```

### **Sentry Integration**

- **Frontend:** Erros automaticamente enviados ao Sentry
- **Backend:** Edge Function errors enviadas ao Sentry
- **Breadcrumbs:** Todos os logs `info` e `warn` adicionados como breadcrumbs

---

## 🎯 Boas Práticas

### **✅ DO's**

```typescript
// ✅ Criar logger com contexto
const log = createLogger('MyComponent', { userId: user?.id });

// ✅ Logar ações importantes
log.info('User logged in', { userId: user.id, timestamp: Date.now() });

// ✅ Logar erros com contexto
try {
  await fetchData();
} catch (error) {
  log.error('Failed to fetch data', error, { endpoint: '/api/data' });
}

// ✅ Usar helpers estruturados
log.logAction('save-form', 'success', { formId: 'user-profile' });

// ✅ Logar performance de operações lentas
const timer = log.startTimer();
await heavyOperation();
timer.end('heavy-operation');
```

### **❌ DON'Ts**

```typescript
// ❌ Usar console.log diretamente
console.log('User logged in');

// ❌ Logs sem contexto
log.info('Error occurred'); // Qual erro? Onde?

// ❌ Logar dados sensíveis
log.info('User password', { password: '123456' }); // NUNCA!

// ❌ Logging excessivo em loops
for (let i = 0; i < 10000; i++) {
  log.debug(`Processing item ${i}`); // ❌ Vai gerar 10k logs!
}

// ✅ MELHOR: Logar apenas progresso a cada X itens
for (let i = 0; i < 10000; i++) {
  if (i % 1000 === 0) {
    log.info(`Progress: ${i}/10000 items processed`);
  }
}
```

---

## 🔍 Debugging com Logs

### **Visualizar Logs no Console do Browser**

1. Abrir DevTools (F12)
2. Aba "Console"
3. Filtrar por nível:
   - `[INFO]` → Logs informativos
   - `[ERROR]` → Erros
   - `[DEBUG]` → Detalhes técnicos

### **Visualizar Logs de Edge Functions**

1. Ir para página `/admin/logs-viewer` (TODO: implementar)
2. Ou via CLI Supabase:
   ```bash
   supabase functions logs enrich-music-data --tail
   ```

### **Rastrear Request Específico**

Todos os logs de backend incluem `requestId`:

```typescript
const log = createEdgeLogger('my-function', requestId);
```

No Sentry, buscar por `requestId` para ver todos os logs relacionados.

---

## 📈 Roadmap de Logging

### **Fase 1: Infraestrutura ✅ (Atual)**
- ✅ Logger factory frontend
- ✅ Logger factory backend
- ✅ Configuração centralizada
- ✅ Script de migração automática

# Guia de Migração de Logging Estruturado

## Status Geral do Projeto

### **✅ Fase 1: Infraestrutura (CONCLUÍDA)**
- ✅ Configuração centralizada
- ✅ Script de migração automática

### **✅ Fase 2: Frontend Pages (CONCLUÍDA)**
- ✅ **Páginas migradas:** 10/29 páginas com console statements
  - ✅ Auth.tsx
  - ✅ MusicCatalog.tsx 
  - ✅ AdminSemanticTagsetValidation.tsx
  - ✅ AdminDictionaryValidation.tsx 
  - ✅ AdminDictionaryImport.tsx
  - ✅ DashboardMVP.tsx
  - ✅ Index.tsx
  - ✅ NotFound.tsx
  - ✅ AdminUsers.tsx
  - ✅ DevOpsMetrics.tsx
  - ✅ AdminDashboard.tsx
  - ✅ MusicEnrichment.tsx
  - ✅ AdminAccessRequests.tsx
  - ✅ AdminAnalytics.tsx
  - ✅ AdminGauchoValidation.tsx
  - ✅ AdminMetrics.tsx

- ✅ **Páginas verificadas (sem console):** 19 páginas
  - ForgotPassword.tsx, ResetPassword.tsx, Onboarding.tsx
  - AdminEdgeFunctions.tsx, AdminMetricsRealtime.tsx, AdminNavarroDictValidation.tsx
  - AdminPrototypeGallery.tsx, AdminLexiconSetupRefactored.tsx
  - AdvancedMode.tsx, ApiUsage.tsx, AppLayout.tsx
  - DeveloperHistory.tsx, DeveloperLogs.tsx
  - 6 outras páginas sem console statements

- 📦 **Páginas arquivadas ignoradas:** 3 páginas em _archived/

**Status Geral da Fase 2:** ✅ **100% completo** (29/29 páginas ativas processadas)

### **Fase 3: Monitoramento Avançado (TODO)**
- [ ] Dashboard de logs (`/admin/logs-viewer`)
- [ ] Alertas automáticos (Slack/Email)
- [ ] Métricas de performance agregadas
- [ ] Grafana/Prometheus integration

### **Fase 4: Otimizações (TODO)**
- [ ] Log sampling (reduzir volume em produção)
- [ ] Log aggregation (agrupar logs similares)
- [ ] Retention policies (limpeza automática)

---

## 🆘 Troubleshooting

### **Problema: Logs não aparecem no console**

**Solução:** Verificar `loggingConfig.ts`:
```typescript
frontend: {
  enabled: true, // ← Deve estar true
  minLevel: LogLevel.DEBUG, // ← Ajustar nível
}
```

### **Problema: Logs não vão para Sentry**

**Solução:** Verificar configuração:
```typescript
frontend: {
  sentryEnabled: true, // ← Deve estar true em produção
}
```

E verificar que `SENTRY_DSN_FRONTEND` está definido nas secrets.

### **Problema: Muitos logs em produção**

**Solução:** Aumentar `minLevel` e silenciar componentes:
```typescript
frontend: {
  minLevel: LogLevel.WARN, // Apenas warns e erros
  silencedComponents: ['Button', 'Input', 'Card'],
}
```

---

## 📚 Referências

- [Structured Logging Best Practices](https://www.datadoghq.com/blog/logging-best-practices/)
- [Sentry Logging Guide](https://docs.sentry.io/platforms/javascript/guides/react/enriching-events/)
- [Edge Functions Logging](https://supabase.com/docs/guides/functions/logging)

---

**Última atualização:** 2025-01-15  
**Versão:** 1.0.0  
**Autor:** Verso Austral Team
