# 🚀 ROADMAP EXECUTIVO: Sistema de Anotação Semântica Dual-Layer Verso Austral

## 📋 ÍNDICE
1. [Arquitetura Geral](#1-arquitetura-geral)
2. [Pré-Requisitos](#2-pré-requisitos)
3. [Sprint 1: Schema Dual-Layer](#sprint-1-schema-dual-layer-1-semana)
4. [Sprint 2: Pipeline DS](#sprint-2-pipeline-ds-2-semanas)
5. [Sprint 3: Sistema de Insígnias](#sprint-3-sistema-de-insígnias-2-semanas)
6. [Sprint 4: Validation Dashboard](#sprint-4-validation-dashboard-15-semanas)
7. [Sprint 5: Optimization](#sprint-5-optimization-1-semana)
8. [Sprint 6: Escalabilidade](#sprint-6-escalabilidade-2-semanas)
9. [Cronograma e Métricas](#cronograma-e-métricas)

---

## 1. ARQUITETURA GERAL

### Conceito: Dual-Layer System

```
┌─────────────────────────────────────────────────────────────┐
│                    PALAVRA ANOTADA                          │
├─────────────────────────────────────────────────────────────┤
│  Palavra: "xergão"                                          │
│  ─────────────────────────────────────────────────────────  │
│  CAMADA 1: Domínio Semântico (DS) - UNIVERSAL              │
│  └─ DS: "EM" (Equipamentos de Montaria)                    │
│     └─ Comparável entre: RS, MT, Nordeste, Pantanal        │
│  ─────────────────────────────────────────────────────────  │
│  CAMADA 2: Insígnias Culturais (IC) - CONTEXTUAL           │
│  └─ IC Primária: "Gaúcho" (fonte: dialectal_lexicon)       │
│  └─ IC Secundária: "Platino" (fonte: influencia_platina)   │
│     └─ Identidade regional/cultural específica             │
└─────────────────────────────────────────────────────────────┘
```

### Vantagens da Separação

**Layer 1 (DS Universal):**
- ✅ Comparabilidade estatística cross-regional
- ✅ Log-likelihood funciona (mesmo DS em corpora diferentes)
- ✅ Escalável para literatura, jornalismo, corpus geral
- ✅ Taxonomia estável (não precisa reestruturar ao adicionar região)

**Layer 2 (Insígnias Culturais):**
- ✅ Granularidade cultural preservada
- ✅ Multi-insignia support (`chimarrão` = [Gaúcho, Platino])
- ✅ Sinergia total com dialectal_lexicon existente (106k entradas)
- ✅ Escalabilidade trivial (nova região = nova insígnia)

---

## 2. PRÉ-REQUISITOS

### ✅ Já Implementado no Projeto
- [x] Supabase Lovable Cloud ativo
- [x] dialectal_lexicon populated (106k entradas)
- [x] cultural-insignia.types.ts (InsigniaCultural enum)
- [x] Lovable AI Gateway configurado (Gemini 2.5 Flash/Pro)
- [x] pgvector extension ativa

### ⚠️ Faltando Implementar
- [ ] spaCy pt_core_news_lg integration
- [ ] semantic_tagset com DS Universal (18 domínios)
- [ ] annotated_corpus.insignias_culturais column
- [ ] semantic_disambiguation_cache table
- [ ] Edge functions de anotação

---

## SPRINT 1: Schema Dual-Layer (1 semana)

### 🎯 Objetivo
Criar infraestrutura de banco de dados para suportar DS Universal + Insígnias Culturais

### 📦 Deliverables

#### 1.1 Migration: Adicionar Insígnias em annotated_corpus
```sql
-- Adicionar coluna insignias_culturais
ALTER TABLE annotated_corpus 
ADD COLUMN insignias_culturais TEXT[] DEFAULT '{}';

-- Índice GIN para queries eficientes
CREATE INDEX idx_annotated_corpus_insignias 
ON annotated_corpus USING GIN(insignias_culturais);

-- Comentário descritivo
COMMENT ON COLUMN annotated_corpus.insignias_culturais IS 
'Array de insígnias culturais (Gaúcho, Nordestino, Platino, etc.). Uma palavra pode ter múltiplas insígnias.';
```

#### 1.2 Migration: Adicionar Insígnias em semantic_lexicon
```sql
ALTER TABLE semantic_lexicon 
ADD COLUMN insignias_culturais TEXT[] DEFAULT '{}';

CREATE INDEX idx_semantic_lexicon_insignias 
ON semantic_lexicon USING GIN(insignias_culturais);
```

#### 1.3 Atualizar InsigniaCultural Enum
```typescript
// src/data/types/cultural-insignia.types.ts
export enum InsigniaCultural {
  GAUCHO = 'Gaúcho',
  NORDESTINO = 'Nordestino',
  PLATINO = 'Platino',
  INDIGENA = 'Indígena',
  ALEMAO = 'Alemão',
  ITALIANO = 'Italiano',
  CAIPIRA = 'Caipira',
  CARIOCA = 'Carioca',
  AMAZONICO = 'Amazônico',
  GERAL = 'Geral' // Português sem marca regional forte
}
```

#### 1.4 Documentar Taxonomia DS Universal
```markdown
# Taxonomia de Domínios Semânticos Universais (18 Domínios)

## Código | Nome | Exemplos Multi-Regionais
- NA | Natureza e Paisagem | pampa (RS), sertão (NE), cerrado (MT)
- EM | Equipamentos de Montaria | xergão (RS), baixeiro (MT), carona (MT)
- AH | Atividades Humanas | campereada (RS), vaquejada (NE), rodeio (MT)
- SE | Sentimentos e Abstrações | saudade (universal), querência (RS), sodade (NE)
- OA | Objetos e Artefatos | cuia (RS), gamela (NE)
- BE | Bebidas e Alimentação | chimarrão (RS), cachaça (universal)
- MU | Música e Arte | milonga (RS), forró (NE), moda de viola (SE)
- VE | Vestuário | bombacha (RS), gibão (NE)
- HA | Habitação e Construções | galpão (RS), casa de taipa (NE)
- AN | Animais | gateado (RS), aboiamento (NE - ação), boi (universal)
- FA | Flora | tarumã (RS), juazeiro (NE), pau-brasil (SE)
- CO | Corpo Humano | perna, olho, coração (universal)
- TE | Tempo | manhãs, tarde, noite (universal)
- QU | Qualidades e Estados | lindo, cansado, forte (universal)
- AC | Ações e Processos | rondar, desgarrar, aquerenciar
- RE | Relações Sociais | patrão, peão, prenda (RS), compadre (universal)
- CO | Comunicação e Linguagem | verso, copla, cantiga
- FU | Palavras Funcionais | de, o, a, com, em (não recebem DS específico)
```

### ✅ Checklist de Validação Sprint 1
- [ ] Migration executada sem erros
- [ ] Índices GIN criados e funcionando
- [ ] InsigniaCultural enum atualizado com 9-10 valores
- [ ] Documentação de 18 DS com exemplos multi-regionais
- [ ] Exemplos de palavras com DS+IC criados (mínimo 50 exemplos)

---

## SPRINT 2: Pipeline DS - Desambiguação de Domínio Semântico (2 semanas)

### 🎯 Objetivo
Implementar os 7 métodos de desambiguação para atribuir DS Universal

### 📦 Deliverables

#### 2.1 Método 1: POS Tagging
```typescript
// supabase/functions/pos-tagger/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { text } = await req.json();
  
  // Opção A: Chamar spaCy via Python microservice
  const spacyResponse = await fetch('http://python-service/pos-tag', {
    method: 'POST',
    body: JSON.stringify({ text })
  });
  
  const tokens = await spacyResponse.json();
  // tokens: [{ word: "saudade", pos: "NOUN", lemma: "saudade" }, ...]
  
  return new Response(JSON.stringify({ tokens }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

#### 2.2 Método 2: Likelihood Ranking (Data-Driven)
```sql
-- Query para calcular likelihood de cada DS para uma palavra
SELECT 
  tagset_primario as ds_codigo,
  COUNT(*) as freq_palavra_ds,
  COUNT(*) * 1.0 / SUM(COUNT(*)) OVER () as likelihood
FROM annotated_corpus
WHERE lema = 'saudade'
GROUP BY tagset_primario
ORDER BY likelihood DESC;

-- Resultado esperado:
-- ds_codigo | freq | likelihood
-- SE        | 45   | 0.85 (85% das vezes "saudade" é Sentimentos)
-- AC        | 8    | 0.15 (15% das vezes é Ação, ex: "matar a saudade")
```

#### 2.3 Método 3: MWE Resolution
```typescript
// supabase/functions/mwe-resolver/index.ts

// Template examples:
const mweTemplates = [
  { pattern: /mate\s+(amargo|doce|quente|gelado)/, ds: 'BE', type: 'fixed_slot' },
  { pattern: /tropa\s+(desgarrada|perdida|reunida)/, ds: 'AN', type: 'fixed_slot' },
  { pattern: /olhos\s+de\s+\w+/, ds: 'CO', type: 'open_slot' } // "olhos de prenda", "olhos de noite"
];

function detectMWE(tokens) {
  const text = tokens.map(t => t.word).join(' ');
  
  for (const template of mweTemplates) {
    const match = text.match(template.pattern);
    if (match) {
      return {
        mwe: match[0],
        ds: template.ds,
        startIndex: match.index,
        endIndex: match.index + match[0].split(' ').length
      };
    }
  }
  
  // Fallback: similarity search para MWEs não-fixos
  // ... (usar embeddings para detectar expressões similares)
  
  return null;
}
```

#### 2.4 Método 4-7: AI Domain Detection + Contextual Rules + One Sense Per Text
```typescript
// supabase/functions/domain-detector/index.ts
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const { word, context, pos, lemma } = await req.json();
  
  // MÉTODO 5: One Sense Per Text (cache lookup)
  const cached = await supabase
    .from('semantic_disambiguation_cache')
    .select('ds_codigo, confidence')
    .eq('palavra', lemma)
    .eq('context_hash', hashContext(context))
    .single();
  
  if (cached.data) {
    return new Response(JSON.stringify(cached.data));
  }
  
  // MÉTODO 6: Contextual Rules (fallback rápido)
  if (lemma === 'saudade') return { ds: 'SE', confidence: 0.95, source: 'rule' };
  if (lemma === 'mate' && context.includes('amargo')) return { ds: 'BE', confidence: 0.92, source: 'rule' };
  
  // MÉTODO 4: AI Domain Detection (Gemini Flash)
  const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{
        role: 'system',
        content: `Você é um classificador semântico especializado em português brasileiro.
        
Domínios disponíveis:
NA (Natureza), EM (Equipamentos), AH (Atividades), SE (Sentimentos), OA (Objetos), 
BE (Bebidas/Alimentação), MU (Música), VE (Vestuário), HA (Habitação), AN (Animais), 
FA (Flora), CO (Corpo), TE (Tempo), QU (Qualidades), AC (Ações), RE (Relações), 
CM (Comunicação), FU (Funcional)

Responda APENAS com JSON: {"ds": "XX", "confidence": 0.XX, "reasoning": "..."}` 
      }, {
        role: 'user',
        content: `Palavra: "${word}" (lema: "${lemma}")
POS: ${pos}
Contexto: "${context}"

Qual domínio semântico?`
      }],
      response_format: { type: 'json_object' }
    })
  });
  
  const result = await geminiResponse.json();
  const dsData = JSON.parse(result.choices[0].message.content);
  
  // Cache resultado
  await supabase.from('semantic_disambiguation_cache').insert({
    palavra: lemma,
    context_hash: hashContext(context),
    ds_codigo: dsData.ds,
    confidence: dsData.confidence,
    reasoning: dsData.reasoning
  });
  
  return new Response(JSON.stringify(dsData));
});
```

### ✅ Checklist de Validação Sprint 2
- [ ] spaCy integration funcionando (POS tagging retorna tags corretas)
- [ ] Likelihood ranking calculado para top 100 palavras do corpus
- [ ] MWE resolver detecta pelo menos 50 expressões gaúchas
- [ ] Domain detector (Gemini) testado com 100 palavras (accuracy > 90%)
- [ ] Cache funcionando (2ª chamada retorna cached result < 10ms)
- [ ] Unit tests passando (cobertura > 80%)

---

## SPRINT 3: Sistema de Insígnias Culturais (2 semanas)

### 🎯 Objetivo
Implementar pipeline de atribuição de Insígnias Culturais (Layer 2)

### 📦 Deliverables

#### 3.1 Primary Insignia Rules (Regras Determinísticas)
```typescript
// src/lib/insigniaAttribution.ts

export async function getPrimaryInsignia(palavra: string): Promise<InsigniaAttribution | null> {
  // Lookup em dialectal_lexicon
  const { data: entry } = await supabase
    .from('dialectal_lexicon')
    .select('origem_regionalista, influencia_platina, tipo_dicionario')
    .eq('verbete_normalizado', normalizarPalavra(palavra))
    .single();
  
  if (!entry) return null;
  
  // Regra 1: origem_regionalista
  if (entry.origem_regionalista?.includes('Gaúcho')) {
    return {
      primaryInsignia: InsigniaCultural.GAUCHO,
      secondaryInsignias: entry.influencia_platina ? [InsigniaCultural.PLATINO] : [],
      confidence: 0.95,
      source: 'dialectal_lexicon.origem_regionalista'
    };
  }
  
  // Regra 2: tipo_dicionario implica região
  if (entry.tipo_dicionario === 'nunes' || entry.tipo_dicionario === 'ufrgs') {
    return {
      primaryInsignia: InsigniaCultural.GAUCHO,
      secondaryInsignias: [],
      confidence: 0.90,
      source: 'dialectal_lexicon.tipo_dicionario'
    };
  }
  
  return null;
}
```

#### 3.2 Contextual Insignia (Corpus-Type Rule)
```typescript
export async function getContextualInsignia(songId: string): Promise<InsigniaCultural | null> {
  // Query: song → artist → corpus → normalized_name
  const { data: song } = await supabase
    .from('songs')
    .select('artist:artists(corpus:corpora(normalized_name))')
    .eq('id', songId)
    .single();
  
  const corpusName = song?.artist?.corpus?.normalized_name;
  
  const corpusTypeMap = {
    'gaucho': InsigniaCultural.GAUCHO,
    'nordestino': InsigniaCultural.NORDESTINO,
    'platino': InsigniaCultural.PLATINO
    // ... expandir conforme novos corpus_types
  };
  
  return corpusTypeMap[corpusName] || InsigniaCultural.GERAL;
}
```

#### 3.3 Gemini Insignia Inference
```typescript
// supabase/functions/insignia-inferencer/index.ts

const INSIGNIA_PROMPT = `Analise a palavra "{palavra}" no contexto cultural brasileiro.

Definição: {definição do dialectal_lexicon se disponível}
Contextos culturais: {contextos_culturais se disponível}
Domínio Semântico: {DS já atribuído}
Sentença: "{contexto}"

Retorne um array JSON com insígnias culturais aplicáveis:

Insígnias disponíveis:
- "Gaúcho": específico da cultura gaúcha/rio-grandense (mate, galpão, bombacha, xergão, CTG)
- "Platino": influência uruguaia/argentina (chimarrão, pulperia, che, pampa compartilhado)
- "Indígena": origem tupi-guarani ou povos originários (capim, taquara, mandioca)
- "Alemão": imigração alemã no Sul (schimia, cuca, kerb)
- "Italiano": imigração italiana no Sul (polenta, cantina, nona)
- "Nordestino": específico do nordeste (forró, baião, vaqueiro, aboio)
- "Caipira": cultura caipira/sertaneja (viola, moda, sertão interior)
- "Carioca": específico do Rio de Janeiro (samba, favela, malandro)
- "Amazônico": região amazônica (açaí, tacacá, pirarucu)
- "Geral": português geral sem marca regional forte

IMPORTANTE: 
- Uma palavra pode ter múltiplas insígnias (ex: "chimarrão" = ["Gaúcho", "Platino"])
- Se não há marca regional clara, retorne ["Geral"]
- Considere etimologia e uso cultural, não apenas geografia

Responda APENAS com array JSON: ["Insígnia1", "Insígnia2"]`;

serve(async (req) => {
  const { palavra, definicao, contextos_culturais, ds_codigo, context } = await req.json();
  
  const prompt = INSIGNIA_PROMPT
    .replace('{palavra}', palavra)
    .replace('{definição do dialectal_lexicon se disponível}', definicao || 'não disponível')
    .replace('{contextos_culturais se disponível}', JSON.stringify(contextos_culturais) || 'não disponível')
    .replace('{DS já atribuído}', ds_codigo || 'não atribuído ainda')
    .replace('{contexto}', context);
  
  const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }]
    })
  });
  
  const result = await geminiResponse.json();
  const insigniasText = result.choices[0].message.content;
  const insignias = JSON.parse(insigniasText.match(/\[.*\]/)[0]); // Extract JSON array
  
  // Validar insígnias contra enum
  const validInsignias = insignias.filter(i => Object.values(InsigniaCultural).includes(i));
  
  return new Response(JSON.stringify({ 
    insignias: validInsignias, 
    confidence: 0.85,
    source: 'gemini_inference' 
  }));
});
```

#### 3.4 Orquestrador: Pipeline Completo Dual-Layer
```typescript
// supabase/functions/annotate-semantic-dual-layer/index.ts

