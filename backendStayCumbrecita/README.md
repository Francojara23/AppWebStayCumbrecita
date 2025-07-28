# 🏨 Stay at Cumbrecita - Backend

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">
  Backend para la plataforma de hospedajes <strong>Stay at Cumbrecita</strong> - Una aplicación completa de gestión hotelera construida con <a href="http://nestjs.com/" target="_blank">NestJS</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="Versión NPM" /></a>
  <a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Licencia del Paquete" /></a>
  <a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="Descargas NPM" /></a>
</p>

## 📋 Descripción

**Stay at Cumbrecita** es una plataforma integral para la gestión de hospedajes y reservas hoteleras. Este backend, desarrollado con **NestJS** y **TypeScript**, proporciona una API REST completa con funcionalidades avanzadas de Business Intelligence, gestión de pagos, notificaciones en tiempo real y mucho más.

### 🎯 Características Principales

- 🏨 **Gestión completa de hospedajes** y habitaciones
- 🔐 **Sistema de autenticación** JWT con roles granulares
- 💳 **Procesamiento de pagos** con tarjetas de crédito/débito
- 📊 **Módulo de reportes** y Business Intelligence
- 🔔 **Notificaciones en tiempo real** (WebSocket + FCM)
- 📧 **Sistema de email** con plantillas Handlebars
- 🖼️ **Gestión de multimedia** (Cloudinary)
- 📈 **Sistema de publicidad** con renovación automática
- ⭐ **Módulo de opiniones** y calificaciones
- 👥 **Gestión de empleados** y roles por hotel
- 📱 **API REST** completamente documentada con Swagger

## 🚀 Configuración del Proyecto

### Prerequisitos

- **Node.js** (v18 o superior)
- **npm** o **yarn**
- **PostgreSQL** (v13 o superior)
- **Redis** (opcional, para caché)

### Instalación

```bash
# Clonar el repositorio
$ git clone <url-del-repositorio>
$ cd backend

# Instalar dependencias
$ npm install
```

### Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto:

```bash
# Base de datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=tu_usuario
DB_PASSWORD=tu_contraseña
DB_DATABASE=stay_at_cumbrecita

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro
JWT_EXPIRES_IN=24h

# Cloudinary (para imágenes)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Email (Nodemailer)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=tu_email@gmail.com
MAIL_PASS=tu_contraseña_de_app

# Firebase Cloud Messaging (notificaciones push)
FIREBASE_PROJECT_ID=tu_project_id
FIREBASE_CLIENT_EMAIL=tu_client_email
FIREBASE_PRIVATE_KEY=tu_private_key
```

## 🛠️ Comandos de Desarrollo

```bash
# Desarrollo (watch mode)
$ npm run start:dev

# Producción
$ npm run start:prod

# Compilar proyecto
$ npm run build

# Modo desarrollo simple
$ npm run start
```

## 🧪 Ejecutar Tests

```bash
# Tests unitarios
$ npm run test

# Tests end-to-end
$ npm run test:e2e

# Cobertura de tests
$ npm run test:cov

# Tests en modo watch
$ npm run test:watch
```

## 📁 Estructura del Proyecto

```
src/
├── auth/                 # Autenticación JWT y gestión de usuarios
├── usuarios/             # Gestión de usuarios del sistema
├── roles/                # Sistema de roles y permisos
├── hospedajes/           # Gestión de establecimientos hoteleros
├── habitaciones/         # Gestión de habitaciones y disponibilidad
├── reservas/             # Sistema de reservas y check-in/out
├── pagos/                # Procesamiento de pagos y historial
├── empleados/            # Gestión de personal hotelero
├── servicios/            # Servicios adicionales (spa, wifi, etc.)
├── publicidad/           # Sistema de promoción de hospedajes
├── opiniones/            # Reseñas y calificaciones
├── reportes/             # Business Intelligence y analytics
├── notificaciones/       # Notificaciones en tiempo real
├── mail/                 # Sistema de correo electrónico
├── uploads/              # Gestión de archivos multimedia
├── common/               # Utilidades compartidas
│   ├── enums/           # Enumeraciones del sistema
│   ├── decorators/      # Decoradores personalizados
│   └── guards/          # Guards de autenticación
└── app.module.ts         # Módulo principal de la aplicación
```

## 🔐 Sistema de Roles

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| **SUPER_ADMIN** | Administrador del sistema | Acceso total |
| **PROPIETARIO** | Dueño de hospedaje | Gestión de sus hospedajes |
| **ADMIN** | Administrador de hotel | Gestión del hotel asignado |
| **EMPLEADO** | Empleado de hotel | Operaciones básicas |
| **TURISTA** | Cliente/huésped | Reservas y consultas |

## 📊 Módulo de Reportes

El sistema incluye un **módulo completo de Business Intelligence** con:

