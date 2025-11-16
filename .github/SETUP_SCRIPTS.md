# 📝 Configuração dos Scripts NPM

## ⚠️ Ação Manual Necessária

O arquivo `package.json` precisa ser atualizado manualmente com os scripts de teste. Siga as instruções abaixo:

## 🔧 Scripts a Adicionar

Abra o arquivo `package.json` e adicione os seguintes scripts na seção `"scripts"`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview",
    
    // ✨ ADICIONAR OS SCRIPTS ABAIXO ✨
    "typecheck": "tsc --noEmit",
    "test:corpus": "tsx scripts/test-corpus-ci.ts",
    "test:corpus:audit": "tsx scripts/audit-corpus.ts",
    "test:corpus:report": "tsx scripts/generate-test-report.ts",
    "test:corpus:report-html": "npm run test:corpus:report",
    "version:bump": "tsx scripts/bump-version.ts",
    "version:dry-run": "tsx scripts/bump-version.ts --dry-run",
    "version:current": "cat VERSION",
    "precommit": "npm run test:corpus:audit",
    "predeploy": "npm run test:corpus"
  }
}
```

## ✅ Verificar Instalação

Após adicionar os scripts, verifique se funcionam:

```bash
# Verificar tipos TypeScript
npm run typecheck

# Executar auditoria
npm run test:corpus:audit

# Executar todos os testes
npm run test:corpus

# Gerar relatório
npm run test:corpus:report
```

## 📦 Dependências

As seguintes dependências já foram instaladas automaticamente:
- ✅ `tsx` - Executor TypeScript para scripts
- ✅ `@types/node` - Tipos Node.js para TypeScript

## 🎯 Scripts Explicados

### Versionamento

#### `version:bump`
Analisa commits e atualiza a versão automaticamente.

**Quando usar:** Manualmente ou no CI/CD

```bash
npm run version:bump
```

#### `version:dry-run`
Testa o bump sem fazer mudanças.

**Quando usar:** Antes de criar release

```bash
npm run version:dry-run
```

#### `version:current`
Mostra a versão atual do projeto.

```bash
npm run version:current
```

### Testes e Qualidade

#### `typecheck`
Verifica erros de tipagem TypeScript sem gerar build.

**Quando usar:** Antes de commit, no CI/CD

```bash
npm run typecheck
```

### `test:corpus`
Executa a suite completa de testes de integridade do corpus.

**Quando usar:** Antes de commit importante, no CI/CD

```bash
npm run test:corpus
```

**Saída:** Exit code 0 (sucesso) ou 1 (falha)

### `test:corpus:audit`
Executa apenas a auditoria rápida de dados.

**Quando usar:** Verificação rápida antes de commit

```bash
npm run test:corpus:audit
```

**Duração:** ~5 segundos

### `test:corpus:report`
Gera relatório JSON dos testes.

**Quando usar:** Após executar testes, no CI/CD

```bash
npm run test:corpus:report
```

**Saída:** `test-reports/corpus-integrity-*.json`

### `test:corpus:report-html`
Gera relatório HTML visual dos testes.

**Quando usar:** Para análise visual dos resultados

```bash
npm run test:corpus:report-html
```

**Saída:** `test-reports/latest-report.html`

### `precommit`
Executa automaticamente antes de commits (requer configuração de hooks).

**Execução:** Automática com Git hooks

### `predeploy`
Executa automaticamente antes de deploy (no CI/CD).

**Execução:** Automática no GitHub Actions

## 🔄 Integração com GitHub Actions

Os workflows do GitHub Actions **já estão configurados** e usarão estes scripts automaticamente quando você conectar ao GitHub.

## 🆘 Problemas Comuns

### Erro: "tsx: command not found"

**Solução:**
```bash
npm install
```

### Erro: "Cannot find module"

**Solução:**
```bash
npm ci  # Reinstala todas as dependências
```

### Scripts não executam

**Verificar:**
1. Scripts estão na seção correta do package.json
2. Sintaxe JSON está correta (sem vírgulas extras)
3. Dependências foram instaladas

## 📚 Próximos Passos

Após configurar os scripts:

1. ✅ Testar localmente: `npm run test:corpus`
2. ✅ Conectar ao GitHub (se ainda não fez)
3. ✅ Ver workflows executarem automaticamente
4. ✅ Configurar branch protection rules (recomendado)

[Ver guia completo de deploy](DEPLOYMENT_GUIDE.md)
