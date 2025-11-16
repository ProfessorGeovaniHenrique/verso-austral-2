# 🔄 Fluxo Completo de Validação

Este documento descreve o fluxo completo de validação, desde o desenvolvimento local até o deploy em produção.

## 🎯 Visão Geral

O projeto implementa **3 camadas de validação** para garantir a qualidade do código e dados:

1. **🐶 Camada Local (Husky)** - Validação instantânea no Git
2. **☁️ Camada CI (GitHub Actions)** - Validação automatizada na nuvem
3. **🚀 Camada Deploy (Quality Gate)** - Gate de qualidade final

## 📊 Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────────────┐
│                    DESENVOLVIMENTO LOCAL                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  git add .      │
                    │  git commit     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  🐶 HUSKY       │
                    │  Pre-Commit     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────────────┐
                    │ Auditoria Rápida (~5s)  │
                    │ • Lemas definidos       │
                    │ • Sem duplicatas        │
                    │ • Frequências válidas   │
                    └────────┬────────────────┘
                             │
                    ┌────────▼────────────────┐
                    │ Validação de Mensagem   │
                    │ • Conventional Commits  │
                    └────────┬────────────────┘
                             │
                    ┌────────▼────────┐
                    │   ✅ PASSOU     │
                    │   Commit OK     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   git push      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  🐶 HUSKY       │
                    │  Pre-Push       │
                    └────────┬────────┘
                             │
                    ┌────────▼─────────────────┐
                    │ Suite Completa (~30s)    │
                    │ • Integridade de dados   │
                    │ • Consistência domínios  │
                    │ • Prosódia válida        │
                    │ • Estatísticas corretas  │
                    └────────┬─────────────────┘
                             │
┌────────────────────────────┼────────────────────────────┐
│                ✅ PASSOU   │   ❌ FALHOU                │
│                            │                            │
│             ┌──────────────▼──────────────┐            │
│             │      Push para GitHub       │            │
│             └──────────────┬──────────────┘            │
│                            │                            │
└────────────────────────────┼────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                     GITHUB ACTIONS (CI)                  │
└─────────────────────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │ ☁️ Workflow     │
                    │ test-corpus     │
                    └────────┬────────┘
                             │
                    ┌────────▼───────────────────┐
                    │ Setup Ambiente             │
                    │ • Node.js 20               │
                    │ • npm ci (com cache)       │
                    └────────┬───────────────────┘
                             │
                    ┌────────▼────────────────────┐
                    │ Auditoria de Dados          │
                    │ npm run test:corpus:audit   │
                    └────────┬────────────────────┘
                             │
                    ┌────────▼────────────────────┐
                    │ Testes de Integridade       │
                    │ npm run test:corpus         │
                    └────────┬────────────────────┘
                             │
                    ┌────────▼────────────────────┐
                    │ Gerar Relatório             │
                    │ npm run test:corpus:report  │
                    └────────┬────────────────────┘
                             │
                    ┌────────▼────────────────────┐
                    │ Upload Artifacts            │
                    │ • Relatório JSON            │
                    │ • Relatório HTML            │
                    └────────┬────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────┐
│                ✅ PASSOU   │   ❌ FALHOU                │
│                            │                            │
│        ┌───────────────────▼──────────────┐            │
│        │ Comentar resultados no PR        │            │
│        │ Status: ✅ Passed                │            │
│        └───────────────────┬──────────────┘            │
│                            │                            │
└────────────────────────────┼────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                    QUALITY GATE (Deploy)                 │
└─────────────────────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │ Branch = main?  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────────────┐
                    │ Pre-Deployment Check    │
                    │ • TypeScript check      │
                    │ • Corpus tests          │
                    │ • Generate report       │
                    └────────┬────────────────┘
                             │
