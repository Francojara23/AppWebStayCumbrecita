# 📊 Módulo de Reportes - Stay at Cumbrecita

## Descripción General

El módulo de reportes proporciona un sistema completo de Business Intelligence para la plataforma Stay at Cumbrecita. Incluye KPIs ejecutivos, análitica de negocio, exportación de datos y optimizaciones de performance.

## 🎯 Características Principales

### 📈 KPIs y Métricas
- **Dashboard Ejecutivo**: Métricas clave en tiempo real
- **Análisis Temporal**: Históricos mensuales y comparativas
- **Segmentación**: Por hotel, tipo de habitación, usuario
- **Tendencias**: Identificación de patrones de negocio

### 📊 Tipos de Reportes

1. **KPIs Principales (`/api/reports/kpis`)**
   - Total de reservas
   - Clientes únicos
   - Ingresos totales
   - Ticket promedio
   - Tasa de ocupación

2. **Reservas (`/api/reports/reservations/*`)**
   - Por mes: `by-month`
   - Por estado: `by-status`

3. **Ingresos (`/api/reports/revenue/*`)**
   - Por mes: `by-month`
   - Por tipo de habitación: `by-room-type`

4. **Ocupación (`/api/reports/occupancy/*`)**
   - Por hotel: `by-hotel`
   - Por tipo de habitación: `by-room-type`

5. **Análisis de Clientes (`/api/reports/tourists/*`)**
   - Por origen: `by-origin`

6. **Rankings (`/api/reports/top-rooms`)**
   - Habitaciones más reservadas

7. **Optimización (`/api/reports/best-month`)**
   - Mejor mes del año

### 🔒 Seguridad por Roles

| Rol | Acceso | Descripción |
|-----|--------|-------------|
| `SUPER_ADMIN` | ✅ Todos los hoteles | Acceso completo sin restricciones |
| `PROPIETARIO` | ✅ Sus hoteles | Solo hoteles de su propiedad |
| `ADMIN` | ✅ Su hotel | Hotel donde trabaja como admin |
| `EMPLEADO` | ✅ Su hotel | Hotel donde está empleado |
| `TURISTA` | ❌ Sin acceso | Forbidden (403) |

### 📤 Exportación de Datos

**Endpoint**: `GET /api/reports/export`

**Formatos soportados**:
- 📄 **CSV**: Para análisis en Excel/Google Sheets
- 📊 **XLSX**: Formato Excel nativo con styling

**Parámetros**:
```typescript
{
  report: 'kpis' | 'reservations_by_month' | 'revenue_by_month' | ...,
  format: 'csv' | 'xlsx',
  hotelId?: string,
  from?: string,
  to?: string
}
```

## 🚀 Endpoints API

### Autenticación
Todos los endpoints requieren:
```bash
Authorization: Bearer <JWT_TOKEN>
```

### Filtros Comunes
```typescript
interface FiltrosKpiDto {
  hotelId?: string;    // UUID del hotel
  roomTypeId?: string; // UUID del tipo de habitación
  from?: string;       // Fecha inicio (ISO string)
  to?: string;         // Fecha fin (ISO string)
  limit?: number;      // Límite de resultados (default: 10)
}
```

### Ejemplos de Uso

#### 1. Obtener KPIs del último mes
```bash
GET /api/reports/kpis?from=2024-05-01&to=2024-05-31
```

#### 2. Ingresos mensuales de un hotel específico
```bash
GET /api/reports/revenue/by-month?hotelId=123e4567-e89b-12d3-a456-426614174000
```

#### 3. Exportar top habitaciones a Excel
```bash
GET /api/reports/export?report=top_rooms&format=xlsx&limit=20
```

## ⚡ Optimizaciones de Performance

### Vistas Materializadas
El sistema incluye vistas SQL optimizadas que se actualizan automáticamente:

- **`vw_revenue_mensual`**: Ingresos agregados por mes
- **`vw_occupancy`**: Tasas de ocupación pre-calculadas

### Tareas Programadas (Cron)
```typescript
// Cada 5 minutos - Actualizar vistas
@Cron(CronExpression.EVERY_5_MINUTES)
refreshMaterializedViews()

// Cada 30 minutos - Limpiar caché  
@Cron(CronExpression.EVERY_30_MINUTES)
clearReportsCache()

// Cada hora - Estadísticas pre-calculadas
@Cron(CronExpression.EVERY_HOUR)
generatePreCalculatedStats()

// 3 AM diario - Cleanup de datos antiguos
@Cron(CronExpression.EVERY_DAY_AT_3AM)
cleanupOldData()
```

