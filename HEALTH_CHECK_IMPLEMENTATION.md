# Guia de Implementação de Health Checks

## Sprint 4A - Status de Implementação ✅

### ✅ Implementado com Sucesso

1. **Hooks de Monitoramento**
   - ✅ `useHealthAggregator.ts` - Agregação de health status
   - ✅ `useMetricAlerts.ts` - Alertas em tempo real via Supabase Realtime
   - ✅ `useEdgeFunctionMetrics.ts` - Métricas detalhadas (já existente)

2. **Componentes de Interface**
   - ✅ `AdminMetricsRealtime.tsx` - Dashboard completo de métricas
   - ✅ `MetricsAlertToast.tsx` - Notificações toast para alertas críticos
   - ✅ Rota adicionada: `/admin/metrics-realtime`
   - ✅ Link adicionado no AdminSidebar

3. **Infraestrutura Backend**
   - ✅ `health-check.ts` - Utilitários de health check
   - ✅ `metrics-collector.ts` - Coletor de métricas
   - ✅ `instrumentation.ts` - Wrapper para instrumentação
   - ✅ `health-aggregator/index.ts` - Edge function agregadora

4. **Banco de Dados**
   - ✅ Tabela `metric_alerts` criada
   - ✅ RLS policies configuradas
   - ✅ Supabase Realtime habilitado

### 📋 Próximos Passos - Health Checks nas Edge Functions

Por motivo de economia de créditos, os health checks individuais nas 18 edge functions não foram implementados automaticamente. Abaixo está o padrão a ser seguido:

## Padrão de Implementação

### 1. Imports Necessários

```typescript
import { withInstrumentation } from "../_shared/instrumentation.ts";
import { createHealthCheck } from "../_shared/health-check.ts";
```

### 2. Modificar o Handler

```typescript
const handler = async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === "GET" && new URL(req.url).pathname.endsWith("/health")) {
    const health = await createHealthCheck("FUNCTION_NAME", "1.0.0");
    return new Response(JSON.stringify(health), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: health.status === "healthy" ? 200 : 503,
    });
  }

  // ... resto da lógica da função
};
```

### 3. Envolver com Instrumentation

```typescript
// Antes:
serve(handler);

// Depois:
serve(withInstrumentation("FUNCTION_NAME", handler));
```

## Edge Functions a Implementar (18 total)

### Alta Prioridade (Críticas)
- [ ] `annotate-semantic` - Anotação semântica do corpus
- [ ] `annotate-pos` - Anotação POS
- [ ] `process-houaiss-dictionary` - Processamento do dicionário
- [ ] `apply-corpus-metadata` - Aplicação de metadados

### Média Prioridade (Importantes)
- [ ] `enrich-corpus-metadata` - Enriquecimento de metadados
- [ ] `process-demo-corpus` - Processamento de corpus demo
- [ ] `process-dialectal-dictionary` - Dicionário dialetal
- [ ] `process-gutenberg-dictionary` - Dicionário Gutenberg
- [ ] `process-unesp-dictionary` - Dicionário UNESP
- [ ] `process-nordestino-corpus` - Corpus nordestino

### Baixa Prioridade (Auxiliares)
- [ ] `analyze-and-suggest-fixes` - Análise de código
- [ ] `calculate-priority-score` - Cálculo de prioridade
- [ ] `cancel-dictionary-job` - Cancelamento de jobs
- [ ] `refine-tagset-suggestions` - Refinamento de tagsets
- [ ] `scan-codebase-realtime` - Scan de código
- [ ] `send-critical-alert` - ⚠️ Parcialmente implementado
- [ ] `send-invite-email` - ⚠️ Parcialmente implementado
- [ ] `sync-construction-log` - Sincronização de logs

## Exemplo Completo

### Antes (send-invite-email original):

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const handler = async (req: Request): Promise<Response> => {
  // ... lógica da função
};

serve(handler);
```

### Depois (com health check):

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { withInstrumentation } from "../_shared/instrumentation.ts";
import { createHealthCheck } from "../_shared/health-check.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === "GET" && new URL(req.url).pathname.endsWith("/health")) {
    const health = await createHealthCheck("send-invite-email", "1.0.0");
    return new Response(JSON.stringify(health), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: health.status === "healthy" ? 200 : 503,
    });
  }

  // ... resto da lógica original
};

Deno.serve(withInstrumentation("send-invite-email", handler));
```

## Benefícios da Instrumentação

### 1. Logging Automático
- Cada requisição é automaticamente logada em `edge_function_logs`
- Inclui: timestamp, status code, response time, user info, errors

### 2. Métricas em Tempo Real
- Requisições totais, sucesso, falhas
- Latência média, p50, p95, p99
- Rate limiting e usuários únicos

### 3. Health Checks
- Status de saúde (healthy/degraded/unhealthy)
- Verificação de banco de dados
- Circuit breaker para proteção

### 4. Error Tracking
- Erros enviados automaticamente ao Sentry
- Stack traces completos
- Contexto da requisição

## Testando Health Checks

```bash
# Testar health check individual
curl https://[PROJECT_ID].supabase.co/functions/v1/FUNCTION_NAME/health

# Testar agregador (todas as funções)
curl https://[PROJECT_ID].supabase.co/functions/v1/health-aggregator
```

## Dashboard de Métricas

Acesse em: `/admin/metrics-realtime`

**Funcionalidades:**
- ✅ Status geral do sistema
- ✅ Taxa de sucesso em tempo real
- ✅ Latências (média, p50, p95, p99)
- ✅ Gráficos de latência por função
- ✅ Gráficos de requisições (sucesso vs falha)
- ✅ Alertas ativos com notificações toast
- ✅ Tabela detalhada de métricas
- ✅ Filtros por período (1h, 24h, 7d, 30d)
- ✅ Auto-refresh a cada 30 segundos

## Alertas em Tempo Real

Os alertas são automaticamente exibidos como toast notifications quando:
- Latência excede o threshold
- Taxa de erro ultrapassa o limite
- Funções ficam unhealthy
- Rate limiting ativado frequentemente

**Severidades:**
- `info` - Duração: 10s
- `warning` - Duração: 10s
- `error` - Duração: Infinito (requer ação)
- `critical` - Duração: Infinito + Email para admins

## Sprint 4B - Substituição de Logs (Futuro)

⚠️ **Deixado para implementação futura devido ao racionamento de créditos**

- Substituir 444 ocorrências de `console.log/warn/error`
- Usar logger estruturado de `src/lib/logger.ts`
- Integração com Sentry para tracking
- Implementação em batches priorizados

---

**Criado em:** 19/11/2025
**Status:** Sprint 4A Concluído ✅
**Próximo:** Sprint 4B (substituição de logs) ou Sprint 5
