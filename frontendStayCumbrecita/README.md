# 🌐 StayAtCumbrecita Frontend

<p align="center">
  <img src="https://nextjs.org/static/favicon/favicon-32x32.png" width="32" alt="Next.js" />
  <img src="https://reactjs.org/favicon.ico" width="32" alt="React" />
  <img src="https://www.typescriptlang.org/favicon-32x32.png" width="32" alt="TypeScript" />
  <img src="https://tailwindcss.com/favicons/favicon-32x32.png" width="32" alt="Tailwind CSS" />
</p>

<p align="center">
  <strong>Aplicación web moderna para la gestión integral de hoteles y reservas</strong><br/>
  Construida con <strong>Next.js 15</strong>, <strong>React 19</strong>, <strong>TypeScript</strong> y <strong>Tailwind CSS</strong>
</p>

<p align="center">
  <a href="https://nextjs.org" target="_blank"><img src="https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js" alt="Next.js 15" /></a>
  <a href="https://reactjs.org" target="_blank"><img src="https://img.shields.io/badge/React-19-blue?style=flat&logo=react" alt="React 19" /></a>
  <a href="https://www.typescriptlang.org" target="_blank"><img src="https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat&logo=typescript" alt="TypeScript" /></a>
  <a href="https://tailwindcss.com" target="_blank"><img src="https://img.shields.io/badge/Tailwind-3.0+-06B6D4?style=flat&logo=tailwindcss" alt="Tailwind CSS" /></a>
</p>

## 📋 Descripción

**StayAtCumbrecita Frontend** es una aplicación web de última generación para la gestión completa de hospedajes turísticos. Desarrollada con las tecnologías más modernas del ecosistema React, ofrece una experiencia de usuario excepcional tanto para turistas como para administradores hoteleros.

---

## ⚡ Stack Tecnológico

### **🚀 Core Technologies**
- **Framework**: Next.js 15 con App Router
- **React**: React 19 con Server Components
- **TypeScript**: 5.0+ para type safety completo
- **Styling**: Tailwind CSS + Shadcn/ui components
- **Build Tool**: Turbopack (modo dev) + Webpack (producción)

### **🔧 Estado y Datos**
- **Estado Global**: Zustand para gestión de estado
- **Cliente HTTP**: Axios con interceptors automáticos
- **Data Fetching**: SWR para cache inteligente
- **Validación**: Zod + React Hook Form
- **Fechas**: Date-fns para manipulación temporal

### **🎨 UI/UX Avanzado**
- **Componentes**: Shadcn/ui + Radix UI primitives
- **Iconografía**: Lucide React (1000+ iconos)
- **Animaciones**: Framer Motion + CSS Transitions
- **Responsive**: Mobile-first design
- **Temas**: Dark/Light mode support

### **🛡️ Seguridad y Performance**
- **Autenticación**: JWT con refresh automático
- **Middleware**: Next.js middleware para protección de rutas
- **Performance**: Lazy loading, memoización, virtual scrolling
- **Error Handling**: Error boundaries y fallbacks
- **SEO**: Metadata API y optimización completa

---

## 🏗️ Arquitectura de la Aplicación

### **📱 Páginas Principales Implementadas**

#### 🔐 **Sistema de Autenticación (`/auth/`)**
```
/auth/
├── /login/
│   ├── /tourist      - Login para turistas
│   └── /admin        - Login para administradores
├── /register/
│   ├── /tourist      - Registro de turistas
│   └── /admin        - Registro de administradores
├── /forgot-password  - Recuperación de contraseña
├── /reset-password   - Reseteo con token
├── /verify           - Verificación de email
└── /email-confirmed  - Confirmación exitosa
```

**Características:**
- Autenticación diferenciada por rol
- JWT tokens con refresh automático
- Verificación de email obligatoria
- Reset de contraseña seguro
- Redirección inteligente post-login

#### 🏠 **Experiencia Pública**
```
/                     - Landing page optimizada
/home                 - Homepage con búsqueda
/search               - Búsqueda avanzada con filtros
/hospedaje/[id]       - Detalle completo de hospedaje
├── Tabs de información
├── Galería multimedia
├── Disponibilidad en tiempo real
├── Sistema de reservas
└── Chatbot integrado
```

