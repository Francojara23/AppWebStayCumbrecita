# 🏨 Stay at Cumbrecita - Backend API

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">
  <strong>API Backend completa para la plataforma de hospedajes Stay at Cumbrecita</strong><br/>
  Construida con <a href="http://nestjs.com/" target="_blank">NestJS</a>, <a href="https://www.typescriptlang.org/" target="_blank">TypeScript</a> y <a href="https://www.postgresql.org/" target="_blank">PostgreSQL</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="Versión NPM" /></a>
  <a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Licencia del Paquete" /></a>
  <a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
</p>

## 📋 Descripción

**Stay at Cumbrecita Backend** es una API REST completa para la gestión integral de hospedajes, reservas y servicios turísticos. Desarrollada con arquitectura modular, patterns SOLID y tecnologías enterprise, proporciona una base sólida y escalable para plataformas de turismo.

---

## 🚀 Características Principales

### ⚡ **Tecnologías Core**
- **Framework**: NestJS 10+ con TypeScript
- **Base de Datos**: PostgreSQL con TypeORM
- **Autenticación**: JWT con refresh tokens automáticos
- **Documentación**: Swagger/OpenAPI 3.0
- **Validación**: Class-validator + DTO patterns
- **Arquitectura**: Modular, SOLID, Clean Architecture

### 🛡️ **Seguridad Enterprise**
- **Autenticación JWT** con refresh automático
- **Sistema de roles granular** por funcionalidad
- **Encriptación AES-256** para datos sensibles
- **Rate limiting** y protección CORS
- **Validación exhaustiva** de inputs

### 📊 **Business Intelligence**
- **Reportes avanzados** con vistas materializadas
- **KPIs en tiempo real** de ocupación e ingresos
- **Analytics** de comportamiento de usuarios
- **Dashboards** con métricas empresariales

### 🔔 **Comunicaciones**
- **WebSocket** para notificaciones en tiempo real
- **Firebase Cloud Messaging** para móviles
- **Sistema de email** con 8 plantillas profesionales
- **Chatbot IA** integrado con OpenAI

---

## 🏗️ Arquitectura del Sistema

### **22 Módulos Principales Implementados**

#### 🔐 **Autenticación y Usuarios**
```
auth/           - Sistema completo de autenticación
├── Login/registro con verificación email
├── Reset password con tokens seguros  
├── JWT tokens con refresh automático
├── Middleware de protección de rutas
└── Interceptors de auto-refresh

users/          - Gestión de cuentas de usuario
├── CRUD completo de usuarios
├── Perfiles personalizables
├── Gestión de preferencias
└── Historial de actividad

roles/          - Sistema granular de permisos
├── Roles jerárquicos (Super Admin, Admin, Empleado)
├── Permisos específicos por funcionalidad
├── Asignación dinámica de roles
└── Control de acceso por hospedaje

permisos/       - Control de acceso específico
├── Permisos granulares por acción
├── Validación en tiempo real
├── Auditoría de accesos
└── Gestión de excepciones
```

#### 🏨 **Gestión Hotelera**
```
hospedajes/     - Core del sistema hotelero
├── CRUD completo de hospedajes
├── Sistema de filtros avanzados
├── Destacados con publicidad premium
├── Gestión de multimedia (Cloudinary)
├── Calificaciones y reviews
└── Estados y disponibilidad

habitaciones/   - Gestión inteligente de habitaciones
├── Tipos y capacidades flexibles
├── Precios dinámicos por temporada
├── Motor de disponibilidad complejo
├── Servicios por habitación
├── Historial de precios
└── Reglas de ocupación

tipos-hospedaje/ - Categorización flexible
├── Hotel, Hostería, Cabaña, Apart
├── Características específicas
├── Servicios incluidos por tipo
└── Configuración personalizable

tipos-habitacion/ - Tipología de habitaciones
├── Individual, Doble, Suite, etc.
├── Capacidades y comodidades
├── Precios base por tipo
└── Reglas de ocupación

servicios/      - Catálogo de servicios
├── Servicios de hospedaje general
├── Servicios específicos por habitación
├── Precios y disponibilidad
├── Asignación automática
└── Servicios premium
```

