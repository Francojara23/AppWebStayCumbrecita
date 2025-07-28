# ================================
# STAGE 1: Build dependencies
# ================================
FROM node:18-alpine AS dependencies

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache libc6-compat python3 make g++

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción y desarrollo
RUN npm ci --only=production && npm cache clean --force

# ================================
# STAGE 2: Build application
# ================================
FROM node:18-alpine AS builder

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache libc6-compat python3 make g++

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies)
RUN npm ci

# Copiar código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# ================================
# STAGE 3: Production runtime
# ================================
FROM node:18-alpine AS runtime

# Instalar dependencias del sistema necesarias para runtime
RUN apk add --no-cache libc6-compat

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Establecer directorio de trabajo
WORKDIR /app

# Copiar dependencias de producción desde el stage dependencies
COPY --from=dependencies --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copiar código compilado desde el stage builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copiar archivos de configuración necesarios
COPY --chown=nestjs:nodejs package*.json ./
COPY --chown=nestjs:nodejs tsconfig*.json ./

# Crear directorios necesarios
RUN mkdir -p /app/uploads /app/logs && chown -R nestjs:nodejs /app/uploads /app/logs

# Cambiar al usuario no-root
USER nestjs

# Exponer puerto
EXPOSE 5001

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=5001
ENV HOST=0.0.0.0

# Comando de inicio
CMD ["node", "--enable-source-maps", "dist/src/main.js"] 