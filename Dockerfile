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

# Baixa modelo spaCy pt_core_news_lg
RUN python -m spacy download pt_core_news_lg

# Copia código da aplicação
COPY app.py .

# Expõe porta (Render usa $PORT)
EXPOSE 8080

# Comando de inicialização
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080}
