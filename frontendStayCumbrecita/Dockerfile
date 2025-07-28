# ================================
# STAGE 1: Build dependencies
# ================================
FROM node:18-alpine AS dependencies

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache libc6-compat

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción solamente (sin scripts)
RUN npm ci --only=production --legacy-peer-deps --ignore-scripts && npm cache clean --force

# ================================
# STAGE 2: Build application
# ================================
FROM node:18-alpine AS builder

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache libc6-compat

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies)
RUN npm ci --legacy-peer-deps --ignore-scripts

# Copiar código fuente
COPY . .

# Argumentos de build para variables de entorno
ARG NEXT_PUBLIC_MAPS_API_GOOGLE_KEY
ENV NEXT_PUBLIC_MAPS_API_GOOGLE_KEY=$NEXT_PUBLIC_MAPS_API_GOOGLE_KEY

# Variables de entorno necesarias para el build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Construir la aplicación Next.js
RUN npm run build

# ================================
# STAGE 3: Production runtime
# ================================
FROM node:18-alpine AS runtime

# Instalar dependencias del sistema necesarias para runtime
RUN apk add --no-cache libc6-compat

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Establecer directorio de trabajo
WORKDIR /app

# Copiar dependencias de producción desde el stage dependencies
COPY --from=dependencies --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copiar archivos de configuración necesarios
COPY --chown=nextjs:nodejs package*.json ./
COPY --chown=nextjs:nodejs next.config.mjs ./
COPY --chown=nextjs:nodejs postcss.config.mjs ./
COPY --chown=nextjs:nodejs tailwind.config.ts ./
COPY --chown=nextjs:nodejs tsconfig.json ./

# Copiar archivos públicos
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copiar archivos compilados de Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Cambiar al usuario no-root
USER nextjs

# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# Comando de inicio
CMD ["node", "server.js"] 