**Características:**
- SEO optimizado para cada página
- Búsqueda con múltiples filtros
- Carrusel de imágenes optimizado
- Integración con Google Maps
- Sistema de reviews y calificaciones

#### 🛒 **Sistema de Reservas**
```
/checkout             - Proceso de checkout en 5 pasos
├── Step 1: Selección de fechas y habitación
├── Step 2: Información personal y huéspedes
├── Step 3: Servicios adicionales
├── Step 4: Método de pago
└── Step 5: Confirmación y resumen
```

**Características:**
- Proceso guiado paso a paso
- Validación en tiempo real
- Cálculo dinámico de precios
- Múltiples métodos de pago
- Confirmación por email

#### 👤 **Panel de Turista (`/tourist/`)**
```
/tourist/
├── /                 - Dashboard personal
├── /perfil           - Gestión de perfil y configuración
├── /reservas         - Historial de reservas
├── /pagos            - Historial de pagos
├── /opiniones        - Mis reviews y calificaciones
├── /consultas        - Sistema de tickets/soporte
└── /notificaciones   - Centro de notificaciones
```

**Características:**
- Dashboard personalizado
- Gestión completa de reservas
- Historial de pagos detallado
- Sistema de reviews post-estadía
- Notificaciones en tiempo real

#### ⚙️ **Panel Administrativo (`/adminABM/`)**
```
/adminABM/
├── /                     - Dashboard con métricas
├── /alta-hospedaje       - Crear nuevo hospedaje
├── /editar-hospedaje/[id] - Editar hospedaje existente
├── /habitaciones/
│   ├── /[id]             - Gestionar habitaciones
│   └── /editar/[id]      - Editar habitación específica
├── /empleados            - Gestión de personal
├── /reservas             - Todas las reservas
├── /pagos                - Gestión de pagos
├── /publicidad           - Promociones y destacados
├── /reportes             - Business Intelligence
├── /chatbot/[hospedajeId] - Configuración de chatbot
├── /checkin/scan         - Scanner QR para check-in
├── /notificaciones       - Centro de notificaciones
└── /configuracion        - Configuraciones generales
```

**Características:**
- Dashboard con KPIs en tiempo real
- CRUD completo de hospedajes
- Gestión de habitaciones y precios
- Sistema de empleados con roles
- Reportes avanzados con gráficos
- Configuración de chatbot IA
- Check-in sin contacto con QR

---

## 🧩 Componentes y Arquitectura

### **🤖 Sistema de Chatbot (`/components/chatbot/`)**
```
chatbot/
├── chat-button.tsx         - Botón flotante para abrir chat
├── chat-modal.tsx          - Modal principal del chatbot
├── chat-area.tsx           - Área de conversación
├── chat-input.tsx          - Input con validación
├── chat-message.tsx        - Componente de mensaje individual
└── message-renderer.tsx    - Renderizado inteligente de mensajes
```

**Características:**
- **IA Conversacional**: Integración con OpenAI GPT-3.5
- **Contextual**: Específico por hospedaje
- **Multimedia**: Soporte para links, listas, imágenes
- **Historial**: Persistencia de conversaciones
- **Responsive**: Adaptado a móviles y desktop

### **🏨 Componentes de Hospedaje (`/components/hospedaje/`)**
```
hospedaje/
├── header.tsx              - Header con título y ubicación
├── image-carousel.tsx      - Carrusel de imágenes optimizado
├── hotel-gallery.tsx       - Galería expandible
├── description.tsx         - Descripción y comodidades
├── services.tsx            - Servicios del hospedaje
├── tabs-container.tsx      - Navegación por tabs
├── rooms-tab.tsx           - Tab de habitaciones
├── location-tab.tsx        - Tab de ubicación con mapa
├── reviews-tab.tsx         - Tab de opiniones
├── booking-form.tsx        - Formulario de reserva
├── room-detail-modal.tsx   - Modal de detalle de habitación
└── chatbot.tsx             - Chatbot específico del hospedaje
```