serve(async (req) => {
  const { songId, texto } = await req.json();
  
  // 1. POS Tagging
  const { data: posResult } = await supabase.functions.invoke('pos-tagger', { body: { text: texto } });
  const tokens = posResult.tokens;
  
  // 2. MWE Resolution
  const mwes = await resolveMWEs(tokens);
  
  // 3. Para cada palavra/MWE:
  const annotatedWords = [];
  
  for (const token of tokens) {
    // Skip se parte de MWE
    if (mwes.some(mwe => mwe.includes(token.index))) continue;
    
    // LAYER 1: Domain Semantic (DS)
    const ds = await getDomainSemantic(token, context);
    
    // LAYER 2: Cultural Insignias (IC)
    const primaryIC = await getPrimaryInsignia(token.lemma);
    const contextualIC = await getContextualInsignia(songId);
    const geminiIC = primaryIC ? null : await getGeminiInsignia(token, ds);
    
    const insignias = [
      primaryIC?.primaryInsignia,
      ...(primaryIC?.secondaryInsignias || []),
      contextualIC,
      ...(geminiIC?.insignias || [])
    ].filter(Boolean);
    
    annotatedWords.push({
      palavra: token.word,
      lema: token.lemma,
      pos: token.pos,
      tagset_primario: ds.codigo,
      confianca_ds: ds.confidence,
      insignias_culturais: [...new Set(insignias)], // Remove duplicates
      confianca_ic: primaryIC?.confidence || geminiIC?.confidence || 0.7
    });
  }
  
  // 4. Salvar em annotated_corpus
  await supabase.from('annotated_corpus').insert(
    annotatedWords.map(w => ({ ...w, job_id: jobId }))
  );
  
  return new Response(JSON.stringify({ 
    success: true, 
    annotated: annotatedWords.length 
  }));
});
```

### ✅ Checklist de Validação Sprint 3
- [ ] Insignia rules detectam 70% das palavras dialetais automaticamente
- [ ] Gemini inference funciona para palavras não catalogadas
- [ ] Pipeline dual-layer anota 1 música completa em < 5s
- [ ] insignias_culturais array populado corretamente (sem duplicatas)
- [ ] Testado com 50 músicas: verificar qualidade manual das insígnias

---

## SPRINT 4: Validation Dashboard Dual-Layer (1.5 semanas)

### 🎯 Objetivo
Interface para validação humana separada de DS e IC

### 📦 Deliverables

#### 4.1 UI de Validação Dual-Layer
```tsx
// src/components/validation/DualLayerValidationPanel.tsx

