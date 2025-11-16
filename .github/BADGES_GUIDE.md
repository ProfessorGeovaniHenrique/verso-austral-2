# 🎨 Guia de Badges Dinâmicos

## 📖 Visão Geral

Este projeto utiliza **badges dinâmicos** que são atualizados em tempo real para mostrar o status de testes, versão, cobertura e métricas do corpus.

## 🏷️ Tipos de Badges

### 1. Workflow Badges (GitHub Actions)

Mostram o status da última execução dos workflows:

```markdown
[![Quality Gate](https://github.com/USERNAME/REPO/workflows/Quality%20Gate/badge.svg)](URL)
[![Test Corpus](https://github.com/USERNAME/REPO/workflows/Test%20Corpus/badge.svg)](URL)
[![Auto Version](https://github.com/USERNAME/REPO/workflows/Auto%20Version/badge.svg)](URL)
```

**Atualização:** Automática após cada execução do workflow

**Status possíveis:**
- 🟢 Passing (verde)
- 🔴 Failing (vermelho)
- 🟡 In progress (amarelo)
- ⚪ No runs (cinza)

### 2. Endpoint Badges (Shields.io)

Badges customizados usando dados gerados pelo projeto:

```markdown
[![Version](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/USERNAME/REPO/main/public/badges/version.json)](URL)
[![Tests](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/USERNAME/REPO/main/public/badges/tests.json)](URL)
[![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/USERNAME/REPO/main/public/badges/coverage.json)](URL)
[![Corpus](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/USERNAME/REPO/main/public/badges/corpus.json)](URL)
```

**Atualização:** Diariamente às 00:00 UTC + a cada push para `main`/`develop`

**Dados exibidos:**
- **Version**: Número da versão atual do projeto
- **Tests**: Quantidade de testes passando/total e porcentagem
- **Coverage**: Porcentagem de cobertura de testes
- **Corpus**: Número de palavras no corpus master

### 3. Static Badges

Badges que mostram tecnologias e padrões utilizados:

```markdown
[![Semantic Versioning](https://img.shields.io/badge/semver-2.0.0-blue?logo=semanticrelease)](URL)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)](URL)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB?logo=react)](URL)
```

**Atualização:** Manual (quando mudar versão de tecnologia)

## 🚀 Como Configurar

### Passo 1: Substituir Placeholders

No `README.md`, substitua:
- `USERNAME` → Seu username do GitHub
- `REPO` → Nome do seu repositório
- `your-username/your-repo` → `USERNAME/REPO`

**Exemplo:**
```markdown
<!-- Antes -->
[![Quality Gate](https://github.com/your-username/your-repo/workflows/Quality%20Gate/badge.svg)]

<!-- Depois -->
[![Quality Gate](https://github.com/joaosilva/analise-corpus/workflows/Quality%20Gate/badge.svg)]
```

### Passo 2: Gerar Dados dos Badges

Execute localmente:

```bash
npm run badge:generate
```

Isso criará os arquivos em `public/badges/`:
```
public/badges/
├── version.json
├── tests.json
├── coverage.json
├── corpus.json
├── metrics.json
└── README.md
```

### Passo 3: Commit e Push

```bash
git add public/badges/
git commit -m "chore: add badge data"
git push
```

### Passo 4: Verificar Badges

Aguarde alguns minutos e os badges no README devem aparecer com dados reais.

## 🔄 Atualização Automática

O workflow `.github/workflows/update-badges.yml` atualiza os badges automaticamente:

**Triggers:**
- ✅ Push para `main` ou `develop`
- ✅ Diariamente às 00:00 UTC (agendamento)
- ✅ Manualmente via GitHub Actions UI

**O que faz:**
1. Executa testes do corpus
2. Coleta métricas do projeto
3. Gera arquivos JSON para cada badge
4. Commit e push automático com `[skip ci]`

## 📊 Formato dos Dados

