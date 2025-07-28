# 🏨 StayAtCumbrecita Frontend

Una aplicación web moderna para la gestión integral de hoteles, construida con **Next.js 15**, **React 19**, **TypeScript** y **Tailwind CSS**.

## 🚀 Características Principales

### ✨ **Tecnologías**
- **Next.js 15** con App Router
- **React 19** con Server Components
- **TypeScript** para type safety
- **Tailwind CSS** + **Shadcn/ui** para styling
- **Zustand** para estado global
- **React Query** para manejo de datos
- **Axios** con interceptors automáticos

### 🛡️ **Arquitectura Robusta**
- **Autenticación JWT** con refresh automático
- **Middleware de Next.js** para protección de rutas
- **Error Boundaries** para manejo de errores
- **Lazy Loading** optimizado
- **Performance hooks** (debounce, throttle, memoización)

### 🎯 **Módulos Implementados**

#### 📦 **Módulo 1 - Fundamentos**
- ✅ Cliente HTTP con Axios e interceptors
- ✅ Sistema de autenticación completo
- ✅ Middleware de protección de rutas
- ✅ Variables de entorno configuradas

#### 🔄 **Módulo 2 - Estado y Datos**
- ✅ Zustand stores (auth, UI)
- ✅ React Query con cache inteligente
- ✅ Hooks personalizados para API
- ✅ Manejo global de errores

#### ⚡ **Módulo 3 - Optimización**
- ✅ Lazy loading de imágenes y componentes
- ✅ Componentes memoizados
- ✅ Performance hooks avanzados
- ✅ Virtual scrolling
- ✅ Loading states optimizados

## 🛠️ Instalación y Setup

### **Prerrequisitos**
- Node.js 18.0 o superior
- npm o yarn
- Backend NestJS corriendo en puerto 3002

### **1. Clonar e Instalar**
```bash
# Clonar el repositorio
git clone <repository-url>
cd appWebCumbrecita/frontend

# Instalar dependencias
npm install --legacy-peer-deps

# Copiar variables de entorno
cp env.example .env.local
```

### **2. Configurar Variables de Entorno**
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_TIMEOUT=10000
NODE_ENV=development
```

### **3. Ejecutar en Desarrollo**
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
frontend/
├── app/                          # App Router de Next.js
│   ├── (auth)/                   # Rutas de autenticación
│   ├── (dashboard)/              # Dashboard protegido
│   ├── globals.css               # Estilos globales
│   ├── layout.tsx                # Layout principal
│   └── page.tsx                  # Página de inicio
├── components/                   # Componentes reutilizables
│   ├── ui/                       # Componentes base (shadcn/ui)
│   ├── optimized/                # Componentes optimizados
│   └── error-boundary.tsx        # Error boundaries
├── hooks/                        # Hooks personalizados
│   ├── api/                      # Hooks para API calls
│   ├── use-performance.ts        # Hooks de performance
│   └── use-toast.ts              # Hook de notificaciones
├── lib/                          # Librerías y configuraciones
│   ├── api/                      # Cliente HTTP
│   ├── config/                   # Configuraciones
│   ├── providers/                # Providers de contexto
│   ├── store/                    # Stores de Zustand
│   └── utils.ts                  # Utilidades
├── middleware.ts                 # Middleware de Next.js
└── next.config.mjs               # Configuración de Next.js
```

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev                # Servidor de desarrollo
npm run build             # Build para producción
npm run start             # Servidor de producción
npm run preview           # Preview del build

# Calidad de código
npm run lint              # ESLint
npm run lint:fix          # Fix automático de ESLint
npm run type-check        # Verificación de TypeScript
npm run check             # Lint + Type check

# Análisis
npm run build:analyze     # Análisis del bundle
npm run clean             # Limpiar archivos build
```

## 🎨 Uso de Componentes

### **Autenticación**
```tsx
import { useAuthStore } from '@/lib/store/auth-store'
import { useAdminLogin } from '@/hooks/api/use-auth'

