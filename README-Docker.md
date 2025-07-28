# 🐳 Docker Setup - StayAtCumbrecita

Esta guía te ayudará a configurar y ejecutar el proyecto StayAtCumbrecita usando Docker Desktop.

## 📋 Requisitos Previos

### 1. Docker Desktop
- **Descargar**: [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Instalar** y asegurarse de que esté ejecutándose
- **Verificar**: `docker --version` y `docker-compose --version`

### 2. Configuración de Variables de Entorno
El proyecto ya tiene configurados los archivos de variables de entorno:

- **Backend**: `backend/.env`
- **Frontend**: `frontendStayAtCumbrecita/.env.local`

Los archivos ya están configurados con:

**Backend (.env):**
- Base de datos PostgreSQL configurada
- Cloudinary para gestión de imágenes
- Gmail para notificaciones por email
- Firebase para push notifications
- Claves de encriptación

**Frontend (.env.local):**
- API URL apuntando al backend
- Google Maps API key
- Configuración de desarrollo

Docker automáticamente usará estas configuraciones y solo ajustará las variables necesarias para el entorno de contenedores.

## 🚀 Comandos de Ejecución

### Producción (Recomendado)
```bash
# Construir y ejecutar todos los servicios
docker-compose up --build

# Ejecutar en segundo plano
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Parar todos los servicios
docker-compose down
```

### Desarrollo (Con Hot Reload)
```bash
# Usar archivo de desarrollo
docker-compose -f docker-compose.dev.yml up --build

# En segundo plano
docker-compose -f docker-compose.dev.yml up -d --build

# Parar servicios de desarrollo
docker-compose -f docker-compose.dev.yml down
```

## 📊 Servicios Disponibles

### 🌐 URLs de Acceso
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5001
- **API Docs**: http://localhost:5001/api
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 🔍 Contenedores
- `staycumbrecita-frontend` - Next.js (Puerto 3000)
- `staycumbrecita-backend` - NestJS (Puerto 5001)
- `staycumbrecita-postgres` - PostgreSQL (Puerto 5432)
- `staycumbrecita-redis` - Redis (Puerto 6379)

## 🛠️ Comandos Útiles

### Gestión de Contenedores
```bash
# Ver contenedores ejecutándose
docker-compose ps

# Reiniciar un servicio específico
docker-compose restart backend

# Reconstruir un servicio específico
docker-compose up --build backend

# Ejecutar comando en contenedor
docker-compose exec backend npm run migration:run
docker-compose exec frontend npm run lint
```

### Gestión de Volúmenes
```bash
# Ver volúmenes
docker volume ls

# Limpiar volúmenes no utilizados
docker volume prune

# Eliminar volúmenes específicos
docker volume rm staycumbrecita_postgres_data
```

### Logs y Debugging
```bash
# Ver logs de todos los servicios
docker-compose logs

# Ver logs de un servicio específico
docker-compose logs backend
docker-compose logs frontend

# Seguir logs en tiempo real
docker-compose logs -f backend

# Entrar al shell de un contenedor
docker-compose exec backend sh
docker-compose exec frontend sh
```

## 🔧 Solución de Problemas

### Problema: Puerto ya en uso
```bash
# Verificar qué está usando el puerto
lsof -i :3000
lsof -i :5001

# Cambiar puertos en docker-compose.yml
ports:
  - "3001:3000"  # Cambiar puerto local
```

### Problema: Cambios no se reflejan
```bash
# Reconstruir completamente
docker-compose down
docker-compose up --build --force-recreate

# Limpiar cache de Docker
docker system prune -a
```

### Problema: Base de datos no conecta
```bash
# Verificar que PostgreSQL esté ejecutándose
docker-compose ps postgres

# Ver logs de PostgreSQL
docker-compose logs postgres

# Reiniciar PostgreSQL
docker-compose restart postgres
```

### Problema: Memoria insuficiente
```bash
# Ajustar recursos en Docker Desktop
# Settings → Resources → Advanced
# Aumentar Memory y Swap
```

## 📁 Estructura de Archivos Docker

```
appWebCumbrecita/
├── docker-compose.yml          # Producción
├── docker-compose.dev.yml      # Desarrollo
├── .env                        # Variables de entorno
├── backend/
│   ├── Dockerfile             # Imagen del backend
│   └── .dockerignore          # Archivos ignorados
├── frontendStayAtCumbrecita/
│   ├── Dockerfile             # Imagen del frontend
│   └── .dockerignore          # Archivos ignorados
└── README-Docker.md           # Esta documentación
```

## 🔄 Flujo de Desarrollo

### 1. Desarrollo Local
```bash
# Modo desarrollo con hot reload
docker-compose -f docker-compose.dev.yml up --build
```

### 2. Testing
```bash
# Ejecutar tests en contenedor
docker-compose exec backend npm run test
docker-compose exec frontend npm run test
```

### 3. Producción
```bash
# Modo producción optimizado
docker-compose up --build -d
```

## 🚨 Comandos de Emergencia

### Resetear Todo
```bash
# Parar y eliminar todo
docker-compose down -v --remove-orphans

# Limpiar sistema completo
docker system prune -a --volumes

# Reconstruir desde cero
docker-compose up --build --force-recreate
```

### Backup de Base de Datos
```bash
# Crear backup
docker-compose exec postgres pg_dump -U postgres staycumbrecita > backup.sql

# Restaurar backup
docker-compose exec -T postgres psql -U postgres staycumbrecita < backup.sql
```

## 📈 Monitoreo y Performance

### Verificar Recursos
```bash
# Estadísticas de contenedores
docker stats

# Información del sistema
docker system df

# Información de imágenes
docker images
```

### Optimización
- Los Dockerfiles usan **multi-stage builds** para reducir tamaño
- Los `.dockerignore` excluyen archivos innecesarios
- Las imágenes Alpine son más ligeras
- Los volúmenes persistentes mantienen datos entre reinicios

## 🎯 Próximos Pasos

1. **Verificar variables de entorno** en `backend/.env` y `frontendStayAtCumbrecita/.env.local`
2. **Ejecutar** `docker-compose up --build`
3. **Verificar** que todos los servicios estén funcionando
4. **Acceder** a http://localhost:3000 para el frontend
5. **Probar** la API en http://localhost:5001/api

¡Ya tienes tu aplicación corriendo en Docker! 🎉 