**Características:**
- **Galería Optimizada**: Lazy loading + compresión
- **Mapas Interactivos**: Google Maps integrado
- **Sistema de Tabs**: Navegación fluida
- **Reservas en Tiempo Real**: Disponibilidad actualizada
- **Reviews Sistema**: Calificaciones con estrellas

### **🛍️ Sistema de Checkout (`/components/checkout/`)**
```
checkout/
├── checkout-steps.tsx      - Stepper visual del proceso
├── personal-info-step.tsx  - Formulario de datos personales
├── reservation-step.tsx    - Selección de habitación y fechas
├── payment-step.tsx        - Métodos de pago
├── review-step.tsx         - Revisión antes de confirmar
└── confirmation-step.tsx   - Confirmación final
```

**Características:**
- **Proceso Guiado**: 5 pasos claramente definidos
- **Validación Progresiva**: Cada paso valida datos
- **Estado Persistente**: Context API para mantener datos
- **Cálculo Dinámico**: Precios actualizados en tiempo real
- **UX Optimizada**: Indicadores de progreso y errores

### **🧩 Componentes UI (`/components/ui/`)**
```
ui/ (65+ componentes)
├── Formularios:
│   ├── input.tsx, textarea.tsx, select.tsx
│   ├── form.tsx, label.tsx, checkbox.tsx
│   └── radio-group.tsx, switch.tsx
├── Navegación:
│   ├── breadcrumb.tsx, pagination.tsx
│   ├── navigation-menu.tsx, menubar.tsx
│   └── sidebar.tsx
├── Feedback:
│   ├── alert.tsx, toast.tsx, sonner.tsx
│   ├── skeleton.tsx, progress.tsx
│   └── loading-overlay.tsx
├── Overlays:
│   ├── dialog.tsx, modal.tsx, drawer.tsx
│   ├── popover.tsx, hover-card.tsx
│   └── tooltip.tsx
├── Data Display:
│   ├── table.tsx, card.tsx, badge.tsx
│   ├── avatar.tsx, calendar.tsx
│   └── chart.tsx
└── Especializados:
    ├── google-map.tsx, google-places-autocomplete.tsx
    ├── image-upload-modal.tsx, document-upload-modal.tsx
    ├── lazy-image.tsx, font-fallback.tsx
    └── simple-toaster.tsx
```

**Características:**
- **Shadcn/ui Base**: Componentes altamente customizables
- **Accessibility**: WAI-ARIA compliant
- **Theming**: Soporte para temas oscuro/claro
- **Responsive**: Mobile-first approach
- **Performance**: Optimizados para render

### **🏠 Componentes de Home (`/components/home/`)**
```
home/
├── hero.tsx                    - Hero section con CTA
├── search-box.tsx              - Buscador principal
├── featured-properties-carousel.tsx - Carrusel de destacados
├── property-card.tsx           - Card de propiedad
├── why-choose-us.tsx           - Sección de beneficios
└── info-section.tsx            - Información adicional
```

### **🔧 Componentes Administrativos (`/components/adminABM/`)**
```
adminABM/
├── alta-hospedaje-form.tsx     - Formulario crear hospedaje
├── edit-hospedaje-form.tsx     - Formulario editar hospedaje
├── reservation-calendar-view.tsx - Vista calendario de reservas
├── PaymentDetailsModal.tsx     - Modal detalles de pago
├── checkin-modal.tsx           - Modal para check-in
└── qr-scanner.tsx              - Scanner QR para check-in
```

---

## 🛠️ Configuración y Setup

### **Prerrequisitos**
- **Node.js** 18.0+ y npm/yarn/pnpm
- **Backend API** corriendo en puerto 5001
- **Cuenta Google Maps** para API keys
- **Variables de entorno** configuradas

### **1. Instalación**
```bash
# Clonar repositorio
git clone <repository-url>
cd frontendStayCumbrecita

# Instalar dependencias
npm install
# o
yarn install
# o 
pnpm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales
```

### **2. Variables de Entorno**
```env
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_API_VERSION=v1

# Google Services
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your-places-api-key

# Autenticación
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Cloudinary (para imágenes)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-upload-preset

# Analytics (opcional)
NEXT_PUBLIC_GA_TRACKING_ID=GA-XXXXXXXXX

# Environment
NODE_ENV=development
```

