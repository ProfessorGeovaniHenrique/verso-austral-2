#!/bin/bash
# 🔧 Script de Configuração do Husky
# Execute este script após instalar as dependências

echo "🐶 Configurando Husky Git Hooks..."
echo ""

# Verificar se husky está instalado
if ! command -v husky &> /dev/null; then
    echo "❌ Husky não encontrado!"
    echo "   Instalando..."
    npm install husky --save-dev
fi

# Inicializar husky
echo "📦 Inicializando Husky..."
npx husky install

# Tornar hooks executáveis
echo "🔐 Configurando permissões dos hooks..."
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
chmod +x .husky/commit-msg
chmod +x .husky/_/husky.sh

# Verificar se scripts existem no package.json
echo ""
echo "🔍 Verificando scripts npm..."

if ! npm run test:corpus:audit --silent &> /dev/null; then
    echo "⚠️  ATENÇÃO: Script 'test:corpus:audit' não encontrado!"
    echo "   Adicione ao package.json:"
    echo '   "test:corpus:audit": "tsx scripts/audit-corpus.ts"'
fi

if ! npm run test:corpus --silent &> /dev/null; then
    echo "⚠️  ATENÇÃO: Script 'test:corpus' não encontrado!"
    echo "   Adicione ao package.json:"
    echo '   "test:corpus": "tsx scripts/test-corpus-ci.ts"'
fi

echo ""
echo "✅ Husky configurado com sucesso!"
echo ""
echo "📋 Hooks ativos:"
echo "   ✓ pre-commit:  Auditoria rápida (~5s)"
echo "   ✓ pre-push:    Testes completos (~30s)"
echo "   ✓ commit-msg:  Validação de formato Conventional Commits"
echo ""
echo "💡 Dicas:"
echo "   • Use 'git commit --no-verify' para bypass em emergências"
echo "   • Use 'git push --no-verify' para bypass do pre-push"
echo "   • Configure HUSKY=0 para desabilitar globalmente"
echo ""
echo "🚀 Próximos passos:"
echo "   1. Fazer um commit de teste"
echo "   2. Verificar se hooks executam corretamente"
echo "   3. Ver documentação em .husky/README.md"
echo ""
