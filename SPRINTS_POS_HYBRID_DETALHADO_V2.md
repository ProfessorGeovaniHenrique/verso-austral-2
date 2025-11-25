# 🚀 ROADMAP DETALHADO - SISTEMA HÍBRIDO DE ANOTAÇÃO POS

**Versão:** 2.0  
**Última Atualização:** 2025-01-15  
**Status Geral:** Sprint 1 Completo (✅), Sprints 2-6 Pendentes

---

## **VISÃO GERAL DO PROJETO**

### **Objetivo Final**
Construir um sistema de anotação POS (Part-of-Speech) em 3 camadas que prioriza conhecimento gramatical interno (VA Grammar), com fallback para spaCy e Gemini, otimizado para **textos gaúchos** com cobertura ≥95% e custo <$0.005/música.

### **Arquitetura em 3 Layers**

```
┌─────────────────────────────────────────────────────────────┐
│  INPUT: Texto bruto (212 palavras)                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: VA GRAMMAR (Zero-cost, 100% precision)            │
│  ✅ 50+ verbos irregulares                                   │
│  ✅ Pronomes (6 tipos)                                       │
│  ✅ MWEs gaúchas (mate amargo, cavalo gateado)              │
│  ✅ Heurísticas morfológicas (-mente, -ção, -dade)          │
│  📊 Cobertura esperada: 60-75%                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
                   (tokens UNKNOWN)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: SPACY/STANZA (Fallback para PT-BR geral)          │
│  🐍 pt_core_news_lg model                                   │
│  📊 Cobertura adicional: +20-30%                            │
│  💰 Custo: Zero (local processing)                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
              (tokens com confidence <90%)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: GEMINI FLASH (Fallback IA)                        │
│  🤖 Zero-shot POS tagging                                   │
│  📊 Cobertura adicional: +5-10%                             │
│  💰 Custo: $0.001-0.005/música                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  OUTPUT: Corpus anotado (212 tokens com POS + lema)         │
│  📊 Cobertura final esperada: ≥95%                          │
└─────────────────────────────────────────────────────────────┘
```

---

## **SPRINT 0: FUNDAÇÃO** ✅ COMPLETO

**Duração:** 2 horas  
**Data:** 2025-01-15  
**Status:** ✅ 100% Implementado

### **Entregas:**
- ✅ `verbal-morphology.ts` - 50+ verbos irregulares
- ✅ `pronoun-system.ts` - Sistema pronominal completo
- ✅ `gaucho-mwe.ts` - 9 templates de MWEs + 15 expressões fixas
- ✅ `pos-annotation-cache.ts` - Cache inteligente com contexto
- ✅ `hybrid-pos-annotator.ts` - Anotador Layer 1 completo
- ✅ Edge function `annotate-pos` atualizada
- ✅ Testes unitários (15 test cases)
- ✅ Interface de teste visual

### **Métricas Alcançadas:**
- Cobertura de conhecimento: 50+ verbos irregulares, 100+ palavras funcionais
- Templates MWE: 9 padrões + 15 expressões fixas
- Cache: expira em 7 dias, máximo 10k entradas

---

## **SPRINT 1: VALIDAÇÃO E OTIMIZAÇÃO DO LAYER 1** ⏳ EM ANDAMENTO

**Duração:** 3-4 horas  
**Status:** 60% completo (infraestrutura pronta, validação pendente)

### **Objetivo:**
Validar que o Layer 1 funciona corretamente, identificar gaps de cobertura e otimizar baseado em dados reais.

### **Fase 1.1: Testes Automatizados** (30 min) ⏳
**Tarefas:**
- [ ] Executar test suite completo
- [ ] Validar 15 test cases passando
- [ ] Corrigir falhas se houver
- [ ] Documentar edge cases encontrados

**Comandos:**
```bash
npm run test src/tests/pos-annotator.test.ts
```

**Critério de sucesso:** 15/15 testes passando

---

### **Fase 1.2: Análise de Corpus Real** (60 min) ⏳
**Tarefas:**
- [ ] Anotar poema "Quando o Verso Vem Pras Casa" (212 palavras)
- [ ] Anotar 10 letras de músicas gaúchas do corpus (média 150 palavras cada)
- [ ] Registrar métricas:
  - Taxa de cobertura do Layer 1
  - Palavras desconhecidas mais frequentes (top 20)
  - MWEs não detectadas
  - Errors em lematização

**Output esperado:**
```
Corpus analisado: 1,712 palavras
Cobertura Layer 1: 68.3%
Palavras UNKNOWN: 542 (31.7%)
Top 20 palavras desconhecidas:
  1. querência (23x)
  2. pampa (18x)
  3. coxilha (15x)
  ...
MWEs não detectadas: 8
  - "no lombo do cavalo"
  - "prenda faceira"
  ...
```