function LoginForm() {
  const { mutate: login, isPending } = useAdminLogin()
  const { user, isAuthenticated } = useAuthStore()
  
  const handleSubmit = (credentials) => {
    login(credentials)
  }
  
  return (
    // Formulario de login
  )
}
```

### **Gestión de Estado**
```tsx
import { useUIStore } from '@/lib/store/ui-store'

function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  
  return (
    <aside className={cn('sidebar', sidebarOpen && 'open')}>
      {/* Contenido del sidebar */}
    </aside>
  )
}
```

### **Llamadas API Optimizadas**
```tsx
import { useHotels } from '@/hooks/api/use-hotels'

function HotelsList() {
  const { data: hotels, isLoading, error } = useHotels({
    page: 1,
    limit: 10
  })
  
  if (isLoading) return <LoadingOverlay />
  if (error) return <ErrorMessage />
  
  return (
    <OptimizedList
      items={hotels}
      renderItem={(hotel) => <HotelCard hotel={hotel} />}
      keyExtractor={(hotel) => hotel.id}
    />
  )
}
```

### **Componentes Optimizados**
```tsx
import { LazyImage } from '@/components/ui/lazy-image'
import { MemoizedCard } from '@/components/optimized/memoized-components'

function HotelCard({ hotel }) {
  return (
    <MemoizedCard
      title={hotel.nombre}
      content={
        <div>
          <LazyImage
            src={hotel.imagenes[0]}
            alt={hotel.nombre}
            width={300}
            height={200}
          />
          <p>{hotel.descripcion}</p>
        </div>
      }
    />
  )
}
```

## 🚀 Deploy

### **Con Docker**
```bash
# Development
docker-compose up frontend-dev

# Production
docker-compose up frontend-prod
```

### **Vercel (Recomendado)**
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy a producción
vercel --prod
```

### **Build Manual**
```bash
npm run build:production
npm run start
```

## 🔐 Variables de Entorno

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `NEXT_PUBLIC_API_URL` | URL del backend API | ✅ |
| `NEXT_PUBLIC_TIMEOUT` | Timeout para peticiones HTTP | ❌ |
| `NODE_ENV` | Entorno de ejecución | ✅ |
| `NEXTAUTH_SECRET` | Secret para autenticación | ⚠️ Producción |
| `NEXTAUTH_URL` | URL de la aplicación | ⚠️ Producción |

## 🏗️ Arquitectura de Autenticación

### **Flujo de Login**
1. Usuario envía credenciales
2. Hook `useAdminLogin`/`useTouristLogin` hace petición
3. API responde con `{ user, token }`
4. Token se guarda en localStorage + cookies
5. Estado se actualiza en Zustand
6. Redirección automática según rol

### **Protección de Rutas**
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = getToken(request)
  const { pathname } = request.nextUrl
  
  // Rutas protegidas
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect('/auth/login')
    }
  }
  
  // Verificación de roles
  const userRole = getUserRole(token)
  if (pathname.startsWith('/admin') && userRole !== 'ADMIN') {
    return NextResponse.redirect('/unauthorized')
  }
}
```

## 📊 Performance

### **Optimizaciones Implementadas**
- **Code Splitting** automático con Next.js
- **Lazy Loading** de imágenes con Intersection Observer
- **Memoización** de componentes costosos
- **Virtual Scrolling** para listas grandes
- **Debounce/Throttle** en búsquedas
- **Bundle Analysis** con `npm run build:analyze`

### **Métricas Objetivo**
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.5s
- Bundle size: < 500KB gzipped

## 🐛 Debugging

### **React Query Devtools**
Disponible en desarrollo en la esquina inferior de la pantalla para inspeccionar el cache.

### **Performance Monitoring**
```tsx
import { usePerformanceMonitor } from '@/hooks/use-performance'

function ExpensiveComponent() {
  const { start, end } = usePerformanceMonitor('ExpensiveComponent')
  
  useEffect(() => {
    start()
    // Operación costosa
    end()
  }, [])
}
```

## 🤝 Contribución

1. Fork el repositorio
2. Crear rama de feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Add: nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

---

**Desarrollado con ❤️ para StayAtCumbrecita** 