### **3. Comandos de Desarrollo**
```bash
# Desarrollo con hot reload
npm run dev
# Puerto: http://localhost:3000

# Build para producción
npm run build

# Preview build
npm run start

# Análisis de bundle
npm run analyze

# Linting
npm run lint

# Testing
npm run test
```

---

## 🔐 Sistema de Autenticación

### **Flujo de Autenticación**
```typescript
// Arquitectura JWT con refresh automático
1. Login → JWT Access Token (15min) + Refresh Token (7d)
2. Middleware verifica token en cada ruta protegida
3. Interceptor renueva automáticamente tokens expirados
4. Logout → Limpia tokens del cliente y servidor
```

### **Protección de Rutas**
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl
  
  // Rutas públicas
  if (pathname.startsWith('/auth')) return NextResponse.next()
  
  // Rutas que requieren autenticación
  if (!token && pathname.startsWith('/tourist')) {
    return NextResponse.redirect('/auth/login/tourist')
  }
  
  if (!token && pathname.startsWith('/adminABM')) {
    return NextResponse.redirect('/auth/login/admin')
  }
}
```

### **Roles y Autorización**
```typescript
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PROPIETARIO = 'PROPIETARIO', 
  ADMIN = 'ADMIN',
  EMPLEADO = 'EMPLEADO',
  TURISTA = 'TURISTA'
}

// Hook personalizado para verificar permisos
const usePermissions = () => {
  const { user } = useAuth()
  
  return {
    canAccessAdminPanel: user?.role !== 'TURISTA',
    canManageHospedajes: ['SUPER_ADMIN', 'PROPIETARIO'].includes(user?.role),
    canViewReports: user?.role !== 'TURISTA',
    // ... más permisos
  }
}
```

---

## 📊 Gestión de Estado

### **Zustand Stores**
```typescript
// stores/auth-store.ts
interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (credentials: LoginData) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}

// stores/ui-store.ts  
interface UIState {
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  loading: boolean
  notifications: Notification[]
  toggleTheme: () => void
  showNotification: (notification: Notification) => void
}

// stores/booking-store.ts
interface BookingState {
  selectedHospedaje: Hospedaje | null
  selectedRoom: Habitacion | null
  checkIn: Date | null
  checkOut: Date | null
  guests: number
  services: Service[]
  totalPrice: number
  // ... acciones de reserva
}
```

### **SWR para Data Fetching**
```typescript
// hooks/use-hospedajes.ts
export const useHospedajes = (filters?: HospedajeFilters) => {
  const { data, error, mutate } = useSWR(
    filters ? `/hospedajes?${stringify(filters)}` : '/hospedajes',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30s cache
    }
  )
  
  return {
    hospedajes: data?.data || [],
    isLoading: !error && !data,
    isError: error,
    mutate
  }
}
```

---

## 🎨 Sistema de Diseño

### **Tema y Colores**
```css
/* globals.css - Variables CSS personalizadas */
:root {
  --primary: 210 40% 98%;
  --primary-foreground: 210 40% 2%;
  --secondary: 210 40% 96%;
  --accent: 210 40% 94%;
  --destructive: 0 84% 60%;
  --border: 210 40% 90%;
  --radius: 0.5rem;
}

[data-theme="dark"] {
  --primary: 210 40% 2%;
  --primary-foreground: 210 40% 98%;
  /* ... variables para tema oscuro */
}
```

### **Componentes Responsivos**
```typescript
// Breakpoints consistentes
const breakpoints = {
  sm: '640px',
  md: '768px', 
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
}

// Hook personalizado para responsive
const useMobile = () => {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkDevice = () => setIsMobile(window.innerWidth < 768)
    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])
  
  return isMobile
}
```

---

## ⚡ Optimizaciones de Performance

### **Lazy Loading Inteligente**
```typescript
// Componentes lazy
const AdminDashboard = lazy(() => import('./AdminDashboard'))
const HospedajeDetail = lazy(() => import('./HospedajeDetail'))