export const DualLayerValidationPanel = () => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Coluna Esquerda: Validação DS */}
      <Card>
        <CardHeader>Validação de Domínio Semântico (DS)</CardHeader>
        <CardContent>
          <div>Palavra: <strong>{word.palavra}</strong></div>
          <div>DS Atual: <Badge>{word.tagset_primario}</Badge></div>
          <div>Confiança: {word.confianca_ds * 100}%</div>
          
          <Select 
            value={correctedDS} 
            onChange={setCorrectedDS}
            options={DS_OPTIONS} // 18 domínios universais
          />
          
          <Textarea 
            placeholder="Justificativa da correção..."
            value={dsJustification}
          />
          
          <Button onClick={handleSaveDSCorrection}>
            Corrigir DS
          </Button>
        </CardContent>
      </Card>
      
      {/* Coluna Direita: Validação Insígnias */}
      <Card>
        <CardHeader>Validação de Insígnias Culturais (IC)</CardHeader>
        <CardContent>
          <div>Palavra: <strong>{word.palavra}</strong></div>
          <div>Insígnias Atuais: 
            {word.insignias_culturais.map(ic => <Badge key={ic}>{ic}</Badge>)}
          </div>
          <div>Confiança IC: {word.confianca_ic * 100}%</div>
          
          <MultiSelect 
            value={correctedInsignias} 
            onChange={setCorrectedInsignias}
            options={INSIGNIA_OPTIONS} // 10 insígnias
          />
          
          <Textarea 
            placeholder="Justificativa da correção de insígnias..."
            value={icJustification}
          />
          
          <Button onClick={handleSaveICCorrection}>
            Corrigir Insígnias
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
```

#### 4.2 Feedback Loop: Auto-Update de Rankings
```typescript
// Quando usuário corrige DS de uma palavra:
async function handleDSCorrection(wordId, newDS, justification) {
  // 1. Salvar correção
  await supabase.from('human_validations').insert({
    palavra: word.palavra,
    tagset_original: word.tagset_primario,
    tagset_corrigido: newDS,
    justificativa: justification,
    user_id: userId
  });
  
  // 2. Auto-update: recalcular likelihood ranking
  // Se muitas pessoas corrigem "saudade" de AC → SE, o likelihood de SE aumenta
  const corrections = await supabase
    .from('human_validations')
    .select('tagset_corrigido')
    .eq('palavra', word.lema)
    .eq('aplicado', true);
  
  // Recalcular frequência corrigida
  const newLikelihood = calculateLikelihoodWithCorrections(word.lema, corrections);
  
  // Atualizar semantic_lexicon
  await supabase
    .from('semantic_lexicon')
    .update({ likelihood_ranking: newLikelihood })
    .eq('palavra', word.lema);
}
```

### ✅ Checklist de Validação Sprint 4
- [ ] Interface permite corrigir DS e IC independentemente
- [ ] Justificativas são obrigatórias (campo required)
- [ ] Feedback loop atualiza likelihood rankings automaticamente
- [ ] Kappa calculado entre 2 anotadores > 0.80 (substantial agreement)
- [ ] Exportação CSV funciona com colunas: palavra | lema | DS | IC[] | confidences
- [ ] Dashboard de qualidade mostra Precision/Recall DS e Accuracy IC

---

## SPRINT 5: Optimization & Scale (1 semana)

### 🎯 Objetivo
Batch processing, vector search, performance monitoring

### 📦 Deliverables

#### 5.1 Batch Processing Edge Function
```typescript
// supabase/functions/batch-annotate-songs/index.ts

