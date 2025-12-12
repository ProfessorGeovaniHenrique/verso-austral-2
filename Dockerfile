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
COPY . . # Copia todo o conteúdo do diretório atual (incluindo app.py)

# Expõe porta (Cloud Run usa $PORT)
EXPOSE 8080

# Comando de inicialização para aplicação Flask com Gunicorn
# 'app:app' significa que o objeto Flask 'app' está no arquivo 'app.py'
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "app:app"]