**Critério de sucesso:** Cobertura ≥60%

---

### **Fase 1.3: Otimizações Data-Driven** (90 min) ⏳
**Tarefas:**

#### **1. Expandir Léxico VA com palavras gaúchas frequentes**
- [ ] Adicionar top 50 substantivos gaúchos desconhecidos:
  ```typescript
  // Em hybrid-pos-annotator.ts
  const GAUCHO_NOUNS = new Set([
    'querência', 'pampa', 'coxilha', 'galpão', 'mate', 'bomba',
    'cuia', 'chimarrão', 'prenda', 'pago', 'tropeiro', 'laço',
    'arreio', 'pelego', 'facão', 'churrasco', 'costela', ...
  ]);
  ```

#### **2. Criar templates MWE adicionais**
- [ ] Adicionar padrões descobertos na análise:
  ```typescript
  // Em gaucho-mwe.ts
  {
    pattern: 'no lombo [PREP] [NOUN]',
    regex: /\bno lombo\s+(do|da|de)\s+\w+\b/gi,
    pos: 'PREP_PHRASE'
  }
  ```

#### **3. Ajustar heurísticas morfológicas**
- [ ] Melhorar detecção de adjetivos gaúchos (-eiro, -aço, -udo)
- [ ] Adicionar padrões de diminutivos/aumentativos (-inho, -ão)

**Critério de sucesso:** Cobertura sobe para ≥75%

---

### **Fase 1.4: Documentação de Findings** (30 min) ⏳
- [ ] Criar relatório `LAYER1_VALIDATION_REPORT.md`
- [ ] Documentar taxa de cobertura final
- [ ] Listar palavras que precisam Layer 2/3
- [ ] Sugerir melhorias para próximo sprint

---

## **SPRINT 2: INTEGRAÇÃO DO LAYER 2 (SPACY/STANZA)** 🐍 PRÓXIMO

**Duração:** 6-8 horas  
**Status:** Não iniciado  
**Pré-requisito:** Sprint 1 completo com cobertura ≥60%

### **Objetivo:**
Integrar processador NLP (spaCy ou Stanza) como fallback para palavras UNKNOWN do Layer 1.

---

### **Fase 2.1: Decisão de Tecnologia** (60 min)

#### **Opção A: spaCy via Microserviço Python** ⚠️ Complexidade Média
**Prós:**
- Model maduro e robusto (pt_core_news_lg)
- Alta precisão (≥92% em PT-BR)
- Documentação extensa

**Contras:**
- Precisa criar microserviço Python separado (Flask/FastAPI)
- Adiciona latência de rede (HTTP call)
- Requer deploy separado (Docker container)

**Implementação:**
```python
# spacy-service/app.py
from flask import Flask, request, jsonify
import spacy

nlp = spacy.load('pt_core_news_lg')
app = Flask(__name__)

@app.route('/annotate', methods=['POST'])
def annotate():
    text = request.json['text']
    doc = nlp(text)
    return jsonify([{
        'palavra': token.text,
        'lema': token.lemma_,
        'pos': token.pos_,
        'posDetalhada': token.tag_
    } for token in doc])
```

**Custo:** Zero (processing local), mas requer infraestrutura adicional

---

#### **Opção B: Stanza.js (Node.js nativo)** ✅ RECOMENDADO
**Prós:**
- Roda nativamente em Node.js (sem Python)
- Integração direta com Deno edge functions
- Model PT-BR disponível
- Zero latência de rede

**Contras:**
- Menos maduro que spaCy
- Documentação mais limitada
- Precisão ligeiramente inferior (~88-90%)

**Implementação:**
```typescript
// supabase/functions/_shared/stanza-annotator.ts
import Stanza from 'stanza';

const nlp = new Stanza.Pipeline('pt', { processors: 'tokenize,pos,lemma' });

export async function annotateWithStanza(text: string) {
  const doc = await nlp.process(text);
  return doc.sentences.flatMap(sent => 
    sent.words.map(word => ({
      palavra: word.text,
      lema: word.lemma,
      pos: mapStanzaToPOS(word.upos),
      confidence: 0.9
    }))
  );
}
```

**Custo:** Zero

---

#### **Opção C: Compromise.js (Light NLP)** 🚀 Fallback Rápido
**Prós:**
- Extremamente leve (<500kb)
- Zero setup, roda direto no browser/Deno
- Latência muito baixa

**Contras:**
- Precisão inferior (~75-80%)
- Focado em inglês (PT-BR limitado)
- Não recomendado para análise linguística rigorosa