#### 💰 **Motor Financiero**
```
reservas/       - Sistema avanzado de reservas
├── Motor de disponibilidad inteligente
├── Validación de conflictos temporales
├── Estados de reserva (8 estados)
├── Check-in/Check-out con QR
├── Gestión de huéspedes múltiples
├── Notificaciones automáticas
└── Cancelaciones y modificaciones

pagos/          - Procesamiento de pagos robusto
├── Tarjetas de crédito/débito
├── Transferencias bancarias
├── Estados de pago (Pendiente, Procesando, Aprobado)
├── Historial completo de transacciones
├── Validación de tarjetas en tiempo real
├── Integración con pasarelas
└── Reportes financieros

tarjetas/       - Gestión segura de tarjetas
├── Validación de números de tarjeta
├── Encriptación AES-256
├── Detección de duplicados
├── Historial de uso
└── Cumplimiento PCI-DSS

publicidad/     - Sistema de promoción
├── Destacados premium
├── Renovación automática
├── Métricas de performance
├── Segmentación por ubicación
└── ROI tracking
```

#### 👥 **Gestión Administrativa**
```
owners/         - Propietarios de hospedajes
├── Registro y verificación
├── Múltiples hospedajes por owner
├── Dashboard personalizado
├── Reportes de ingresos
└── Gestión de empleados

empleados/      - Personal por hospedaje
├── Roles específicos (Recepcionista, Gerente)
├── Permisos granulares
├── Horarios y turnos
├── Acceso multi-hospedaje
└── Auditoría de acciones

consultas/      - Sistema de tickets/soporte
├── Consultas categorizadas
├── Sistema de respuestas
├── Estados de seguimiento
├── Escalación automática
└── Métricas de satisfacción

opiniones/      - Reviews y calificaciones
├── Sistema de estrellas (1-5)
├── Reviews detalladas
├── Validación de huéspedes reales
├── Respuestas de propietarios
├── Moderación automática
└── Analytics de satisfacción
```

#### 🔔 **Sistema de Comunicaciones**
```
notificaciones/ - Notificaciones en tiempo real
├── WebSocket para tiempo real
├── Firebase Cloud Messaging
├── Tipos de notificación (14 tipos)
├── Preferencias de usuario
├── Historial completo
└── Métricas de entrega

mail/           - Sistema de email profesional
├── 8 plantillas Handlebars
├── Email transaccional
├── Confirmaciones de reserva
├── Recordatorios automáticos
├── Reseteo de contraseñas
├── Notificaciones de pago
└── Reviews post-estadía

chatbot/        - Integración con IA
├── Configuración por hospedaje
├── Subida de PDFs personalizados
├── Tonos de conversación (5 estilos)
├── Entrenamiento automático
└── Métricas de uso
```

#### 📊 **Business Intelligence**
```
reportes/       - Sistema BI completo
├── Vistas materializadas optimizadas
├── KPIs de ocupación en tiempo real
├── Ingresos mensuales/anuales
├── Análisis de competencia
├── Reportes personalizables
├── Exportación a Excel/PDF
├── Tareas programadas (cron)
└── Cache inteligente

uploads/        - Gestión multimedia
├── Imágenes optimizadas (Cloudinary)
├── Documentos seguros
├── Validación de tipos MIME
├── Redimensionado automático
├── CDN global
└── Backup automático

qr-code/        - Códigos QR seguros
├── Generación con JWT
├── Validación con timestamp
├── Check-in contactless
├── Integración con Cloudinary
└── Auditoría de escaneos
```

---

## 🛠️ Instalación y Configuración

### **Prerrequisitos**
- **Node.js** 18.0+ y npm/yarn
- **PostgreSQL** 13+ con extensiones
- **Redis** (opcional, para cache)
- **Cloudinary** account para multimedia

### **1. Configuración Inicial**
```bash
# Clonar el repositorio
git clone <repository-url>
cd backendStayCumbrecita

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales
```

### **2. Base de Datos**
```bash
# Crear base de datos PostgreSQL
createdb StayAtCumbrecita

# Las tablas se crean automáticamente con TypeORM
# synchronize: true (solo desarrollo)
```

### **3. Variables de Entorno Críticas**
```env
# Servidor
PORT=5001
HOST=Host

# Base de datos
DB_HOST=db_host
DB_PORT=db_porte
DB_USERNAME=Db_username
DB_PASSWORD=Db_password
DB_DATABASE=db_database

# Seguridad (CAMBIAR EN PRODUCCIÓN)
ENCRYPTION_KEY=Your_Key
ENCRYPTION_IV=Your_Key
SALT_ROUNDS=10
SECRET_PEPPER=Your_Key
JWT_SECRET=Your_Key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Firebase (opcional)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

### **4. Ejecución**
```bash
# Desarrollo con hot reload
npm run start:dev