Cada badge usa o formato [Shields.io Endpoint Schema](https://shields.io/endpoint):

```json
{
  "schemaVersion": 1,
  "label": "testes",
  "message": "42/45 (93%)",
  "color": "brightgreen",
  "namedLogo": "pytest",
  "logoColor": "white"
}
```

### Cores Disponíveis

| Status | Cor | Hex |
|--------|-----|-----|
| Sucesso | `brightgreen` | #44cc11 |
| Bom | `green` | #97ca00 |
| Aceitável | `yellowgreen` | #a4a61d |
| Atenção | `yellow` | #dfb317 |
| Alerta | `orange` | #fe7d37 |
| Erro | `red` | #e05d44 |
| Neutro | `blue` | #007ec6 |
| Info | `lightgrey` | #9f9f9f |

### Ícones (Named Logos)

Shields.io suporta centenas de ícones via [Simple Icons](https://simpleicons.org/):

```json
"namedLogo": "pytest",          // Ícone de testes
"namedLogo": "semanticrelease", // Ícone de versionamento
"namedLogo": "codecov",         // Ícone de cobertura
"namedLogo": "databricks",      // Ícone de dados
```

## 🎨 Personalização

### Customizar Cores dos Testes

Edite `scripts/generate-badge-data.ts`:

```typescript
function createTestsBadge(passed: number, failed: number, total: number): BadgeData {
  const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
  
  // Customizar lógica de cores
  let color = 'red';
  if (percentage === 100) color = 'brightgreen';
  else if (percentage >= 95) color = 'green';
  else if (percentage >= 85) color = 'yellow';
  else if (percentage >= 70) color = 'orange';
  
  return {
    schemaVersion: 1,
    label: 'testes',
    message: `${passed}/${total} (${percentage}%)`,
    color,
    namedLogo: 'pytest',
    logoColor: 'white',
  };
}
```

### Adicionar Novo Badge

1. Criar função de geração:

```typescript
function createMyCustomBadge(): BadgeData {
  return {
    schemaVersion: 1,
    label: 'minha métrica',
    message: 'valor',
    color: 'blue',
  };
}
```

2. Adicionar ao objeto `metrics`:

```typescript
const metrics: ProjectMetrics = {
  version: createVersionBadge(version),
  tests: createTestsBadge(passed, failed, total),
  myCustom: createMyCustomBadge(), // Novo badge
  // ...
};
```

3. Adicionar ao README:

```markdown
[![My Custom](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/USERNAME/REPO/main/public/badges/myCustom.json)](URL)
```

## 🔍 Troubleshooting

### Badge não aparece (404)

**Causa:** URL do arquivo JSON está incorreta

**Solução:**
1. Verificar se arquivo existe em `public/badges/`
2. Confirmar que foi commitado e enviado ao GitHub
3. Verificar URL no README (substituir USERNAME/REPO)

### Badge mostra "invalid"

**Causa:** JSON está mal formatado

**Solução:**
1. Validar JSON em [jsonlint.com](https://jsonlint.com/)
2. Verificar schema no [Shields.io docs](https://shields.io/endpoint)

### Badge não atualiza

**Causa:** Cache do shields.io ou do GitHub

**Solução:**
1. Aguardar até 5 minutos
2. Limpar cache: adicionar `?cacheBuster=TIMESTAMP` na URL
3. Verificar última execução do workflow `Update Badges`

### Workflow falha

**Causa:** Testes falhando ou permissões insuficientes

**Solução:**
1. Verificar logs do workflow no GitHub Actions
2. Executar localmente: `npm run badge:generate`
3. Verificar permissões: Settings → Actions → Workflow permissions

## 📚 Exemplos de Badges

### Badge de Última Atualização

```markdown
[![Last Updated](https://img.shields.io/github/last-commit/USERNAME/REPO?label=last%20update)](URL)
```

### Badge de Issues Abertas

```markdown
[![Issues](https://img.shields.io/github/issues/USERNAME/REPO)](URL)
```

### Badge de Pull Requests

```markdown
[![PRs](https://img.shields.io/github/issues-pr/USERNAME/REPO)](URL)
```

### Badge de Estrelas

```markdown
[![Stars](https://img.shields.io/github/stars/USERNAME/REPO?style=social)](URL)
```

### Badge de Licença

```markdown
[![License](https://img.shields.io/github/license/USERNAME/REPO)](URL)
```

## 🔗 Referências

- [Shields.io](https://shields.io/)
- [Shields.io Endpoint](https://shields.io/endpoint)
- [Simple Icons](https://simpleicons.org/)
- [GitHub Actions Badges](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/adding-a-workflow-status-badge)
- [Markdown Badges](https://github.com/Ileriayo/markdown-badges)

## 📋 Comandos Úteis

```bash
# Gerar badges localmente
npm run badge:generate

# Ver métricas atuais
cat public/badges/metrics.json

# Testar badges localmente
npm run dev
# Abrir: http://localhost:5173/badges/README.md

# Forçar atualização no GitHub
git commit --allow-empty -m "chore: trigger badge update"
git push
```

---

**Última atualização:** 2024  
**Versão do guia:** 1.0.0