**Uso:** Apenas se Opção A/B inviáveis

---

#### **Opção D: Pular Layer 2 → Gemini direto** 🤖 Mais Simples
**Prós:**
- Zero infraestrutura adicional
- Precisão alta (≥95% com prompt engineering)
- Já integrado no projeto

**Contras:**
- Custo por token (~$0.002-0.005/música)
- Depende de API externa (latência, quotas)

**Recomendação:** Usar se Sprint 2 for gargalo no cronograma do MVP

---

### **Decisão Recomendada: Opção B (Stanza.js)**
**Justificativa:**
- Melhor custo-benefício (zero custo + integração nativa)
- Cobertura adicional estimada: +25-30%
- Precisão adequada (88-90% é suficiente para fallback)
- Sem complexidade de infraestrutura

---

### **Fase 2.2: Implementação Stanza** (3-4 horas)

#### **Tarefa 2.2.1: Instalar e configurar Stanza.js** (30 min)
```bash
npm install stanza
```

#### **Tarefa 2.2.2: Criar módulo de anotação** (60 min)
**Arquivo:** `supabase/functions/_shared/stanza-annotator.ts`

```typescript
import Stanza from 'stanza';

let nlpPipeline: any = null;

export async function initializeStanza() {
  if (!nlpPipeline) {
    nlpPipeline = new Stanza.Pipeline('pt', {
      processors: 'tokenize,pos,lemma',
      download_method: 'reuse_resources'
    });
  }
  return nlpPipeline;
}

export async function annotateWithStanza(
  words: string[]
): Promise<AnnotatedToken[]> {
  const nlp = await initializeStanza();
  const text = words.join(' ');
  const doc = await nlp.process(text);

  return doc.sentences.flatMap((sent: any, sentIdx: number) =>
    sent.words.map((word: any, wordIdx: number) => ({
      palavra: word.text,
      lema: word.lemma || word.text.toLowerCase(),
      pos: mapStanzaToPOS(word.upos),
      posDetalhada: word.xpos || word.upos,
      features: extractFeatures(word.feats),
      posicao: sentIdx * 100 + wordIdx,
      source: 'stanza' as const,
      confidence: 0.88
    }))
  );
}

function mapStanzaToPOS(upos: string): string {
  const mapping: Record<string, string> = {
    'NOUN': 'NOUN',
    'VERB': 'VERB',
    'ADJ': 'ADJ',
    'ADV': 'ADV',
    'PRON': 'PRON',
    'DET': 'DET',
    'ADP': 'ADP',
    'CCONJ': 'CCONJ',
    'SCONJ': 'SCONJ',
    'NUM': 'NUM',
    'PUNCT': 'PUNCT',
  };
  return mapping[upos] || 'X';
}

function extractFeatures(feats: string | null): Record<string, string> {
  if (!feats) return {};
  
  const features: Record<string, string> = {};
  const pairs = feats.split('|');
  
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value) {
      features[key.toLowerCase()] = value;
    }
  }
  
  return features;
}
```

#### **Tarefa 2.2.3: Integrar no pipeline híbrido** (90 min)
**Arquivo:** `supabase/functions/_shared/hybrid-pos-annotator.ts`

```typescript
import { annotateWithStanza } from './stanza-annotator.ts';

export async function annotateWithHybridSystem(
  texto: string,
  enableLayer2: boolean = true
): Promise<AnnotatedToken[]> {
  // Layer 1: VA Grammar
  const layer1Results = await annotateWithVAGrammar(texto);
  
  if (!enableLayer2) {
    return layer1Results;
  }

  // Identificar tokens UNKNOWN
  const unknownTokens = layer1Results.filter(t => t.confidence === 0.0);
  
  if (unknownTokens.length === 0) {
    console.log('✅ Layer 1 cobriu 100% das palavras');
    return layer1Results;
  }

  console.log(`⚠️ ${unknownTokens.length} palavras UNKNOWN, ativando Layer 2 (Stanza)...`);

  // Layer 2: Stanza (apenas para UNKNOWNs)
  const unknownWords = unknownTokens.map(t => t.palavra);
  const stanzaResults = await annotateWithStanza(unknownWords);

  // Merge: substituir UNKNOWNs por anotações do Stanza
  const mergedResults = layer1Results.map(token => {
    if (token.confidence > 0) return token; // Manter anotação Layer 1
    
    const stanzaMatch = stanzaResults.find(s => s.palavra === token.palavra);
    return stanzaMatch || token;
  });

  const finalStats = calculateVAGrammarCoverage(mergedResults);
  console.log(`✅ Layer 1+2: ${finalStats.coveredByVA}/${finalStats.totalTokens} tokens (${finalStats.coverageRate.toFixed(1)}% cobertura)`);

  return mergedResults;
}
```

