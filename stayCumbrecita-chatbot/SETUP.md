# Configuración del Chatbot Stay At Cumbrecita

## 🔧 Configuración Inicial

### 1. Configurar Variables de Entorno

El archivo `.env` ya está creado con las configuraciones básicas. **Solo necesitas configurar tu API key de OpenAI**:

```bash
# Edita el archivo .env
nano .env

# Reemplaza esta línea:
OPENAI_API_KEY=sk-tu-openai-api-key-aqui

# Por tu API key real:
OPENAI_API_KEY=sk-tu-api-key-real-aqui
```

### 2. Activar Entorno Virtual

```bash
# Si no está activado, activa el entorno virtual
source venv/bin/activate

# Verificar que Python 3.11 está activo
python --version
```

### 3. Instalar Dependencias

```bash
# Si no están instaladas
pip install -r requirements.txt
```

### 4. Probar Configuración

```bash
# Probar que la configuración es correcta
python -c "from app.core.config import settings; print('✅ Configuración OK')"
```

### 5. Ejecutar la Aplicación

```bash
# Desarrollo
uvicorn app.main:app --reload --port 8000

# O usando el script de Docker
docker-compose up chatbot
```

## 📋 Variables de Entorno Configuradas

- **Base de Datos**: Configurada para PostgreSQL local
- **Backend API**: Apunta a `http://localhost:5001`
- **OpenAI**: Modelo `text-embedding-3-small`
- **Entorno**: `development`

## 🚀 Integración con Docker

El servicio ya está integrado en el `docker-compose.yml` principal del proyecto. Para ejecutar todo el stack:

```bash
# Desde el directorio raíz del proyecto
docker-compose up
```

## 🔍 Verificación de Estado

- **API Health Check**: `http://localhost:8000/health`
- **Documentación API**: `http://localhost:8000/docs`
- **Endpoints Chat**: `http://localhost:8000/chat/`

## ⚠️ Notas Importantes

1. **API Key de OpenAI**: Es la única configuración que necesitas completar
2. **Base de Datos**: Debe estar corriendo en PostgreSQL (puerto 5432)
3. **Backend**: Debe estar corriendo en puerto 5001
4. **Puerto**: El chatbot usa el puerto 8000

## 🛠️ Troubleshooting

Si tienes problemas, verifica:

1. **Entorno virtual activado**: `which python` debe mostrar el path del venv
2. **Dependencias instaladas**: `pip list | grep fastapi`
3. **Variables de entorno**: `python -c "from app.core.config import settings; print(settings.openai_api_key)"`
4. **Base de datos**: Que PostgreSQL esté corriendo y accesible 