# Producción
npm run build
npm run start:prod

# Docker
docker-compose up --build
```

---

## 📚 Documentación API

### **Swagger/OpenAPI**
- **Desarrollo**: http://localhost:5001/api
- **Documentación interactiva** con todos los endpoints
- **Schemas** y modelos documentados
- **Ejemplos** de requests/responses

### **Endpoints Principales**

#### **🔐 Autenticación**
```
POST   /auth/register          - Registro de usuarios
POST   /auth/login             - Login con JWT
POST   /auth/refresh           - Refresh token
POST   /auth/forgot-password   - Reseteo de contraseña
GET    /auth/verify-email      - Verificación de email
```

#### **🏨 Hospedajes**
```
GET    /hospedajes             - Listar con filtros avanzados
GET    /hospedajes/destacados  - Hospedajes con publicidad
GET    /hospedajes/:id         - Detalle completo
POST   /hospedajes             - Crear hospedaje
PUT    /hospedajes/:id         - Actualizar
DELETE /hospedajes/:id         - Eliminar
```

#### **🛏️ Habitaciones**
```
GET    /habitaciones/disponibilidad  - Consultar disponibilidad
GET    /habitaciones/precios         - Obtener precios
POST   /habitaciones/precios/ajustar - Ajustar precios dinámicos
GET    /habitaciones/:id/servicios   - Servicios por habitación
```

#### **💳 Reservas y Pagos**
```
POST   /reservas/cotizar       - Cotizar reserva
POST   /reservas               - Crear reserva
GET    /reservas/mis-reservas  - Reservas del usuario
POST   /pagos                  - Procesar pago
PUT    /pagos/:id/estado       - Cambiar estado
```

#### **📊 Reportes**
```
GET    /reportes/kpis          - KPIs principales
GET    /reportes/ocupacion     - Métricas de ocupación
GET    /reportes/ingresos      - Reportes financieros
POST   /reportes/export        - Exportar reportes
```

---

## 🏗️ Arquitectura Técnica

### **Patterns Implementados**
- **Repository Pattern** para acceso a datos
- **DTO Pattern** para validación y transferencia
- **Guard Pattern** para autorización
- **Interceptor Pattern** para logging y transformación
- **Strategy Pattern** para diferentes tipos de pago
- **Observer Pattern** para notificaciones

### **Estructura de Directorios**
```
src/
├── auth/                 # Autenticación y autorización
│   ├── guards/          # Guards de protección
│   ├── jwt/             # Estrategias JWT
│   └── interceptors/    # Interceptors de auth
├── common/              # Utilidades compartidas
│   ├── decorators/      # Decorators personalizados
│   ├── enums/           # Enumeraciones
│   ├── pipes/           # Pipes de validación
│   └── transformers/    # Transformadores de datos
├── [modulo]/            # Cada módulo de negocio
│   ├── dto/             # Data Transfer Objects
│   ├── entidades/       # Entidades TypeORM
│   ├── [modulo].controller.ts
│   ├── [modulo].service.ts
│   └── [modulo].module.ts
└── main.ts              # Bootstrap de la aplicación
```

### **Base de Datos - Entidades Principales**
```sql
-- 25+ tablas principales
User, Role, Permission, UserRole, RolePermission
Hospedaje, Habitacion, TipoHospedaje, TipoHabitacion
Reserva, ReservaLinea, HuespedReserva, Acompaniante
Pago, Tarjeta, HistorialEstadoPago
Servicio, HospedajeServicio, HabitacionServicio
Opinion, Consulta, RespuestaConsulta
Notificacion, Empleado, Owner
Publicidad, ChatbotDocument
```

---

## 🚀 Características Avanzadas

### **🔄 Sistema de Estados**
```typescript
// Estados de Reserva (8 estados)
enum EstadoReserva {
  CREADA = 'CREADA',
  PENDIENTE_PAGO = 'PENDIENTE_PAGO', 
  CONFIRMADA = 'CONFIRMADA',
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT',
  CANCELADA = 'CANCELADA',
  NO_SHOW = 'NO_SHOW',
  REEMBOLSADA = 'REEMBOLSADA'
}

