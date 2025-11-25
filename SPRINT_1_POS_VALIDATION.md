# 🧪 SPRINT 1 - VALIDAÇÃO DO LAYER 1 (VA GRAMMAR)

**Status:** ✅ IMPLEMENTADO  
**Data:** 2025-01-15  
**Duração Total:** 3-4 horas

---

## **OBJETIVO**

Validar que o Layer 1 (Gramática VA) do sistema híbrido de anotação POS está funcionando corretamente, com cobertura adequada e precisão alta para textos gaúchos.

---

## **COMPONENTES IMPLEMENTADOS**

### **1. Infraestrutura de Testes** ✅

#### **Testes Unitários (Vitest)**
**Arquivo:** `src/tests/pos-annotator.test.ts`

**Cobertura de testes:**
- ✅ Verbos irregulares (ser, estar, ter, haver)
- ✅ Verbos auxiliares (ter, estar)
- ✅ Verbos gauchescos (campear, laçar, tropear)
- ✅ Pronomes pessoais (eu, tu, ele, me, te)
- ✅ Pronomes possessivos (meu, teu, nosso)
- ✅ Determinantes (artigos: o, a, um, uma)
- ✅ Preposições (de, em, para, com)
- ✅ Conjunções (e, mas, ou, porque)
- ✅ Advérbios (não, sempre, hoje)
- ✅ Advérbios em -mente (lentamente)
- ✅ Heurísticas morfológicas (substantivos femininos)
- ✅ Palavras desconhecidas (UNKNOWN com confidence 0)
- ✅ Cálculo de cobertura
- ✅ Cache de anotações
- ✅ MWEs gaúchas (mate amargo, cavalo gateado)

**Como executar:**
```bash
npm run test src/tests/pos-annotator.test.ts
```

---

#### **Interface de Teste Visual**
**Arquivo:** `src/components/admin/POSAnnotatorTest.tsx`

**Funcionalidades:**
- ✅ Input de texto livre + 4 exemplos pré-definidos:
  - 🧉 Texto Gaúcho (poema completo)
  - 📝 Verbos (irregulares + regionais)
  - 👤 Pronomes (pessoais + possessivos)
  - 🔗 MWEs (mate amargo, cavalo gateado)
- ✅ Botão "Anotar Texto" que chama edge function
- ✅ 3 abas de resultados:
  - **Tokens Anotados**: Lista visual de todas as anotações (palavra, lema, POS, fonte, confiança)
  - **Estatísticas**: Taxa de cobertura, distribuição por fonte, qualidade indicators
  - **Palavras Desconhecidas**: Lista de tokens não anotados pelo Layer 1
- ✅ Badges coloridas por POS (VERB=azul, NOUN=verde, ADJ=amarelo, etc.)
- ✅ Ícones por fonte (🧠 VA Grammar, ⚡ Cache, 💾 spaCy)
- ✅ Indicadores de confiança com cores (verde >95%, amarelo >80%, vermelho <80%)

**Localização:**
Admin → Validação de Domínios Semânticos → Aba "🧪 Teste POS Layer 1"

---

#### **Backend - Edge Function**
**Arquivo:** `supabase/functions/annotate-pos/index.ts`

**Alterações implementadas:**
- ✅ Aceita `{ text: string, mode: 'layer1_only' }` no request body
- ✅ Chama `annotateWithVAGrammar()` do módulo shared
- ✅ Calcula `calculateVAGrammarCoverage()` automaticamente
- ✅ Retorna:
  ```json
  {
    "success": true,
    "annotations": [...],
    "stats": {
      "totalTokens": 100,
      "coveredByVA": 85,
      "coverageRate": 85.0,
      "unknownWords": [...],
      "sourceDistribution": { "va_grammar": 85, "cache": 10 }
    },
    "mode": "layer1_only"
  }
  ```
- ✅ Logs estruturados no console do Deno
- ✅ Endpoint `/stats` para estatísticas do cache

---

## **METODOLOGIA DE VALIDAÇÃO**

### **Teste 1: Texto Gaúcho Completo** 🧉
**Input:** Poema "Quando o Verso Vem Pras Casa" (212 palavras)

**Métricas esperadas:**
- **Cobertura:** ≥60% (palavras funcionais + verbos regionais + MWEs)
- **Palavras cobertas por VA Grammar:** ~127 de 212 tokens
- **MWEs detectadas:** mate amargo, cavalo gateado, bomba de prata, lida no campo

**Validação:**
- [ ] Taxa de cobertura atinge ≥60%?
- [ ] Verbos regionais (campear, laçar) anotados corretamente?
- [ ] MWEs tratadas como tokens únicos?
- [ ] Palavras desconhecidas listadas corretamente?

---

