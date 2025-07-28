FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Crear entorno virtual
RUN python -m venv /app/venv

# Activar entorno virtual y actualizar pip
RUN /app/venv/bin/pip install --upgrade pip

# Copiar requirements e instalar dependencias en el entorno virtual
COPY requirements.txt .
RUN /app/venv/bin/pip install --no-cache-dir -r requirements.txt

# Copiar código de la aplicación
COPY app/ ./app/
COPY sql/ ./sql/

# Crear directorio para uploads
RUN mkdir -p uploads

# Exponer puerto
EXPOSE 8000

# Comando de inicio usando el entorno virtual
CMD ["/app/venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"] 