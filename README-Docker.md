# 🐳 Stay At Cumbrecita - Configuración Docker

Este proyecto utiliza Docker para ejecutar todos los servicios de la aplicación **Stay At Cumbrecita** de forma containerizada y segura.

## 📋 Tabla de Contenidos

- [🔒 Configuración Segura](#-configuración-segura)
- [📦 Servicios](#-servicios)
- [🚀 Instalación](#-instalación)
- [⚙️ Configuración de Variables de Entorno](#️-configuración-de-variables-de-entorno)
- [🏗️ Construcción y Ejecución](#️-construcción-y-ejecución)
- [🔧 Modo Desarrollo](#-modo-desarrollo)
- [📊 Monitoreo](#-monitoreo)
- [🛠️ Troubleshooting](#️-troubleshooting)

## 🔒 Configuración Segura

⚠️ **IMPORTANTE**: Los archivos Docker con credenciales están excluidos del repositorio por seguridad.

Los siguientes archivos **NO** están en el repositorio y debes crearlos localmente:
- `docker-compose.yml`
- `docker-compose.dev.yml`
- `*/Dockerfile`

## 📦 Servicios

El stack de Docker incluye los siguientes servicios:

| Servicio | Puerto | Descripción |
|----------|---------|-------------|
| **Backend** | 5001 | API NestJS con TypeScript |
| **Frontend** | 3000 | Aplicación Next.js |
| **Chatbot** | 8000 | API FastAPI con IA |
| **Redis** | 6379 | Cache en memoria |
| **PostgreSQL** | 5432 | Base de datos (local) |

## 🚀 Instalación

### 1. Prerrequisitos

```bash
# Instalar Docker y Docker Compose
docker --version
docker-compose --version

# Tener PostgreSQL ejecutándose localmente
# O descomentar el servicio postgres en docker-compose.yml
```

### 2. Clonar configuraciones

```bash
# Copiar archivos de ejemplo
cp docker-compose.example.yml docker-compose.yml
cp docker-compose.dev.example.yml docker-compose.dev.yml

# Copiar Dockerfiles
cp backendStayCumbrecita/Dockerfile.example backendStayCumbrecita/Dockerfile
cp frontendStayCumbrecita/Dockerfile.example frontendStayCumbrecita/Dockerfile
cp stayCumbrecita-chatbot/Dockerfile.example stayCumbrecita-chatbot/Dockerfile
```

## ⚙️ Configuración de Variables de Entorno

### 1. Crear archivo de variables de entorno

```bash
# Copiar el archivo de ejemplo
cp docker.env.example docker.env
```

### 2. Configurar credenciales

Edita el archivo `docker.env` con tus credenciales reales:

```bash
# ================================
# BASE DE DATOS
# ================================
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=adminCumbrecita
DB_PASSWORD=tu_password_seguro
DB_DATABASE=StayAtCumbrecita

# ================================
# ENCRIPTACIÓN (Generar claves seguras)
# ================================
# Usa: openssl rand -hex 32
ENCRYPTION_KEY=tu_clave_de_64_caracteres_hex
ENCRYPTION_IV=tu_iv_de_32_caracteres_hex
SALT_ROUNDS=8
SECRET_PEPPER=tu_pepper_de_32_caracteres_hex

# ================================
# CLOUDINARY
# ================================
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# ================================
# GMAIL
# ================================
GMAIL_HOST=smtp.gmail.com
GMAIL_PORT=587
GMAIL_USER=tu_email@gmail.com
GMAIL_PASS=tu_app_password
GMAIL_SECURE=false
GMAIL_FROM=tu_email@gmail.com

# ================================
# GOOGLE MAPS
# ================================
NEXT_PUBLIC_MAPS_API_GOOGLE_KEY=tu_google_maps_key

# ================================
# OPENAI
# ================================
OPENAI_API_KEY=sk-proj-tu_openai_key
```

### 3. Configurar archivos .env de cada servicio

```bash
# Backend
cp backendStayCumbrecita/.env.example backendStayCumbrecita/.env

# Frontend 
cp frontendStayCumbrecita/.env.example frontendStayCumbrecita/.env.local

# Chatbot
cp stayCumbrecita-chatbot/env.example stayCumbrecita-chatbot/.env
```

### 4. Generar claves de encriptación seguras

```bash
# Generar ENCRYPTION_KEY (64 caracteres hex)
openssl rand -hex 32

# Generar ENCRYPTION_IV (32 caracteres hex)
openssl rand -hex 16

# Generar SECRET_PEPPER
openssl rand -hex 16
```

## 🏗️ Construcción y Ejecución

### Modo Producción

```bash
# Construir todas las imágenes
docker-compose build

# Verificar que las imágenes se crearon
docker images | grep staycumbrecita

# Levantar todos los servicios
docker-compose up -d

# Verificar estado de los servicios
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend
```

### URLs de acceso

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **Chatbot API**: http://localhost:8000
- **Redis**: http://localhost:6379

## 🔧 Modo Desarrollo

Para desarrollo con hot-reload:

```bash
# Usar el archivo de desarrollo
docker-compose -f docker-compose.dev.yml build
docker-compose -f docker-compose.dev.yml up -d

# Ver logs en desarrollo
docker-compose -f docker-compose.dev.yml logs -f
```

### Diferencias en desarrollo:

- **Hot reload** habilitado
- **Volúmenes** montados para código fuente
- **node_modules** excluidos del bind mount
- **Logs verbosos**

## 📊 Monitoreo

### Health Checks

Todos los servicios tienen health checks configurados:

```bash
# Verificar salud de los servicios
docker-compose ps

# Ver detalles de health check
docker inspect staycumbrecita-backend --format='{{.State.Health.Status}}'
```

### Comandos útiles

```bash
# Reiniciar un servicio específico
docker-compose restart frontend

# Reconstruir sin cache
docker-compose build --no-cache backend

# Ver recursos utilizados
docker stats

# Limpiar contenedores parados
docker-compose down
docker system prune -f

# Ver volúmenes
docker volume ls | grep staycumbrecita

# Acceder a un contenedor
docker-compose exec backend sh
docker-compose exec frontend sh
docker-compose exec chatbot bash
```

## 🛠️ Troubleshooting

### Problemas comunes

#### 1. Error de permisos en archivos

```bash
# Cambiar propietario de los archivos
sudo chown -R $USER:$USER .

# Dar permisos de ejecución
chmod +x docker-*.sh
```

#### 2. Puerto ya en uso

```bash
# Ver qué proceso usa el puerto
lsof -i :3000
lsof -i :5001

# Matar proceso
kill -9 PID
```

#### 3. Problemas de base de datos

```bash
# Verificar conexión a PostgreSQL local
pg_isready -h localhost -p 5432

# Crear base de datos manualmente
createdb -h localhost -U adminCumbrecita StayAtCumbrecita
```

#### 4. Error de API keys

```bash
# Verificar variables de entorno dentro del contenedor
docker-compose exec frontend env | grep NEXT_PUBLIC
docker-compose exec chatbot env | grep OPENAI
```

#### 5. Problemas de build

```bash
# Limpiar cache de Docker
docker builder prune -f

# Reconstruir desde cero
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Logs de debug

```bash
# Backend logs
docker-compose logs backend 2>&1 | grep ERROR

# Frontend build logs
docker-compose logs frontend | grep -A 5 -B 5 "Failed"

# Chatbot logs
docker-compose logs chatbot | grep -i error
```

## 🔐 Mejores Prácticas de Seguridad

### 1. Variables de entorno
- ✅ **Nunca** commitees archivos con credenciales
- ✅ Usa archivos `.example` para documentar variables requeridas
- ✅ Genera claves fuertes con `openssl rand`
- ✅ Rota credenciales regularmente

### 2. Dockerfile
- ✅ Usa usuarios no-root en contenedores
- ✅ Multi-stage builds para imágenes más pequeñas
- ✅ Instala solo dependencias necesarias
- ✅ No incluyas secrets en las imágenes

### 3. Networking
- ✅ Usa redes internas de Docker
- ✅ Expone solo puertos necesarios
- ✅ Configura CORS apropiadamente

### 4. Volúmenes
- ✅ Usa volúmenes nombrados para datos persistentes
- ✅ No montes directorios sensibles del host
- ✅ Configura permisos apropiados

## 📞 Soporte

Si tienes problemas con la configuración Docker:

1. **Verifica los logs**: `docker-compose logs [servicio]`
2. **Revisa las variables de entorno**: Los archivos `.env` deben estar correctamente configurados
3. **Verifica conectividad**: PostgreSQL debe estar ejecutándose y accesible
4. **Limpia y reconstruye**: `docker-compose down && docker-compose build --no-cache`

---

**⚠️ Recordatorio**: Los archivos `docker-compose.yml` y `Dockerfile` contienen credenciales sensibles y **NO** deben ser commiteados al repositorio. 