// Imágenes optimizadas
const OptimizedImage = ({ src, alt, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false)
  
  return (
    <div className="relative">
      {!isLoaded && <Skeleton className="w-full h-48" />}
      <Image
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        className={cn("transition-opacity", isLoaded ? "opacity-100" : "opacity-0")}
        {...props}
      />
    </div>
  )
}
```

### **Memoización Avanzada**
```typescript
// Componentes memoizados
const PropertyCard = memo(({ hospedaje }: { hospedaje: Hospedaje }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      {/* Contenido del card */}
    </Card>
  )
})

// Hooks optimizados
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value)
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  
  return debouncedValue
}
```

### **Virtual Scrolling**
```typescript
// Para listas grandes de hospedajes/reservas
const VirtualizedList = ({ items, itemHeight = 100 }) => {
  const [scrollTop, setScrollTop] = useState(0)
  const containerHeight = 400
  
  const visibleStart = Math.floor(scrollTop / itemHeight)
  const visibleEnd = visibleStart + Math.ceil(containerHeight / itemHeight)
  
  const visibleItems = items.slice(visibleStart, visibleEnd)
  
  return (
    <div 
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              top: (visibleStart + index) * itemHeight,
              height: itemHeight,
            }}
          >
            <ItemComponent item={item} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 🔍 SEO y Metadata

### **Metadata Dinámica**
```typescript
// app/hospedaje/[id]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const hospedaje = await getHospedaje(params.id)
  
  return {
    title: `${hospedaje.nombre} - Stay at Cumbrecita`,
    description: hospedaje.descripcion,
    keywords: [hospedaje.tipo, 'hospedaje', 'La Cumbrecita', 'hotel'],
    openGraph: {
      title: hospedaje.nombre,
      description: hospedaje.descripcion,
      images: hospedaje.imagenes.map(img => ({
        url: img.url,
        width: 1200,
        height: 630,
        alt: hospedaje.nombre
      })),
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: hospedaje.nombre,
      description: hospedaje.descripcion,
      images: [hospedaje.imagenes[0]?.url],
    }
  }
}
```

### **Structured Data**
```typescript
// Datos estructurados para hoteles
const generateHospedajeJsonLd = (hospedaje: Hospedaje) => ({
  "@context": "https://schema.org",
  "@type": "Hotel",
  "name": hospedaje.nombre,
  "description": hospedaje.descripcion,
  "address": {
    "@type": "PostalAddress",
    "streetAddress": hospedaje.direccion,
    "addressLocality": "La Cumbrecita",
    "addressCountry": "AR"
  },
  "telephone": hospedaje.telefono,
  "starRating": {
    "@type": "Rating",
    "ratingValue": hospedaje.calificacionPromedio
  },
  "priceRange": `$${hospedaje.precioMinimo}-${hospedaje.precioMaximo}`,
  "image": hospedaje.imagenes.map(img => img.url)
})
```

---

## 🧪 Testing Strategy

### **Unit Testing**
```typescript
// __tests__/components/PropertyCard.test.tsx
import { render, screen } from '@testing-library/react'
import { PropertyCard } from '@/components/PropertyCard'

describe('PropertyCard', () => {
  const mockHospedaje = {
    id: '1',
    nombre: 'Hotel Test',
    calificacionPromedio: 4.5,
    precioMinimo: 5000
  }
  
  it('renders property information correctly', () => {
    render(<PropertyCard hospedaje={mockHospedaje} />)
    
    expect(screen.getByText('Hotel Test')).toBeInTheDocument()
    expect(screen.getByText('4.5')).toBeInTheDocument()
    expect(screen.getByText('$5.000')).toBeInTheDocument()
  })
})
```

### **Integration Testing**
```typescript
// __tests__/pages/checkout.test.tsx  
import { render, fireEvent, waitFor } from '@testing-library/react'
import CheckoutPage from '@/app/checkout/page'

describe('Checkout Flow', () => {
  it('completes checkout process successfully', async () => {
    render(<CheckoutPage />)
    
    // Simular selección de fechas
    fireEvent.click(screen.getByTestId('date-picker'))
    
    // Llenar información personal
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Juan Pérez' }
    })
    
    // Avanzar pasos
    fireEvent.click(screen.getByText('Siguiente'))
    
    await waitFor(() => {
      expect(screen.getByText('Confirmación')).toBeInTheDocument()
    })
  })
})
```

---

## 📱 Responsive Design