serve(async (req) => {
  const { songIds } = await req.json(); // Array de até 50 IDs
  
  // Processar em paralelo com p-limit
  const limit = pLimit(10); // 10 simultâneas
  
  const results = await Promise.all(
    songIds.map(songId => 
      limit(() => annotateSong(songId))
    )
  );
  
  return new Response(JSON.stringify({ 
    processed: results.length,
    success: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length
  }));
});
```

#### 5.2 Vector Search para OOV Handling
```sql
-- Adicionar embedding column em semantic_lexicon
ALTER TABLE semantic_lexicon 
ADD COLUMN embedding vector(1536);

-- Criar índice HNSW para similarity search
CREATE INDEX idx_semantic_lexicon_embedding 
ON semantic_lexicon 
USING hnsw (embedding vector_cosine_ops);

-- Query para encontrar palavra similar:
SELECT palavra, tagset_primario, insignias_culturais,
       1 - (embedding <=> query_embedding) as similarity
FROM semantic_lexicon
WHERE 1 - (embedding <=> query_embedding) > 0.85
ORDER BY similarity DESC
LIMIT 5;
```

### ✅ Checklist de Validação Sprint 5
- [ ] Batch processing anota 50 músicas em < 3 minutos
- [ ] Cache hit rate > 85% após primeira passada
- [ ] Vector search retorna palavras similares em < 200ms
- [ ] Performance monitoring implementado (logs de latência)
- [ ] Custo médio por música < $0.01

---

## SPRINT 6: Escalabilidade Multi-Regional (2 semanas)

### 🎯 Objetivo
Suportar múltiplos regionalismos e corpus literário

### 📦 Deliverables

#### 6.1 Adicionar Novos Corpus Types
```sql
-- Adicionar corpus nordestino
INSERT INTO corpora (name, normalized_name, description, is_system)
VALUES (
  'Música Nordestina',
  'nordestino',
  'Corpus de música nordestina: forró, baião, xote, etc.',
  true
);

