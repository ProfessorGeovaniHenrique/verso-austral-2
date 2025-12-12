# Use Python 3.11 slim (garantido para compilar blis/spaCy)
FROM python:3.11-slim

# Define working directory
WORKDIR /app

# Instala dependências do sistema necessárias para compilar spaCy e blis
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/*

# Copia requirements.txt
COPY requirements.txt .

# Instala dependências Python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Baixa pacotes NLTK necessários
RUN python -m nltk.downloader stopwords punkt

# --- CORREÇÃO AQUI ---
# Instala o modelo spaCy pt_core_news_lg diretamente via pip, com a versão correta
RUN pip install https://github.com/explosion/spacy-models/releases/download/pt_core_news_lg-3.7.0/pt_core_news_lg-3.7.0.tar.gz

# Copia código da aplicação
COPY . .

# Expõe porta (Cloud Run usa $PORT)
EXPOSE 8080

# Comando de inicialização para aplicação Flask com Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "app:app"]