// Estados de Pago (4 estados)
enum EstadoPago {
  PENDIENTE = 'PENDIENTE',
  PROCESANDO = 'PROCESANDO',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO'
}
```

### **🧠 Motor de Disponibilidad**
```typescript
// Algoritmo complejo de verificación
- Validación de solapamiento temporal
- Múltiples habitaciones del mismo tipo
- Estados de limpieza y mantenimiento
- Bloqueos manuales por fecha
- Reservas en proceso
- Conflictos de check-in/check-out
```

### **💰 Precios Dinámicos**
```typescript
// Sistema de ajustes automáticos
- Precios base por tipo de habitación
- Ajustes por temporada alta/baja
- Factores de ocupación
- Eventos especiales
- Competencia en la zona
- Historial de demanda
```

### **🔔 Notificaciones (14 Tipos)**
```typescript
enum TipoNotificacion {
  NUEVA_RESERVA = 'NUEVA_RESERVA',
  PAGO_APROBADO = 'PAGO_APROBADO',
  PAGO_RECHAZADO = 'PAGO_RECHAZADO',
  RESERVA_CANCELADA = 'RESERVA_CANCELADA',
  CHECK_IN_RECORDATORIO = 'CHECK_IN_RECORDATORIO',
  NUEVA_OPINION = 'NUEVA_OPINION',
  CONSULTA_RECIBIDA = 'CONSULTA_RECIBIDA',
  PUBLICIDAD_EXPIRADA = 'PUBLICIDAD_EXPIRADA',
  // ... y 6 tipos más
}
```

---

## 📈 Performance y Escalabilidad

### **Optimizaciones Implementadas**
- **Vistas materializadas** para reportes complejos
- **Índices compuestos** en consultas frecuentes
- **Paginación** en todos los listados
- **Cache Redis** para datos estáticos
- **Lazy loading** en relaciones TypeORM
- **Query optimization** con QueryBuilder

### **Tareas Programadas**
```typescript
// Cron jobs automatizados
@Cron('0 0 * * *')  // Diario
async refreshViews() {
  // Actualizar vistas materializadas
  // Limpiar cache obsoleto
  // Generar estadísticas
  // Cleanup de datos antiguos
}
```

### **Métricas y Monitoreo**
- **Health checks** automatizados
- **Logging estructurado** con Winston
- **Métricas de performance**
- **Error tracking** y alertas
- **Database monitoring**

---

### **Herramientas de Calidad**
- **ESLint** para code quality
- **Prettier** para formateo
- **Husky** para git hooks
- **Jest** para testing
- **SonarQube** para análisis estático

---

## 🔒 Seguridad

### **Medidas Implementadas**
- **Encriptación AES-256** para datos sensibles
- **Hashing bcrypt** para contraseñas
- **JWT con refresh tokens** seguros
- **Rate limiting** anti-brute force
- **Validation pipes** exhaustivos
- **CORS** configurado correctamente
- **Helmet** para headers de seguridad

### **Cumplimiento**
- **GDPR** compliant
- **PCI-DSS** para pagos
- **OWASP** top 10 covered
- **Data encryption** at rest y in transit

---

## 📦 Deployment

### **Docker Support**
```dockerfile
# Multi-stage build optimizado
FROM node:18-alpine AS builder
# ... build process

FROM node:18-alpine AS production  
# ... production image
```

### **Environment Configs**
- **Development**: Hot reload + debugging
- **Staging**: Similar a producción
- **Production**: Optimizado + monitoring

### **CI/CD Pipeline**
```yaml
# GitHub Actions / GitLab CI
- Lint y Tests
- Build Docker image
- Security scanning
- Deploy to staging
- Smoke tests
- Deploy to production
```

---

## 🤝 Contribución

### **Desarrollo**
1. Fork del repositorio
2. Feature branch: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'feat: agregar nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Pull Request con descripción detallada

### **Coding Standards**
- **TypeScript** strict mode
- **ESLint** + **Prettier** obligatorios
- **Conventional Commits** para mensajes
- **Tests** obligatorios para nuevas features
- **Documentation** actualizada

---

## 📞 Soporte

### **Documentación Adicional**
- [API Documentation](http://localhost:5001/api) - Swagger interactivo
- [Database Schema](./docs/database.md) - Esquema completo
- [Architecture Decision Records](./docs/adr/) - Decisiones técnicas

### **Contacto**
- **Equipo de Desarrollo**: dev@stayatcumbrecita.com
- **Issues**: GitHub Issues del repositorio
- **Wiki**: Documentación técnica completa

---

## 📄 Licencia

Este proyecto está bajo la licencia [MIT](LICENSE) - ver el archivo LICENSE para más detalles.

---

<p align="center">
  <strong>🏨 Stay at Cumbrecita Backend - Arquitectura Enterprise para Turismo Digital</strong>
</p>