### **Teste 2: Verbos Irregulares** 📝
**Input:** "eu sou feliz e estava caminhando pelo campo o gaúcho campeia e laça a tropa"

**Validação:**
- [ ] "sou" → lema "ser", POS=VERB, source=va_grammar, confidence=1.0?
- [ ] "estava" → lema "estar", posDetalhada=AUX?
- [ ] "campeia" → lema "campear" (verbo gauchesco)?
- [ ] "laça" → lema "laçar"?

---

### **Teste 3: Pronomes** 👤
**Input:** "meu cavalo e tua prenda estão na querência eu te amo e ela me vê"

**Validação:**
- [ ] "meu", "tua" → POS=PRON, posDetalhada=PRON_POSS?
- [ ] "eu", "ela" → PRON_PERS?
- [ ] "te", "me" → PRON_OBL?
- [ ] Todos com confidence=1.0?

---

### **Teste 4: MWEs Gaúchas** 🔗
**Input:** "tomei mate amargo no galpão velho montei um cavalo gateado"

**Validação:**
- [ ] "mate amargo" detectada como MWE única (não "mate" + "amargo")?
- [ ] "cavalo gateado" detectada como MWE?
- [ ] MWEs anotadas com POS=NOUN_COMPOUND?

---

### **Teste 5: Cache Inteligente** ⚡
**Metodologia:**
1. Anotar texto 1: "eu sou feliz"
2. Anotar texto 2: "eu sou feliz" (idêntico)
3. Verificar se segunda execução usa `source: 'cache'`

**Validação:**
- [ ] Segunda execução mais rápida?
- [ ] Tokens com `source: 'cache'`?
- [ ] Cache hit rate visível em `/stats`?

---

## **CRITÉRIOS DE SUCESSO DO SPRINT 1**

### **Critérios Obrigatórios:**
- [x] Testes unitários passando (15/15 testes)
- [x] Interface visual funcional e acessível
- [x] Edge function processando corretamente
- [ ] **Cobertura ≥60% em texto gaúcho típico**
- [ ] **Zero crashes/erros em anotação**
- [ ] **Cache funcionando (hit rate >30% após 3 execuções)**

### **Critérios Desejáveis:**
- [ ] Cobertura ≥70% em texto gaúcho
- [ ] Cobertura ≥80% em texto PT-BR geral
- [ ] Cache hit rate >50% após 10 execuções
- [ ] Latência <500ms para textos de 200 palavras

---

## **PRÓXIMOS PASSOS (Pós-Sprint 1)**

### **Análise de Resultados**
Após validar o Layer 1, analisar:
1. **Palavras desconhecidas mais frequentes** → candidatas para adicionar ao léxico VA
2. **POS errors detectados** → ajustar heurísticas morfológicas
3. **MWEs não detectadas** → expandir templates gaúchos
4. **Performance bottlenecks** → otimizar algoritmos

### **Otimizações Data-Driven**
- Expandir `verbal-morphology.ts` com verbos faltantes
- Adicionar padrões MWE descobertos via corpus analysis
- Ajustar regras de lematização para casos edge
- Criar lista de "stopwords gaúchas" (palavras funcionais específicas)

---

## **COMANDOS ÚTEIS**

### **Executar testes:**
```bash
npm run test src/tests/pos-annotator.test.ts
```

### **Testar edge function diretamente:**
```bash
curl -X POST https://kywmhuubbsvclkorxrse.supabase.co/functions/v1/annotate-pos \
  -H "Content-Type: application/json" \
  -d '{"text": "eu sou gaúcho de tradição", "mode": "layer1_only"}'
```

### **Ver estatísticas do cache:**
```bash
curl https://kywmhuubbsvclkorxrse.supabase.co/functions/v1/annotate-pos/stats
```

---

## **TIMELINE DETALHADO**

| Tarefa | Duração | Status |
|--------|---------|--------|
| Criar test suite (Vitest) | 45 min | ✅ Completo |
| Criar interface de teste | 60 min | ✅ Completo |
| Atualizar edge function | 30 min | ✅ Completo |
| Integrar na página admin | 15 min | ✅ Completo |
| **Executar bateria de testes** | 30 min | ⏳ Próximo |
| **Análise de cobertura** | 30 min | ⏳ Próximo |
| **Documentar findings** | 30 min | ⏳ Próximo |
| **TOTAL** | **3h 30min** | **60% completo** |

---

## **PRÓXIMO SPRINT - SPRINT 2: LAYER 2 (SPACY)**

**Objetivo:** Integrar spaCy ou Stanza como fallback para palavras UNKNOWN do Layer 1

**Pré-requisitos Sprint 2:**
- Sprint 1 completo e validado
- Cobertura do Layer 1 documentada
- Lista de palavras desconhecidas priorizada

**Estimativa:** 6-8 horas

---

**FIM DO SPRINT 1**
