# Configuración de Variables de Entorno

## 🔑 API Key de OpenAI REQUERIDA

Para que el chatbot funcione correctamente, necesitas configurar tu API key de OpenAI.

### Paso 1: Obtener API Key

1. Ve a: https://platform.openai.com/api-keys
2. Crea una nueva API key
3. Copia la clave (empieza con `sk-...`)

### Paso 2: Configurar la variable de entorno

**Opción A: Variable de entorno del sistema**
```bash
export OPENAI_API_KEY="sk-tu-api-key-real-aqui"
```

**Opción B: Crear archivo .env**
```bash
# Crea el archivo .env en la raíz del proyecto
echo "OPENAI_API_KEY=sk-tu-api-key-real-aqui" > .env
```

**Opción C: Modificar docker-compose.yml directamente**
```yaml
# En docker-compose.yml, línea con OPENAI_API_KEY, reemplaza:
- OPENAI_API_KEY=${OPENAI_API_KEY:-sk-tu-openai-api-key-aqui}
# Por:
- OPENAI_API_KEY=sk-tu-api-key-real-aqui
```

### Paso 3: Reiniciar el servicio

```bash
# Reiniciar solo el chatbot
docker-compose restart chatbot

# O reiniciar todo el stack
docker-compose down && docker-compose up -d
```

## ✅ Verificar que funciona

Una vez configurado, verifica que el chatbot esté funcionando:

```bash
# Ver el estado
docker-compose ps

# Ver los logs (no debería haber errores)
docker-compose logs chatbot

# Probar el endpoint de salud
curl http://localhost:8000/health
```

## 🔧 Variables de entorno configuradas automáticamente

Las siguientes variables ya están configuradas en docker-compose.yml:

### Base de datos:
- `DB_HOST=postgres`
- `DB_PORT=5432` 
- `DB_USERNAME=adminCumbrecita`
- `DB_PASSWORD=123456`
- `DB_DATABASE=StayAtCumbrecita`

### Credenciales de encriptación:
- `ENCRYPTION_KEY=...` (mismo del backend)
- `ENCRYPTION_IV=...`
- `SALT_ROUNDS=8`
- `SECRET_PEPPER=...`

### Configuración del chatbot:
- `BACKEND_URL=http://backend:5001`
- `ENVIRONMENT=production`
- `EMBEDDING_MODEL=text-embedding-3-small`
- `MAX_TOKENS=500`
- `TEMPERATURE=0.3`
- `MAX_CONTEXT_LENGTH=4000`

## 🚨 Importante

**NO** subas tu API key real al repositorio. La API key de OpenAI es sensible y debe mantenerse secreta.

Si usas git, asegúrate de que `.env` esté en `.gitignore`. 