### Tabla de Estadísticas Pre-calculadas
```sql
CREATE TABLE estadisticas_precalculadas (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  hospedaje_id UUID,
  periodo DATE NOT NULL,
  datos JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tipo, hospedaje_id, periodo)
);
```

## 🏗️ Arquitectura Técnica

### Estructura de Archivos
```
src/reportes/
├── dto/
│   ├── rango-fechas.dto.ts    # DTO base para filtros de fecha
│   ├── filtros-kpi.dto.ts     # DTO extendido para filtros
│   └── export.dto.ts          # DTO para exportación
├── sql/
│   ├── vw_revenue_mensual.sql # Vista de ingresos mensuales
│   └── vw_occupancy.sql       # Vista de ocupación
├── tasks/
│   └── refresh-views.task.ts  # Tareas programadas
├── reportes.controller.ts     # Controlador REST
├── reportes.service.ts        # Lógica de negocio
├── reportes.module.ts         # Configuración del módulo
└── README.md                  # Esta documentación
```

### Dependencias
```json
{
  "dependencies": {
    "json2csv": "^6.0.0",
    "exceljs": "^4.4.0",
    "@nestjs/schedule": "^4.0.0",
    "cache-manager": "^5.2.4"
  },
  "devDependencies": {
    "@types/json2csv": "^5.0.7"
  }
}
```

### Entidades Relacionadas
- ✅ `Reserva` - Reservas de huéspedes
- ✅ `ReservaLinea` - Líneas de detalle de reservas
- ✅ `Pago` - Transacciones de pago
- ✅ `Hospedaje` - Establecimientos hoteleros
- ✅ `HabitacionEntity` - Habitaciones disponibles
- ✅ `Usuario` - Usuarios del sistema
- ✅ `TipoHabitacionEntity` - Categorías de habitaciones
- ✅ `Empleado` - Empleados de hoteles

## 🧪 Testing

### Endpoints de Ejemplo
```bash
# KPIs generales
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/reports/kpis"

# Reservas por mes con filtro de hotel
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/reports/reservations/by-month?hotelId=uuid&limit=12"

# Exportar ingresos a CSV
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/reports/export?report=revenue_by_month&format=csv" \
  --output ingresos.csv
```

### Casos de Prueba Importantes
1. **Seguridad**: Verificar que cada rol acceda solo a sus datos
2. **Performance**: Queries complejas deben ejecutarse en <2 segundos
3. **Exportación**: Archivos CSV/XLSX válidos
4. **Filtros**: Rangos de fechas y filtros por hotel funcionando
5. **Paginación**: Límites y offsets correctos

## 🔧 Configuración

### Variables de Entorno
El módulo usa las mismas variables de conexión DB del proyecto principal:
- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_DATABASE`

### Instalación
```bash
# Instalar dependencias
npm install json2csv exceljs @nestjs/schedule cache-manager
npm install --save-dev @types/json2csv

# Ejecutar migraciones (si es necesario)
npm run migration:run

# Compilar proyecto
npm run build

# Ejecutar
npm run start:dev
```

## 📝 Ejemplos de Respuesta

### KPIs
```json
{
  "total_reservas": 156,
  "clientes_unicos": 89,
  "ingresos_totales": 425800.50,
  "ticket_promedio": 2731.41,
  "hoteles_activos": 3,
  "habitaciones_totales": 24,
  "tasa_ocupacion": 67.50
}
```

### Ingresos por Mes
```json
[
  {
    "mes": "2024-05-01T00:00:00Z",
    "reservas_pagadas": 23,
    "ingresos_brutos": 89750.00,
    "ingresos_netos": 74173.55,
    "impuestos": 15576.45,
    "ticket_promedio": 3902.17,
    "clientes_unicos": 18
  }
]
```

## 🚀 Estado del Desarrollo

### ✅ Funcionalidades Completadas
- [x] **Estructura base del módulo**
- [x] **11 endpoints de reportes**
- [x] **Sistema de exportación CSV/XLSX**
- [x] **Seguridad por roles completa**
- [x] **Queries SQL optimizadas**
- [x] **Documentación Swagger**
- [x] **Tareas programadas**
- [x] **Vistas materializadas**

### 🔄 En Desarrollo
- [ ] Caché con Redis
- [ ] Graficos embebidos (Chart.js)
- [ ] Alertas automáticas
- [ ] Dashboard real-time

### 🎯 Próximas Mejoras
- [ ] Machine Learning para predicciones
- [ ] Integración con BI externos (PowerBI, Tableau)
- [ ] APIs de terceros (Google Analytics, etc.)
- [ ] Reportes personalizables por usuario

---

**Desarrollado para Stay at Cumbrecita Backend**  
*Tiempo de implementación: 6-10 horas*  
*Estado: ✅ Funcional y listo para producción* 