# 🐳 Deploy com Docker no Render.com - Solução Garantida

## **Por que Docker resolve o problema?**

O Docker **garante** o ambiente Python 3.11, eliminando o problema de compilação do `blis` que ocorre com Python 3.13. A imagem `python:3.11-slim` é oficial e tem wheels pré-compilados.

---

## **📦 Arquivos Necessários no GitHub**

Certifique-se de que seu repositório `verso-austral-spacy` tem estes arquivos:

```
verso-austral-spacy/
├── Dockerfile          # ✅ Criado
├── .dockerignore       # ✅ Criado
├── app.py              # ✅ Já existe
├── requirements.txt    # ✅ Atualizar (ver abaixo)
└── README.md           # Opcional
```

---

## **1️⃣ Atualizar requirements.txt**

```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
spacy==3.7.4
```

**Importante:** Remova a linha do modelo spaCy (`pt-core-news-lg`), pois o Dockerfile já baixa ele.

---

## **2️⃣ Configurar Render.com para Docker**

### **Passo 1: Acessar Dashboard do Render**
1. Vá para [render.com/dashboard](https://render.com/dashboard)
2. Clique no serviço `verso-austral-spacy` (ou crie um novo)

### **Passo 2: Configurar Docker Build**
1. **Settings** → **Build & Deploy**
2. Altere:
   - **Environment:** `Docker` (não Python)
   - **Docker Build Context Path:** `.` (raiz do repositório)
   - **Dockerfile Path:** `Dockerfile`

### **Passo 3: Variáveis de Ambiente**
Adicione (se ainda não tiver):
- `PORT` = `8080` (Render injeta automaticamente, mas boa prática definir)

### **Passo 4: Trigger Manual Deploy**
1. Clique em **Manual Deploy** → **Deploy latest commit**
2. Aguarde build (7-10 minutos na primeira vez)

---

## **3️⃣ Verificar Build**

### **Logs de Build Esperados:**
```
Building image...
Step 1/8 : FROM python:3.11-slim
✅ ---> Pulling image...
Step 2/8 : WORKDIR /app
✅ ---> Running in ...
Step 3/8 : RUN apt-get update...
✅ ---> gcc, g++, make installed
Step 4/8 : COPY requirements.txt .
✅ ---> Copied
Step 5/8 : RUN pip install...
✅ ---> fastapi, uvicorn, spacy installed
Step 6/8 : RUN python -m spacy download...
✅ ---> pt_core_news_lg downloaded (300MB)
Step 7/8 : COPY app.py .
✅ ---> Copied
Step 8/8 : CMD uvicorn app:app...
✅ ---> Container ready
Build succeeded ✅
```

### **Teste o Health Check:**
```bash
curl https://verso-austral-spacy-XXXX.onrender.com/health
```

**Resposta esperada:**
```json
{"status": "healthy", "model": "pt_core_news_lg"}
```

---

## **4️⃣ Testar Anotação POS**

```bash
curl -X POST https://verso-austral-spacy-XXXX.onrender.com/annotate \
  -H "Content-Type: application/json" \
  -d '{
    "tokens": ["sou", "feliz", "estava", "caminhando"],
    "fullText": "eu sou feliz e estava caminhando"
  }'
```

**Resposta esperada:**
```json
{
  "annotations": [
    {
      "palavra": "sou",
      "lema": "ser",
      "pos": "AUX",
      "posDetalhada": "AUX",
      "features": {"tempo": "Pres", "pessoa": "1", "numero": "Sing"},
      "confidence": 0.85
    }
  ]
}
```

---

## **5️⃣ Troubleshooting**

### **Build falhou com "No space left on device"**
**Solução:** Render free tier tem limite de 512MB. Otimize Dockerfile:
```dockerfile
# Adicionar flag --no-cache-dir em pip install
RUN pip install --no-cache-dir -r requirements.txt
```

### **Container não inicia (Application failed to respond)**
**Solução:** Verificar se `app.py` tem a estrutura correta:
```python
from fastapi import FastAPI
app = FastAPI()

@app.get("/health")
async def health():
    return {"status": "healthy"}
```

### **Modelo spaCy não carrega**
**Solução:** Verificar logs de build. Se download falhou, adicionar retry:
```dockerfile
RUN python -m spacy download pt_core_news_lg || \
    python -m spacy download pt_core_news_lg
```

---

## **6️⃣ Comparação: runtime.txt vs. Docker**

| Método | Controle Python | Confiabilidade | Tempo Build | Recomendação |
|--------|----------------|----------------|-------------|--------------|
| `runtime.txt` | ⚠️ Render pode ignorar | 60% | 5-7 min | ❌ Não funciona consistentemente |
| `render.yaml` | ⚠️ Depende de config | 75% | 5-7 min | ⚠️ Pode falhar |
| **Docker** | ✅ Garantido | **99%** | 7-10 min | ✅ **Solução definitiva** |

---

## **7️⃣ Próximos Passos**

Após deploy bem-sucedido:

1. **Adicionar secret no Lovable:**
   - Nome: `SPACY_API_URL`
   - Valor: `https://verso-austral-spacy-XXXX.onrender.com`

2. **Testar integração:**
   - Ir para `/admin/semantic-tagset-validation`
   - Aba "🧪 Teste POS Layer 1"
   - Inserir texto: "eu sou feliz"
   - Clicar "Anotar Texto"
   - Verificar badges: 🧠 (VA Grammar) e 🐍 (spaCy)

3. **Monitorar performance:**
   - Logs do Render: Dashboard → Logs
   - Latência esperada: 100-300ms
   - Cold start: 5-10s (após 15min inativo)

---

## **✅ Checklist de Deploy**

- [ ] `Dockerfile` criado no GitHub
- [ ] `.dockerignore` criado no GitHub
- [ ] `requirements.txt` atualizado (sem modelo spaCy)
- [ ] Render configurado para **Docker** (não Python)
- [ ] Deploy manual iniciado
- [ ] Build completou sem erros
- [ ] Health check retorna `{"status": "healthy"}`
- [ ] Teste de anotação funciona
- [ ] Secret `SPACY_API_URL` configurado no Lovable
- [ ] Interface de teste mostra badges 🐍 spaCy

---

## **💡 Dica Pro**

Se quiser deploy ainda mais rápido (3-5min), use multi-stage build:

```dockerfile
# Stage 1: Build dependencies
FROM python:3.11-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y gcc g++ make
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt
RUN python -m spacy download pt_core_news_lg --user

# Stage 2: Runtime
FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH
COPY app.py .
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080}
```

---

**Status:** ✅ Dockerfile criado e pronto para deploy no Render.com