-- Importar músicas nordestinas (exemplo)
-- ... (upload Excel / API import)
```

#### 6.2 Expandir Dialectal Lexicon com Termos Nordestinos
```typescript
// Script de importação de dicionário nordestino
const nordestineTerms = [
  { verbete: 'forró', ds: 'MU', insignias: ['Nordestino'] },
  { verbete: 'baião', ds: 'MU', insignias: ['Nordestino'] },
  { verbete: 'aboio', ds: 'AC', insignias: ['Nordestino'] },
  { verbete: 'vaquejada', ds: 'AH', insignias: ['Nordestino'] }
  // ... 500+ termos
];

await supabase.from('dialectal_lexicon').insert(
  nordestineTerms.map(term => ({
    verbete: term.verbete,
    verbete_normalizado: normalizarPalavra(term.verbete),
    origem_regionalista: ['Nordestino'],
    tipo_dicionario: 'nordestino_lexicon',
    // ... outros campos
  }))
);
```

#### 6.3 Análise Comparativa Cross-Regional
```typescript
// src/pages/ComparativeAnalysis.tsx

export const ComparativeAnalysisPage = () => {
  // Query: distribuição de DS em corpus gaúcho
  const { data: gauchoStats } = useQuery(['ds-distribution', 'gaucho'], async () => {
    const { data } = await supabase.rpc('calculate_ds_distribution', { corpus_type: 'gaucho' });
    return data;
  });
  
  // Query: distribuição de DS em corpus nordestino
  const { data: nordestinoStats } = useQuery(['ds-distribution', 'nordestino'], async () => {
    const { data } = await supabase.rpc('calculate_ds_distribution', { corpus_type: 'nordestino' });
    return data;
  });
  
  return (
    <div>
      <h1>Análise Comparativa: Gaúcho vs. Nordestino</h1>
      
      <ComparisonChart 
        data={[
          { domain: 'Natureza', gaucho: 22.2, nordestino: 7.2 },
          { domain: 'Cultura Regional', gaucho: 23.9, nordestino: 15.1 },
          // ...
        ]} 
      />
      
      <Table>
        <thead>
          <tr>
            <th>Domínio Semântico (DS)</th>
            <th>Gaúcho (%)</th>
            <th>Nordestino (%)</th>
            <th>Análise</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Natureza e Paisagem (NA)</td>
            <td>22.2%</td>
            <td>7.2%</td>
            <td className="text-green-500">SUPER-REPRESENTADO no Gaúcho</td>
          </tr>
          {/* ... */}
        </tbody>
      </Table>
    </div>
  );
};
```

### ✅ Checklist de Validação Sprint 6
- [ ] Corpus nordestino importado e processado (500 músicas test)
- [ ] Insígnias nordestinas atribuídas corretamente
- [ ] Análise comparativa mostra diferenças estatísticas claras
- [ ] Pipeline funciona para literatura (teste com 50 páginas de prosa)
- [ ] API pública permite POST /annotate com custom corpus_type

---

## CRONOGRAMA E MÉTRICAS

### Timeline Geral
```
Sprint 1: Schema Dual-Layer           [1 sem]  ████████░░░░░░░░░░░░░░
Sprint 2: Pipeline DS                 [2 sem]  ░░░░░░░░████████████░░░░
Sprint 3: Sistema de Insígnias        [2 sem]  ░░░░░░░░░░░░░░░░████████
Sprint 4: Validation Dashboard        [1.5sem] ░░░░░░░░░░░░░░░░░░░░██████
Sprint 5: Optimization                [1 sem]  ░░░░░░░░░░░░░░░░░░░░░░████
Sprint 6: Escalabilidade Multi-Region [2 sem]  ░░░░░░░░░░░░░░░░░░░░░░░░██████████
                                      ──────────────────────────────────────