#### **Tarefa 2.2.4: Atualizar edge function** (30 min)
**Arquivo:** `supabase/functions/annotate-pos/index.ts`

```typescript
const body = await req.json();
const { text, mode = 'hybrid' } = body;

let annotations;
let stats;

if (mode === 'layer1_only') {
  annotations = await annotateWithVAGrammar(text);
  stats = calculateVAGrammarCoverage(annotations);
} else if (mode === 'hybrid') {
  annotations = await annotateWithHybridSystem(text, true);
  stats = calculateVAGrammarCoverage(annotations);
} else if (mode === 'layer2_only') {
  annotations = await annotateWithStanza(text.split(/\s+/));
  stats = { /* calcular stats */ };
}

return new Response(JSON.stringify({ 
  success: true, 
  annotations, 
  stats,
  mode 
}), ...);
```

#### **Tarefa 2.2.5: Testes de validação** (60 min)
- [ ] Testar modo híbrido com texto gaúcho
- [ ] Comparar cobertura Layer 1 vs Layer 1+2
- [ ] Validar que palavras UNKNOWN foram anotadas
- [ ] Medir latência (deve ser <1s para 200 palavras)

**Critério de sucesso:** Cobertura ≥85% com Layer 1+2

---

### **Fase 2.3: Atualizar Interface de Teste** (30 min)
- [ ] Adicionar dropdown para selecionar modo:
  - Layer 1 Only
  - Layer 1 + 2 (Hybrid)
  - Layer 2 Only (Stanza)
- [ ] Mostrar comparativo de cobertura
- [ ] Adicionar badge de latência

---

## **SPRINT 3: INTEGRAÇÃO DO LAYER 3 (GEMINI FLASH)** 🤖

**Duração:** 4-5 horas  
**Status:** Não iniciado  
**Pré-requisito:** Sprint 2 completo com cobertura ≥85%

### **Objetivo:**
Adicionar Gemini Flash como fallback final para palavras com confidence <90% após Layer 2, com cache agressivo para minimizar custo.

---

### **Fase 3.1: Implementar Cliente Gemini** (60 min)

**Arquivo:** `supabase/functions/_shared/gemini-pos-annotator.ts`

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export interface GeminiPOSRequest {
  palavra: string;
  contexto: string; // 3 palavras antes + palavra + 3 palavras depois
}

export async function annotateWithGemini(
  requests: GeminiPOSRequest[]
): Promise<AnnotatedToken[]> {
  // Batch de até 50 palavras por request
  const batches = chunkArray(requests, 50);
  const results: AnnotatedToken[] = [];

  for (const batch of batches) {
    const prompt = buildPOSPrompt(batch);
    const response = await model.generateContent(prompt);
    const parsed = parseGeminiResponse(response.response.text());
    results.push(...parsed);
  }

  return results;
}

function buildPOSPrompt(batch: GeminiPOSRequest[]): string {
  return `
Você é um anotador linguístico especializado em português brasileiro gaúcho.

Tarefa: Para cada palavra abaixo, forneça:
1. POS (Part-of-Speech): NOUN, VERB, ADJ, ADV, PRON, DET, ADP, CCONJ, etc.
2. Lema (forma canônica)
3. Features morfológicas (gênero, número, tempo, pessoa, etc.)

Formato de resposta (JSON):
[
  {
    "palavra": "querência",
    "lema": "querência",
    "pos": "NOUN",
    "features": { "genero": "Fem", "numero": "Sing" }
  }
]

Palavras para anotar:
${batch.map((req, i) => `${i + 1}. "${req.palavra}" no contexto: "${req.contexto}"`).join('\n')}

Responda APENAS com o JSON array, sem markdown.
`;
}

function parseGeminiResponse(text: string): AnnotatedToken[] {
  // Limpar markdown ```json se presente
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  return parsed.map((item: any, index: number) => ({
    palavra: item.palavra,
    lema: item.lema || item.palavra.toLowerCase(),
    pos: item.pos || 'NOUN',
    posDetalhada: item.pos || 'NOUN',
    features: item.features || {},
    posicao: index,
    source: 'gemini' as const,
    confidence: 0.95
  }));
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
```

---

### **Fase 3.2: Implementar Cache Persistente** (90 min)

**Arquivo:** Adicionar tabela `pos_annotation_cache` no banco

```sql
CREATE TABLE public.pos_annotation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  palavra TEXT NOT NULL,
  contexto_hash TEXT NOT NULL,
  lema TEXT NOT NULL,
  pos TEXT NOT NULL,
  pos_detalhada TEXT,
  features JSONB DEFAULT '{}'::jsonb,
  source TEXT NOT NULL, -- 'gemini', 'stanza', 'va_grammar'
  confidence NUMERIC(3,2) DEFAULT 0.95,
  hits_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_hit_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  
  UNIQUE(palavra, contexto_hash)
);