### **Mobile-First Approach**
```css
/* Estilos base para móvil */
.container {
  @apply px-4 mx-auto;
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    @apply px-6;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    @apply px-8 max-w-7xl;
  }
}
```

### **Componentes Adaptivos**
```typescript
const ResponsiveHeader = () => {
  const isMobile = useMobile()
  
  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <div className="container flex items-center justify-between h-16">
        <Logo />
        
        {isMobile ? (
          <MobileMenu />
        ) : (
          <DesktopNavigation />
        )}
      </div>
    </header>
  )
}
```

---

## 🚀 Build y Deployment

### **Build Optimizations**
```javascript
// next.config.mjs
const nextConfig = {
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  images: {
    domains: ['res.cloudinary.com', 'images.unsplash.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  webpack: (config) => {
    config.module.rules.push({
      test: /\\.svg$/,
      use: ["@svgr/webpack"]
    })
    return config
  }
}
```

### **Environment Configurations**
```typescript
// lib/config.ts
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL!,
  googleMapsKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  features: {
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    enableChatbot: process.env.NEXT_PUBLIC_ENABLE_CHATBOT !== 'false',
  }
}
```

### **Docker Support**
```dockerfile
# Dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder  
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🔧 Herramientas de Desarrollo

### **Linting y Formatting**
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "prefer-const": "error"
  }
}

// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

### **Git Hooks**
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{css,md}": ["prettier --write"]
  }
}
```

---

## 📈 Monitoreo y Analytics

### **Performance Monitoring**
```typescript
// lib/analytics.ts
export const trackPageView = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', config.gaId, {
      page_location: url,
    })
  }
}

export const trackEvent = (action: string, category: string, label?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
    })
  }
}
```

### **Error Tracking**
```typescript
// lib/error-tracking.ts
export class ErrorBoundary extends Component {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error: any) {
    return { hasError: true }
  }
  
  componentDidCatch(error: any, errorInfo: any) {
    console.error('Error boundary caught an error:', error, errorInfo)
    
    // Enviar error a servicio de tracking
    if (config.isProduction) {
      // trackError(error, errorInfo)
    }
  }
}
```

---

## 🤝 Contribución y Desarrollo

### **Coding Standards**
- **TypeScript Strict**: Tipado completo obligatorio
- **Component Naming**: PascalCase para componentes
- **File Naming**: kebab-case para archivos
- **Imports**: Absolute imports con @ alias
- **Comments**: JSDoc para funciones complejas

### **Conventional Commits**
```
feat: agregar componente de chatbot
fix: corregir validación de formulario
docs: actualizar README con nuevas características
style: aplicar formato con prettier
refactor: optimizar hook de autenticación
test: agregar tests para componente de reserva
```

### **Development Workflow**
1. Feature branch desde `main`
2. Desarrollo con hot reload
3. Tests unitarios y de integración
4. Pull request con descripción detallada
5. Code review y aprobación
6. Merge y deploy automático

---

## 📞 Soporte y Documentación

### **Recursos Adicionales**
- **[Storybook](http://localhost:6006)** - Catálogo de componentes
- **[API Documentation](http://localhost:5001/api)** - Swagger del backend
- **[Design System](./docs/design-system.md)** - Guía de diseño
- **[Performance Guide](./docs/performance.md)** - Optimizaciones

### **Comandos Útiles**
```bash
# Desarrollo
npm run dev          # Servidor desarrollo
npm run build        # Build producción  
npm run start        # Preview build
npm run lint         # Linting
npm run type-check   # Verificación TypeScript

# Testing
npm run test         # Unit tests
npm run test:watch   # Tests en modo watch
npm run test:e2e     # End-to-end tests

# Utilidades
npm run analyze      # Análisis de bundle
npm run storybook    # Catálogo componentes
```

---

## 📄 Licencia

Este proyecto está bajo la licencia [MIT](LICENSE) - ver el archivo LICENSE para más detalles.

---

<p align="center">
  <strong>🌐 StayAtCumbrecita Frontend - Experiencia de Usuario de Clase Mundial</strong><br/>
  <em>Desarrollado con las últimas tecnologías web para ofrecer la mejor UX en turismo digital</em>
</p> 