┌────────────────────────────┼────────────────────────────┐
│                ✅ PASSOU   │   ❌ FALHOU                │
│                            │                            │
│   ┌────────────────────────▼──────────────┐            │
│   │      🚀 DEPLOY AUTORIZADO              │            │
│   │   • Merge permitido                    │            │
│   │   • Deploy para produção               │            │
│   └────────────────────────┬───────────────┘            │
│                            │                            │
│                   ┌────────▼────────┐                   │
│                   │   PRODUÇÃO ✅   │                   │
│                   └─────────────────┘                   │
│                                                          │
│                                      ┌──────────────────▼─────────────┐
│                                      │  🚫 DEPLOY BLOQUEADO           │
│                                      │  • Merge bloqueado             │
│                                      │  • Correção necessária         │
│                                      │  • Ver logs para detalhes      │
│                                      └────────────────────────────────┘
└──────────────────────────────────────────────────────────────────────┘
```

## ⏱️ Tempos de Execução

| Camada | Validação | Duração | Quando |
|--------|-----------|---------|--------|
| 🐶 Local | Auditoria | ~5s | Cada commit |
| 🐶 Local | Testes completos | ~30s | Cada push |
| ☁️ CI | Testes completos | ~1-2min | Push/PR |
| 🚀 Deploy | Quality gate | ~2-3min | Push main |

## 🎯 Tipos de Validação

### 1. Auditoria Rápida (Pre-Commit)

**Arquivo:** `scripts/audit-corpus.ts`

**Valida:**
- ✅ Total de palavras correto (142)
- ✅ Todos os lemas definidos
- ✅ Nenhuma palavra duplicada
- ✅ Frequências válidas (> 0)
- ✅ Consistência entre arquivos

**Exit Code:**
- `0` - Auditoria passou
- `1` - Falhas encontradas

### 2. Testes Completos (Pre-Push + CI)

**Arquivo:** `scripts/test-corpus-ci.ts`

**5 Suites de Testes:**

1. **Integridade de Dados Básicos** (5 testes)
   - Total de palavras
   - Lemas definidos
   - Sem duplicatas
   - Frequências válidas
   - Consistência de dados

2. **Consistência de Domínios** (4 testes)
   - Palavras têm domínio
   - Domínios não vazios
   - Riqueza lexical correta
   - Palavras existem no corpus

3. **Integridade de Prosódia** (4 testes)
   - Palavras têm prosódia
   - Valores válidos
   - Lemas em mapa
   - Percentuais somam 100%

4. **Dados Estatísticos** (3 testes)
   - Alta significância tem LL > 0
   - Funcionais têm LL = 0
   - Significância válida

5. **Métricas do Corpus** (3 testes)
   - Proporção temáticas/funcionais
   - Distribuição de prosódia
   - Número de domínios

**Exit Code:**
- `0` - Todos passaram ou apenas warnings
- `1` - Falhas críticas encontradas

### 3. Quality Gate (Deploy)

**Workflow:** `.github/workflows/pre-deployment-check.yml`

**Valida:**
- ✅ Tipos TypeScript
- ✅ Testes do corpus
- ✅ Geração de relatórios
- ✅ Branch protection rules

**Resultado:**
- ✅ **Pass** → Merge permitido → Deploy autorizado
- ❌ **Fail** → Merge bloqueado → Deploy impossível

## 🔄 Fluxo de Correção

Quando um teste falha:

```
❌ Teste falhou
    │
    ▼
🔍 Ver logs detalhados
    │
    ▼
📝 Identificar problema
    │
    ▼
🔧 Corrigir dados/código
    │
    ▼
🧪 Testar localmente
    │   npm run test:corpus
    ▼
✅ Passou? → Commit
    │
    ▼
🚀 Push novamente
    │
    ▼
☁️ CI executa
    │
    ▼
✅ Passou? → Deploy OK
```

## 🛡️ Camadas de Proteção

### Proteção 1: Local (Husky)
- **Previne:** Commits ruins entrarem no histórico
- **Velocidade:** Instantâneo (5-30s)
- **Bypass:** Possível com `--no-verify`

### Proteção 2: CI (GitHub Actions)
- **Previne:** PRs ruins entrarem em review
- **Velocidade:** Rápido (1-2min)
- **Bypass:** Impossível

### Proteção 3: Deploy Gate
- **Previne:** Deploy de código problemático
- **Velocidade:** Moderado (2-3min)
- **Bypass:** Impossível (exceto admin)

## 📊 Métricas de Qualidade

O sistema monitora:

- **Taxa de sucesso** dos builds
- **Tempo médio** de execução
- **Frequência de falhas** por suite
- **Tipos de erros** mais comuns
- **Histórico** de qualidade do corpus

## 🎓 Boas Práticas

### ✅ Fazer

1. **Testar localmente primeiro**
   ```bash
   npm run test:corpus:audit  # Antes de commit
   npm run test:corpus        # Antes de PR importante
   ```

2. **Corrigir falhas imediatamente**
   - Não acumular problemas
   - Dados ruins se propagam

3. **Usar mensagens descritivas**
   ```bash
   # ✅ BOM
   git commit -m "fix(corpus): corrigir lema de 'saudade'"
   
   # ❌ RUIM
   git commit -m "fix"
   ```

4. **Revisar relatórios**
   - Ler logs completos quando falhar
   - Entender causa raiz do problema

### ❌ Evitar

1. **Bypass desnecessário**
   ```bash
   # ⚠️ Use APENAS em emergências
   git commit --no-verify
   ```

2. **Ignorar warnings**
   - Warnings hoje = erros amanhã
   - Revisar e corrigir quando possível

3. **Push sem testar**
   - Sempre teste localmente primeiro
   - CI é última linha de defesa

## 🆘 Troubleshooting

### Problema: Hooks não executam

**Solução:**
```bash
cd .husky
chmod +x *
cd ..
npx husky install
```

### Problema: CI falha mas local passa

**Causas comuns:**
- Dependências desatualizadas
- Cache npm corrompido
- Diferença de ambiente

**Solução:**
```bash
rm -rf node_modules package-lock.json
npm install
npm ci  # Instala exatamente como no CI
npm run test:corpus
```

### Problema: Deploy bloqueado indevidamente

**Verificar:**
1. Status checks no PR
2. Logs completos no Actions
3. Branch protection rules

## 📚 Documentação Relacionada

- [Guia de Contribuição](../CONTRIBUTING.md)
- [Setup do Husky](../.husky/SETUP_GUIDE.md)
- [CI/CD Guide](../.github/DEPLOYMENT_GUIDE.md)
- [Corpus Tests](../src/data/mockup/validation/README.md)

---

**Este é um sistema de qualidade em produção.**
**Mantenha os padrões. Garanta a integridade dos dados.**
