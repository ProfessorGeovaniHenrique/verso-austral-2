# 🐶 Husky - Referência Rápida

## 🚀 Setup em 30 Segundos

```bash
# 1. Executar script
chmod +x scripts/setup-husky.sh && ./scripts/setup-husky.sh

# 2. Testar
git commit --allow-empty -m "test: validar hooks"
```

## 📋 Comandos Essenciais

| Comando | Descrição |
|---------|-----------|
| `git commit -m "..."` | Executa pre-commit + commit-msg |
| `git push` | Executa pre-push |
| `git commit --no-verify` | Bypass de hooks (emergência) |
| `git push --no-verify` | Bypass de pre-push |
| `export HUSKY=0` | Desabilitar globalmente |

## ✅ Formato de Commit

```bash
# ✅ Válidos
git commit -m "feat: nova funcionalidade"
git commit -m "fix(corpus): corrigir lema"
git commit -m "docs: atualizar README"

# ❌ Inválidos
git commit -m "adiciona feature"
git commit -m "WIP"
git commit -m "fixes"
```

## 📊 Tipos de Commit

- `feat` - Nova funcionalidade
- `fix` - Correção de bug
- `docs` - Documentação
- `style` - Formatação
- `refactor` - Refatoração
- `test` - Testes
- `chore` - Manutenção
- `perf` - Performance
- `ci` - CI/CD
- `build` - Build

## 🔧 Troubleshooting Rápido

### Hooks não executam
```bash
npx husky install && chmod +x .husky/*
```

### Scripts não encontrados
```bash
npm install
```

### Muito lento
```bash
# Desabilitar pre-push
mv .husky/pre-push .husky/pre-push.disabled
```

## 📚 Docs Completas

- [README Completo](README.md)
- [Setup Guide](SETUP_GUIDE.md)
- [Contributing](../CONTRIBUTING.md)

## 🆘 Bypass de Emergência

```bash
# Apenas quando REALMENTE necessário!
git commit --no-verify -m "hotfix: crítico"
git push --no-verify
```

⚠️ **ATENÇÃO:** CI/CD no GitHub ainda executará os testes!