CREATE INDEX idx_pos_cache_lookup ON pos_annotation_cache(palavra, contexto_hash);
CREATE INDEX idx_pos_cache_expires ON pos_annotation_cache(expires_at);
```

**Arquivo:** `supabase/functions/_shared/pos-cache-db.ts`

```typescript
import { SupabaseClient } from '@supabase/supabase-js';

export async function getCachedPOS(
  supabase: SupabaseClient,
  palavra: string,
  contextoHash: string
): Promise<AnnotatedToken | null> {
  const { data, error } = await supabase
    .from('pos_annotation_cache')
    .select('*')
    .eq('palavra', palavra)
    .eq('contexto_hash', contextoHash)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) return null;

  // Incrementar contador de hits
  await supabase
    .from('pos_annotation_cache')
    .update({ 
      hits_count: data.hits_count + 1,
      last_hit_at: new Date().toISOString()
    })
    .eq('id', data.id);

  return {
    palavra: data.palavra,
    lema: data.lema,
    pos: data.pos,
    posDetalhada: data.pos_detalhada || data.pos,
    features: data.features as Record<string, string>,
    posicao: 0,
    source: 'cache',
    confidence: data.confidence
  };
}

export async function setCachedPOS(
  supabase: SupabaseClient,
  annotation: AnnotatedToken,
  contextoHash: string
): Promise<void> {
  await supabase
    .from('pos_annotation_cache')
    .upsert({
      palavra: annotation.palavra,
      contexto_hash: contextoHash,
      lema: annotation.lema,
      pos: annotation.pos,
      pos_detalhada: annotation.posDetalhada,
      features: annotation.features,
      source: annotation.source,
      confidence: annotation.confidence,
      hits_count: 0,
      last_hit_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    });
}
```

---

### **Fase 3.3: Integrar Layer 3 no Pipeline** (90 min)

**Arquivo:** `supabase/functions/_shared/hybrid-pos-annotator.ts`

```typescript
export async function annotateWithFullPipeline(
  texto: string,
  supabase: SupabaseClient,
  options: {
    enableLayer2: boolean;
    enableLayer3: boolean;
    geminiThreshold: number; // Confidence mínima antes de chamar Gemini
  } = {
    enableLayer2: true,
    enableLayer3: true,
    geminiThreshold: 0.90
  }
): Promise<AnnotatedToken[]> {
  // Layer 1: VA Grammar
  let results = await annotateWithVAGrammar(texto);
  const layer1Stats = calculateVAGrammarCoverage(results);
  
  console.log(`Layer 1: ${layer1Stats.coverageRate.toFixed(1)}% cobertura`);

  // Layer 2: Stanza (para UNKNOWNs)
  if (options.enableLayer2) {
    const unknowns = results.filter(t => t.confidence === 0.0);
    
    if (unknowns.length > 0) {
      const stanzaResults = await annotateWithStanza(unknowns.map(t => t.palavra));
      results = mergeAnnotations(results, stanzaResults);
      console.log(`Layer 2: +${stanzaResults.length} tokens processados`);
    }
  }

  // Layer 3: Gemini (para low confidence)
  if (options.enableLayer3) {
    const lowConfidence = results.filter(t => t.confidence < options.geminiThreshold);
    
    if (lowConfidence.length > 0) {
      // Verificar cache primeiro
      const cachedPromises = lowConfidence.map(t => 
        getCachedPOS(supabase, t.palavra, createContextHash(texto, t.palavra))
      );
      const cached = await Promise.all(cachedPromises);
      
      const stillUnknown = lowConfidence.filter((t, i) => !cached[i]);
      
      if (stillUnknown.length > 0) {
        console.log(`Layer 3: ${stillUnknown.length} palavras para Gemini`);
        
        const geminiRequests = stillUnknown.map(t => ({
          palavra: t.palavra,
          contexto: extractContext(texto, t.palavra, 3)
        }));
        
        const geminiResults = await annotateWithGemini(geminiRequests);
        
        // Cachear resultados do Gemini
        for (const result of geminiResults) {
          const hash = createContextHash(texto, result.palavra);
          await setCachedPOS(supabase, result, hash);
        }
        
        results = mergeAnnotations(results, geminiResults);
      }
    }
  }

  const finalStats = calculateVAGrammarCoverage(results);
  console.log(`✅ Pipeline completo: ${finalStats.coverageRate.toFixed(1)}% cobertura`);

  return results;
}