TOTAL: 9.5 semanas (~2.5 meses)
```

### Métricas de Sucesso

| Métrica | Target | Como Medir |
|---------|--------|------------|
| **DS Accuracy** | ≥ 94% | Comparar anotações automáticas vs. gold standard (500 músicas) |
| **IC Accuracy** | ≥ 92% | Validação manual de insígnias atribuídas |
| **Coverage Rate** | ≥ 95% | % de palavras que recebem DS (não OOV) |
| **Processing Speed** | < 5s/música | Timer em edge function (200 palavras típicas) |
| **Cost per Song** | < $0.01 | Gemini API usage tracking (cache hit rate 85%+) |
| **Inter-Annotator Agreement (Kappa)** | ≥ 0.80 | Calcular Kappa entre 2 linguistas em 200 músicas |

### Pontos Críticos de Decisão

#### Decisão 1: spaCy Integration
**Opções:**
- A) Python microservice (Flask/FastAPI) chamado via HTTP
- B) Deno FFI para chamar Python directly
- C) JavaScript POS tagger (compromise_nlp) - menos preciso mas mais simples

**Recomendação:** Opção A (microservice) por performance e facilidade de manutenção.

#### Decisão 2: Gemini Flash vs. Pro para DS
**Análise:**
- Flash: $0.00001/token, latência 800ms, accuracy ~88%
- Pro: $0.0001/token, latência 1500ms, accuracy ~95%

**Recomendação:** Usar Flash para DS (economy) + Pro apenas para casos ambíguos (confidence < 70%)

#### Decisão 3: Embeddings Dimension (1536 vs 384)
**Trade-off:**
- 1536 dims: 6KB/palavra, accuracy 95% similarity
- 384 dims: 1.5KB/palavra, accuracy 92% similarity

**Recomendação:** Iniciar com 1536 (Gemini native), comprimir para 384 se storage/performance se tornar problema

---

## PRÓXIMOS PASSOS IMEDIATOS

### Ação 1: Executar Sprint 1 - Migrations (2 horas)
1. Criar migration para adicionar `insignias_culturais TEXT[]` em `annotated_corpus`
2. Criar migration para adicionar `insignias_culturais TEXT[]` em `semantic_lexicon`
3. Atualizar `InsigniaCultural` enum em `cultural-insignia.types.ts`
4. Validar migrations executadas corretamente
5. Criar 50 exemplos de palavras com DS+IC para documentação

### Ação 2: Documentar Taxonomia DS Universal (4 horas)
6. Criar arquivo `SEMANTIC_TAXONOMY_UNIVERSAL.md`
7. Definir 18 domínios com exemplos multi-regionais
8. Para cada DS, listar: código, nome, descrição, exemplos (gaúcho, nordestino, geral)
9. Criar tabela comparativa: palavra | DS | IC_Gaúcho | IC_Nordestino

### Ação 3: Proof of Concept - POS Tagger (6 horas)
10. Decidir: Python microservice ou JavaScript compromise_nlp
11. Implementar edge function `pos-tagger`
12. Testar com 10 músicas gaúchas
13. Validar: accuracy POS > 90% em texto poético/regional

### Ação 4: Implementar Insignia Rules (4 horas)
14. Criar `src/lib/insigniaAttribution.ts` com regras determinísticas
15. Implementar `getPrimaryInsignia()` (dialectal_lexicon lookup)
16. Implementar `getContextualInsignia()` (corpus_type lookup)
17. Testar com 100 palavras dialetais conhecidas

---

## RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| spaCy integration complexa | Alta | Alto | Iniciar com compromise_nlp (JS), migrar para spaCy se necessário |
| Gemini quota exceeded | Média | Alto | Cache agressivo (85% hit rate) + fallback para rules |
| Insígnias ambíguas (palavra em múltiplas regiões) | Alta | Médio | Multi-insignia support + confidence scoring |
| DS taxonomy não cobre casos raros | Média | Médio | Categoria "OT" (Outros) + AI classification para expandir |
| Performance < 5s/música | Baixa | Alto | Batch processing + otimização de queries + índices adequados |

---

## CRITÉRIOS DE SUCESSO FINAL

### Para considerar o sistema "production-ready":

✅ **Funcionalidade Core:**
- [ ] Pipeline dual-layer anota 1000 músicas com DS + IC
- [ ] Accuracy DS ≥ 94% validado contra gold standard
- [ ] Accuracy IC ≥ 92% validado contra gold standard
- [ ] Coverage ≥ 95% (menos de 5% de palavras ficam como OOV)

✅ **Performance:**
- [ ] Processamento < 5s por música (200 palavras típicas)
- [ ] Cache hit rate > 85% após primeira passada
- [ ] Batch processing: 50 músicas em < 3 minutos

✅ **Custo:**
- [ ] Custo médio < $0.01 por música
- [ ] Gemini API usage tracking implementado
- [ ] Budget alert se custo > $10/dia

✅ **Escalabilidade:**
- [ ] Pipeline funciona para corpus nordestino (teste com 500 músicas)
- [ ] Comparação cross-regional funciona (Gaúcho vs. Nordestino)
- [ ] Adaptação para literatura testada (50 páginas de prosa)

✅ **Qualidade:**
- [ ] Inter-annotator agreement (Kappa) > 0.80
- [ ] Feedback loop funciona (correções atualizam rankings)
- [ ] Documentação completa (taxonomia + regras + exemplos)

---

## CONTATO E SUPORTE

**Documento criado:** 2025-01-15  
**Versão:** 1.0 (Dual-Layer Architecture)  
**Próxima revisão:** Após Sprint 3 (validação da arquitetura)

**Para dúvidas ou sugestões:**  
Consultar documentação técnica completa em `src/data/developer-logs/usas-methodology.ts`

---

**FIM DO ROADMAP EXECUTIVO**