- 📈 **KPIs ejecutivos** (ingresos, ocupación, clientes únicos)
- 📅 **Análisis temporal** (mensual, estacional)
- 🏆 **Rankings** (habitaciones top, mejores meses)
- 🌍 **Segmentación** (por origen, tipo de habitación)
- 📤 **Exportación** (CSV, Excel)
- ⚡ **Optimización** (vistas materializadas, caché)

### Endpoints de Reportes

```bash
GET /api/reports/kpis                    # KPIs principales
GET /api/reports/reservations/by-month   # Reservas mensuales
GET /api/reports/revenue/by-month        # Ingresos mensuales
GET /api/reports/occupancy/by-hotel      # Ocupación por hotel
GET /api/reports/export                  # Exportar a CSV/XLSX
```

## 🔔 Notificaciones en Tiempo Real

- **WebSocket Gateway** para notificaciones instantáneas
- **Firebase Cloud Messaging** para notificaciones push
- **Sistema de email** con plantillas profesionales
- **Notificaciones por eventos**: reservas, pagos, opiniones

## 💳 Sistema de Pagos

- **Procesamiento seguro** de tarjetas de crédito/débito
- **Historial completo** de transacciones
- **Estados de pago** con seguimiento
- **Integración** con el sistema de reservas
- **Renovación automática** para publicidad

## 📱 API Documentation

La API está completamente documentada con **Swagger UI**:

```bash
# Una vez iniciado el servidor, visitar:
http://localhost:3000/api/docs
```

### Endpoints Principales

```bash
# Autenticación
POST /api/auth/login           # Iniciar sesión
POST /api/auth/register        # Registrar usuario

# Hospedajes
GET  /api/hospedajes           # Listar hospedajes
POST /api/hospedajes           # Crear hospedaje
GET  /api/hospedajes/:id       # Obtener hospedaje

# Reservas
POST /api/reservas             # Crear reserva
GET  /api/reservas/:id         # Obtener reserva
PATCH /api/reservas/:id/estado # Actualizar estado

# Reportes
GET  /api/reports/kpis         # KPIs del dashboard
GET  /api/reports/export       # Exportar reportes
```

## 🐳 Deployment

### Docker (Recomendado)

```bash
# Construir imagen
$ docker build -t stay-at-cumbrecita-backend .

# Ejecutar contenedor
$ docker run -p 3000:3000 stay-at-cumbrecita-backend
```

### Producción Tradicional

```bash
# Compilar proyecto
$ npm run build

# Ejecutar en producción
$ npm run start:prod
```

## 🔧 Configuraciones Adicionales

### Base de Datos

El proyecto usa **PostgreSQL** con **TypeORM**. Las migraciones se ejecutan automáticamente en desarrollo.

```bash
# Generar migración
$ npm run migration:generate -- -n NombreMigracion

# Ejecutar migraciones
$ npm run migration:run

# Revertir migración
$ npm run migration:revert
```

### Tareas Programadas

El sistema incluye **tareas cron** automáticas:

- ⏰ **Cada 5 minutos**: Actualización de vistas de reportes
- ⏰ **Cada hora**: Estadísticas pre-calculadas
- ⏰ **Diario (3 AM)**: Limpieza de datos antiguos
- ⏰ **Mensual**: Renovación automática de publicidad

## 🐛 Debugging

```bash
# Modo debug
$ npm run start:debug

# Ver logs detallados
$ DEBUG=* npm run start:dev
```

## 📚 Recursos Útiles

- **[Documentación de NestJS](https://docs.nestjs.com)** - Framework principal
- **[TypeORM Docs](https://typeorm.io/)** - ORM para base de datos
- **[Swagger UI](http://localhost:3000/api/docs)** - Documentación de API
- **[Cloudinary Docs](https://cloudinary.com/documentation)** - Gestión de imágenes

## 🤝 Contribuir

1. **Fork** del proyecto
2. Crear **feature branch** (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** de cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. **Push** al branch (`git push origin feature/nueva-funcionalidad`)
5. Crear **Pull Request**

### Estándares de Código

- **ESLint** y **Prettier** configurados
- **Convenciones de naming** consistentes
- **Documentación** de métodos complejos
- **Tests unitarios** para nueva funcionalidad

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 👥 Equipo de Desarrollo

- **Desarrollador Principal**: Franco José Jara
- **Arquitectura**: NestJS + TypeScript + PostgreSQL
- **Infraestructura**: Docker + Node.js

## 📞 Soporte

Para preguntas o soporte técnico:

- 📧 **Email**: soporte@stayatcumbrecita.com
- 💬 **Discord**: [Canal del proyecto](#)
- 📞 **Teléfono**: +54 (xxx) xxx-xxxx

---

<p align="center">
  <strong>Stay at Cumbrecita Backend</strong><br>
  <em>Desarrollado con ❤️ usando NestJS</em>
</p>