function extractContext(texto: string, palavra: string, windowSize: number): string {
  const tokens = texto.split(/\s+/);
  const index = tokens.findIndex(t => t === palavra);
  
  if (index === -1) return palavra;
  
  const start = Math.max(0, index - windowSize);
  const end = Math.min(tokens.length, index + windowSize + 1);
  
  return tokens.slice(start, end).join(' ');
}

function mergeAnnotations(
  base: AnnotatedToken[],
  updates: AnnotatedToken[]
): AnnotatedToken[] {
  return base.map(token => {
    const update = updates.find(u => u.palavra === token.palavra);
    return update || token;
  });
}

function createContextHash(texto: string, palavra: string): string {
  const context = extractContext(texto, palavra, 3);
  // Simple hash (não precisa ser criptográfico)
  let hash = 0;
  for (let i = 0; i < context.length; i++) {
    const char = context.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}
```

---

### **Fase 3.4: Testes e Otimização** (60 min)
- [ ] Testar pipeline completo (Layer 1 + 2 + 3)
- [ ] Validar cache hit rate (deve ser >70% após 10 músicas)
- [ ] Medir custo Gemini por música (target: <$0.005)
- [ ] Otimizar batch size (50 palavras/request)

**Critério de sucesso:** Cobertura ≥95%, custo <$0.005/música

---

## **SPRINT 4: DASHBOARD DE MONITORAMENTO** 📊

**Duração:** 3-4 horas  
**Status:** Não iniciado  
**Pré-requisito:** Sprint 3 completo

### **Objetivo:**
Criar dashboard administrativo para monitorar performance, cobertura e custo do sistema POS em produção.

---

### **Fase 4.1: Métricas de Performance** (90 min)

**Criar tabela de métricas:**
```sql
CREATE TABLE public.pos_annotation_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_words_processed INTEGER DEFAULT 0,
  layer1_coverage_rate NUMERIC(5,2),
  layer2_coverage_rate NUMERIC(5,2),
  layer3_calls INTEGER DEFAULT 0,
  gemini_api_cost_usd NUMERIC(10,6) DEFAULT 0.0,
  cache_hit_rate NUMERIC(5,2),
  avg_processing_time_ms INTEGER,
  
  UNIQUE(date)
);
```

**Edge function logging:**
```typescript
// Em annotate-pos/index.ts
async function logMetrics(stats: any) {
  await supabase.from('pos_annotation_metrics').upsert({
    date: new Date().toISOString().split('T')[0],
    total_words_processed: stats.totalTokens,
    layer1_coverage_rate: stats.layer1Rate,
    layer2_coverage_rate: stats.layer2Rate,
    layer3_calls: stats.geminiCalls,
    gemini_api_cost_usd: stats.geminiCalls * 0.0001, // Estimativa
    cache_hit_rate: stats.cacheHitRate,
    avg_processing_time_ms: stats.processingTime
  });
}
```

---

### **Fase 4.2: Dashboard Visual** (120 min)

**Arquivo:** `src/components/admin/POSMetricsDashboard.tsx`

**Componentes:**
- [ ] **Gráfico de Cobertura ao Longo do Tempo** (Recharts Line Chart)
  - Layer 1, Layer 2, Layer 3 empilhados
- [ ] **Distribuição de Fontes** (Pie Chart)
  - VA Grammar, Stanza, Gemini, Cache
- [ ] **Custo Acumulado** (Counter)
  - Custo total Gemini API em USD
- [ ] **Cache Hit Rate** (Progress bar)
  - Taxa de cache hits vs. misses
- [ ] **Top 20 Palavras Mais Problemáticas** (Table)
  - Palavras que precisam Layer 3 com frequência

---

## **SPRINT 5: FEEDBACK LOOP E APRENDIZADO** 🔄

**Duração:** 3-4 horas  
**Status:** Não iniciado  
**Pré-requisito:** Sprint 4 completo

### **Objetivo:**
Implementar sistema de validação humana onde usuários/pesquisadores podem corrigir anotações POS incorretas, com feedback automático para melhorar o sistema.

---

### **Fase 5.1: Interface de Validação Humana** (2 horas)

**Arquivo:** `src/components/admin/POSValidationInterface.tsx`

**Funcionalidades:**
- [ ] Mostrar anotação atual vs. contexto
- [ ] Permitir editar: POS, lema, features
- [ ] Adicionar justificativa textual
- [ ] Botão "Validar & Salvar"
- [ ] Próximo token não validado automaticamente

**Tabela de validações:**
```sql
CREATE TABLE public.pos_human_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  palavra TEXT NOT NULL,
  contexto TEXT NOT NULL,
  pos_original TEXT NOT NULL,
  lema_original TEXT NOT NULL,
  pos_corrigido TEXT NOT NULL,
  lema_corrigido TEXT NOT NULL,
  justificativa TEXT,
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  applied BOOLEAN DEFAULT FALSE
);
```

---

### **Fase 5.2: Atualização Automática do Léxico** (90 min)

**Lógica:**
- Quando validação humana é salva, verificar se palavra está no léxico VA
- Se não está e foi validada 3+ vezes com mesma correção → adicionar ao léxico
- Se está mas todas as validações corrigem → atualizar léxico

**Exemplo:**
```typescript
async function applyValidationFeedback() {
  // Buscar validações não aplicadas
  const { data: validations } = await supabase
    .from('pos_human_validations')
    .select('*')
    .eq('applied', false);

  // Agrupar por palavra
  const grouped = groupBy(validations, 'palavra');

  for (const [palavra, validationList] of Object.entries(grouped)) {
    if (validationList.length >= 3) {
      // Consenso: atualizar léxico VA
      const mostCommon = findMostCommonCorrection(validationList);
      await addToVALexicon(palavra, mostCommon);
      
      // Marcar validações como aplicadas
      await supabase
        .from('pos_human_validations')
        .update({ applied: true })
        .in('id', validationList.map(v => v.id));
    }
  }
}
```

---

## **SPRINT 6: PRODUÇÃO E ESCALABILIDADE** 🚀

**Duração:** 4-5 horas  
**Status:** Não iniciado  
**Pré-requisito:** Sprints 1-5 completos

### **Objetivo:**
Otimizar o sistema para processar 30k+ músicas em modo batch com custo e latência mínimos.

---

### **Fase 6.1: Batch Processing Paralelo** (2 horas)

**Arquivo:** `supabase/functions/annotate-corpus-batch/index.ts`

**Estratégia:**
- Processar 100 músicas em paralelo
- Usar `Promise.allSettled()` para não falhar batch inteiro
- Implementar retry logic para falhas temporárias
- Salvar resultados em `annotated_corpus` table

**Código:**
```typescript
export async function processMusicBatch(
  songIds: string[],
  supabase: SupabaseClient
): Promise<BatchResult> {
  const BATCH_SIZE = 100;
  const batches = chunkArray(songIds, BATCH_SIZE);
  
  const results = [];
  
  for (const batch of batches) {
    const promises = batch.map(async (songId) => {
      try {
        const { data: song } = await supabase
          .from('music_catalog')
          .select('lyrics')
          .eq('id', songId)
          .single();

        if (!song?.lyrics) return { songId, status: 'skipped' };

        const annotations = await annotateWithFullPipeline(
          song.lyrics,
          supabase,
          { enableLayer2: true, enableLayer3: true, geminiThreshold: 0.90 }
        );

        // Salvar anotações
        await saveAnnotations(supabase, songId, annotations);

        return { songId, status: 'success', annotationsCount: annotations.length };
      } catch (error) {
        return { songId, status: 'error', error: error.message };
      }
    });

    const batchResults = await Promise.allSettled(promises);
    results.push(...batchResults);
    
    console.log(`Batch ${results.length / BATCH_SIZE} completo`);
  }

  return {
    total: songIds.length,
    successful: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length
  };
}
```

---

### **Fase 6.2: Otimização de Custo Gemini** (90 min)

**Estratégias:**

#### **1. Cache Agressivo (70%+ hit rate)**
- Usar `palavra:contexto_hash` como chave
- Expiração de 90 dias (vs. 7 dias do cache em memória)
- Pré-carregar cache com corpus gaúcho anotado manualmente

#### **2. Batch Requests (50 palavras/request)**
- Reduzir overhead de API
- Gemini Flash suporta até 32k tokens de contexto
- Economiza ~60% em requests

#### **3. Threshold Dinâmico**
- Iniciar com threshold=0.90 (apenas low confidence)
- Após 1000 músicas anotadas, analisar padrão de errors
- Ajustar threshold automaticamente (ex: se Layer 2 tem >95% precisão → aumentar para 0.95)

#### **4. Fallback Contextual Rules**
- Se palavra aparece 5+ vezes no mesmo documento → usar "One Sense Per Text"
- Se palavra tem sufixo conhecido (-mente, -ção) → não chamar Gemini

**Economia esperada:** 50-70% de redução em custos Gemini

---

### **Fase 6.3: Monitoramento de Custo em Tempo Real** (60 min)

**Dashboard de custos:**
```typescript
// src/components/admin/POSCostMonitor.tsx
export const POSCostMonitor = () => {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    const { data } = await supabase
      .from('pos_annotation_metrics')
      .select('*')
      .order('date', { ascending: false })
      .limit(30);

    const totalCost = data.reduce((sum, d) => sum + d.gemini_api_cost_usd, 0);
    const totalWords = data.reduce((sum, d) => sum + d.total_words_processed, 0);
    const avgCostPerWord = totalCost / totalWords;

    setMetrics({
      totalCost: totalCost.toFixed(4),
      avgCostPerWord: (avgCostPerWord * 1000).toFixed(6), // mili-cents
      totalWords: totalWords.toLocaleString(),
      cacheHitRate: (data[0]?.cache_hit_rate || 0).toFixed(1)
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>💰 Custos de Anotação POS</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Custo Total (30 dias)</p>
            <p className="text-2xl font-bold">${metrics?.totalCost}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Custo por Palavra</p>
            <p className="text-2xl font-bold">${metrics?.avgCostPerWord}m</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Palavras Processadas</p>
            <p className="text-2xl font-bold">{metrics?.totalWords}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Cache Hit Rate</p>
            <p className="text-2xl font-bold">{metrics?.cacheHitRate}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## **RESUMO DAS 6 SPRINTS**

| Sprint | Objetivo | Duração | Status | Entregáveis Principais |
|--------|----------|---------|--------|----------------------|
| **0** | Fundação Layer 1 | 2h | ✅ Completo | Léxico VA, MWEs, Cache |
| **1** | Validação Layer 1 | 3-4h | ⏳ 60% | Testes, Interface, Análise |
| **2** | Integração Layer 2 | 6-8h | ❌ Não iniciado | Stanza.js, Hybrid Pipeline |
| **3** | Integração Layer 3 | 4-5h | ❌ Não iniciado | Gemini Flash, Cache DB |
| **4** | Dashboard Métricas | 3-4h | ❌ Não iniciado | Gráficos, Monitoramento |
| **5** | Feedback Loop | 3-4h | ❌ Não iniciado | Validação Humana |
| **6** | Escalabilidade | 4-5h | ❌ Não iniciado | Batch Processing |
| **TOTAL** | | **25-34h** | **15% completo** | Sistema Híbrido Completo |

---

## **MÉTRICAS DE SUCESSO FINAIS**

### **Performance:**
- ✅ Cobertura: ≥95% (todas as palavras anotadas)
- ✅ Precisão: ≥93% (validado por humanos)
- ✅ Latência: <5s por música (200 palavras)
- ✅ Cache hit rate: ≥70% após 100 músicas

### **Economia:**
- ✅ Custo por música: <$0.005 USD
- ✅ Layer 1 (zero custo): 60-75% cobertura
- ✅ Layer 2 (zero custo): +20-30% cobertura
- ✅ Layer 3 (paid): apenas 5-10% restante

### **Qualidade:**
- ✅ Zero crashes em produção
- ✅ Fallback gracioso em caso de API failures
- ✅ Feedback loop para melhoria contínua

---

## **CRONOGRAMA ESTIMADO**

Assumindo **4 horas/dia de trabalho focado**:

- **Semana 1:** Sprint 1 (validação) + início Sprint 2
- **Semana 2:** Conclusão Sprint 2 + Sprint 3 completo
- **Semana 3:** Sprint 4 + Sprint 5
- **Semana 4:** Sprint 6 + testes finais + documentação

**Total:** 4 semanas para sistema híbrido completo em produção

---

## **PRÓXIMOS PASSOS IMEDIATOS (AGORA)**

### **Tarefa 1: Executar Testes Unitários** (5 min)
```bash
npm run test src/tests/pos-annotator.test.ts
```

### **Tarefa 2: Testar Interface Visual** (10 min)
1. Navegar para Admin → Validação de Domínios → 🧪 Teste POS Layer 1
2. Selecionar exemplo "🧉 Texto Gaúcho"
3. Clicar em "Anotar Texto"
4. Verificar resultados nas 3 abas

### **Tarefa 3: Analisar Cobertura** (15 min)
- Anotar poema completo
- Registrar taxa de cobertura
- Listar palavras UNKNOWN
- Identificar padrões nos gaps

### **Tarefa 4: Decisão de Priorização** (5 min)
Com base na cobertura do Layer 1:
- **Se ≥75%:** Considerar pular Layer 2 e ir direto para Gemini (Sprint 3)
- **Se 60-75%:** Implementar Layer 2 (Sprint 2)
- **Se <60%:** Expandir léxico VA antes de continuar

---

**EXECUTE AS TAREFAS 1-4 AGORA E REPORTE OS RESULTADOS PARA DECIDIR O PRÓXIMO PASSO** ✨

---

**FIM DO ROADMAP DETALHADO**
