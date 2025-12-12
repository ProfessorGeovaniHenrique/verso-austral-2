# 🚨 Runbook de Emergência - Verso Austral

## Sumário
1. [Quick Reference Card](#1-quick-reference-card)
2. [Níveis de Severidade](#2-níveis-de-severidade)
3. [Procedimentos por Cenário](#3-procedimentos-por-cenário)
4. [Recuperação e Validação](#4-recuperação-e-validação)
5. [Prevenção](#5-prevenção)

---

## 1. Quick Reference Card

| Ação | Como | Quando Usar |
|------|------|-------------|
| **Kill Switch** | Botão 🚨 EMERGÊNCIA no header | Sistema travado, jobs em loop |
| **Verificar Status** | `useBackpressureStatus()` | Antes de iniciar jobs |
| **Limpar Cooldown** | Botão "Limpar" no Kill Switch badge | Após recuperação confirmada |
| **Contatar Supabase** | Dashboard → Support | Banco inacessível > 30 min |

### Comandos Rápidos

```typescript
// Verificar se pode iniciar job
const { canStartNewJob, checkCanStartJob } = useBackpressureStatus();
const canStart = await checkCanStartJob();

// Verificar saúde do sistema
const { data } = useSystemHealth();
console.log(data?.status, data?.activeJobs);
```

---

## 2. Níveis de Severidade

### 🟢 NORMAL (0-3 jobs ativos)
- **Delay:** 1x (normal)
- **Ação:** Nenhuma, sistema saudável
- **Pode iniciar novos jobs:** ✅ SIM

### 🟡 ELEVATED (4-5 jobs ativos)  
- **Delay:** 2x
- **Ação:** Monitorar latência
- **Pode iniciar novos jobs:** ⚠️ Com cautela

### 🟠 HIGH (6-8 jobs ativos)
- **Delay:** 4x
- **Ação:** NÃO iniciar novos jobs
- **Pode iniciar novos jobs:** ⛔ NÃO

### 🔴 CRITICAL (9+ jobs ativos)
- **Ação:** Kill Switch automático
- **Cooldown:** 30 minutos
- **Pode iniciar novos jobs:** ⛔ NÃO

### Thresholds de Latência

| Latência | Severidade | Cooldown |
|----------|------------|----------|
| < 500ms | Normal | - |
| 500-1000ms | Elevated | - |
| 1000-2000ms | Degraded | 3 min |
| 2000-3000ms | Unhealthy | 10 min |
| > 3000ms | Critical | 30 min |

---

## 3. Procedimentos por Cenário

### Cenário A: Sistema Lento (Latência > 500ms)

**Sintomas:** Queries demoradas, UI travando

1. Verificar `BackpressureAlert` no dashboard
2. Se latência > 1000ms, aguardar cooldown automático (3-10 min)
3. Se latência > 3000ms, sistema entrará em cooldown crítico (30 min)
4. **NÃO** tente "forçar" operações - aguarde recuperação

### Cenário B: Jobs em Loop Infinito

**Sintomas:** Jobs nunca completam, mesmos dados reprocessados

1. Clicar botão 🚨 **EMERGÊNCIA**
2. Confirmar ativação do Kill Switch
3. Aguardar 30 minutos de cooldown
4. Verificar logs de Edge Functions para identificar causa raiz
5. Após cooldown, testar com 1 job apenas

### Cenário C: Banco Completamente Inacessível

**Sintomas:** Connection timeout, 500 errors, zero resposta

1. Ativar Kill Switch (Redis continuará funcionando mesmo sem DB)
2. Aguardar 10-15 minutos (auto-recovery típico)
3. Se não recuperar em 30 min:
   - Acessar Supabase Dashboard → Logs
   - Verificar conexões ativas
   - Considerar contatar suporte Supabase
4. Após recuperação:
   - Executar query de teste: `SELECT 1`
   - Verificar jobs pendentes/stuck
   - Cancelar jobs com status 'processando' há > 1h

### Cenário D: Múltiplos Jobs Duplicados

**Sintomas:** Mesmo artista sendo processado várias vezes

1. Ativar Kill Switch
2. Após cooldown, executar limpeza SQL:

```sql
-- Cancelar duplicados, manter mais recente
WITH ranked AS (
  SELECT id, artist_id, 
    ROW_NUMBER() OVER (PARTITION BY artist_id ORDER BY created_at DESC) as rn
  FROM semantic_annotation_jobs 
  WHERE status IN ('processando', 'pendente')
)
UPDATE semantic_annotation_jobs 
SET status = 'cancelado', 
    erro_mensagem = 'Cancelado: job duplicado detectado durante limpeza de emergência'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
```

### Cenário E: Excesso de Jobs Simultâneos

**Sintomas:** Sistema lento, muitos jobs ativos, BackpressureAlert vermelho

1. **NÃO** inicie novos jobs
2. Aguardar jobs existentes completarem
3. Se > 10 jobs ativos, considerar Kill Switch
4. Após normalização, usar `checkCanStartJob()` antes de novos jobs

---

## 4. Recuperação e Validação

### Checklist Pós-Crise

- [ ] Latência DB < 500ms
- [ ] Backpressure cooldown expirou
- [ ] Kill Switch inativo
- [ ] Redis respondendo
- [ ] Nenhum job em 'processando' há > 1h
- [ ] Health-check retornando 200
- [ ] activeJobs < 5

### Comandos de Validação

**Verificar jobs stuck:**
```sql
SELECT COUNT(*) as stuck_jobs
FROM semantic_annotation_jobs 
WHERE status = 'processando' 
AND updated_at < NOW() - INTERVAL '1 hour';
```

**Verificar conexões ativas:**
```sql
SELECT COUNT(*) as active_connections 
FROM pg_stat_activity 
WHERE state != 'idle';
```

**Limpar jobs stuck:**
```sql
UPDATE semantic_annotation_jobs 
SET status = 'pausado', 
    erro_mensagem = 'Pausado: stuck > 1h detectado durante recuperação'
WHERE status = 'processando' 
AND updated_at < NOW() - INTERVAL '1 hour';
```

**Verificar corpus jobs:**
```sql
SELECT id, corpus_id, status, processed_artists, total_artists, 
       EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_since_update
FROM corpus_annotation_jobs 
WHERE status = 'processando';
```

**Cancelar todos jobs ativos (emergência total):**
```sql
-- CUIDADO: Use apenas em emergência real
UPDATE semantic_annotation_jobs 
SET status = 'cancelado', erro_mensagem = 'Cancelado: limpeza de emergência'
WHERE status IN ('processando', 'pendente');

UPDATE corpus_annotation_jobs 
SET status = 'cancelado', erro_mensagem = 'Cancelado: limpeza de emergência'
WHERE status IN ('processando', 'pendente');

UPDATE enrichment_jobs 
SET status = 'cancelado', erro_mensagem = 'Cancelado: limpeza de emergência'
WHERE status IN ('processando', 'pendente');
```

---

## 5. Prevenção

### Regras de Ouro

1. **NUNCA inicie mais de 5 jobs simultaneamente**
2. **SEMPRE verifique BackpressureAlert antes de operações em lote**
3. **USE `checkCanStartJob()` antes de jobs grandes**
4. **MONITORE a latência durante processamento**
5. **RESPEITE cooldowns** - não tente contornar

### Configurações de Proteção Implementadas

| Sistema | Limite | TTL | Arquivo |
|---------|--------|-----|---------|
| Jobs Concorrentes | 5 | 5 min | `job-slot-manager.ts` |
| Cooldown Degraded | 3 min | - | `backpressure.ts` |
| Cooldown Unhealthy | 10 min | - | `backpressure.ts` |
| Cooldown Critical | 30 min | - | `backpressure.ts` |
| Heartbeat Job | 5 min | Auto-cleanup | `job-slot-manager.ts` |
| Kill Switch | 30 min | Redis TTL | `emergency-kill-jobs` |

### Arquitetura de Proteção

```
┌─────────────────────────────────────────────────────────────┐
│                    CAMADAS DE PROTEÇÃO                      │
├─────────────────────────────────────────────────────────────┤
│ L1: Pre-flight Check (Frontend)                             │
│     └── checkCanStartJob() antes de iniciar                 │
├─────────────────────────────────────────────────────────────┤
│ L2: Job Slot Manager (Redis)                                │
│     └── Limita 5 jobs concorrentes globalmente              │
├─────────────────────────────────────────────────────────────┤
│ L3: Backpressure Detection (Edge Functions)                 │
│     └── Detecta latência e ativa cooldowns                  │
├─────────────────────────────────────────────────────────────┤
│ L4: Kill Switch (Redis + Edge Functions)                    │
│     └── Para tudo imediatamente em emergência               │
└─────────────────────────────────────────────────────────────┘
```

---

## Contatos de Emergência

| Recurso | Onde Encontrar |
|---------|----------------|
| Supabase Status | [status.supabase.com](https://status.supabase.com) |
| Supabase Support | Dashboard → Help → Support |
| Redis (Upstash) | [console.upstash.com](https://console.upstash.com) |
| Lovable Support | Discord/Support Portal |

---

## Histórico de Revisões

| Data | Versão | Mudança |
|------|--------|---------|
| 2024-12-12 | 1.0 | Documento inicial após incidente de sobrecarga |
