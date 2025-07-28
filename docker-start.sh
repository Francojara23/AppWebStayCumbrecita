#!/bin/bash

# Script de inicio para StayAtCumbrecita con Docker
# Autor: StayAtCumbrecita Team
# Versión: 1.0

echo "🐳 StayAtCumbrecita - Docker Setup"
echo "=================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar ayuda
show_help() {
    echo "Uso: $0 [COMANDO]"
    echo ""
    echo "Comandos disponibles:"
    echo "  prod      - Ejecutar en modo producción"
    echo "  dev       - Ejecutar en modo desarrollo (con hot reload)"
    echo "  stop      - Parar todos los servicios"
    echo "  clean     - Limpiar contenedores y volúmenes"
    echo "  logs      - Mostrar logs de todos los servicios"
    echo "  status    - Mostrar estado de los servicios"
    echo "  help      - Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  ./docker-start.sh prod"
    echo "  ./docker-start.sh dev"
    echo "  ./docker-start.sh logs"
}

# Función para verificar si Docker está ejecutándose
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker no está ejecutándose. Por favor, inicia Docker Desktop.${NC}"
        exit 1
    fi
}

# Función para verificar archivos de configuración
check_config() {
    echo -e "${BLUE}🔍 Verificando configuración...${NC}"
    
    if [ ! -f "backend/.env" ]; then
        echo -e "${RED}❌ No se encontró backend/.env${NC}"
        exit 1
    fi
    
    if [ ! -f "frontendStayAtCumbrecita/.env.local" ]; then
        echo -e "${RED}❌ No se encontró frontendStayAtCumbrecita/.env.local${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Archivos de configuración encontrados${NC}"
}

# Función para modo producción
start_production() {
    echo -e "${BLUE}🚀 Iniciando en modo PRODUCCIÓN...${NC}"
    check_docker
    check_config
    
    echo -e "${YELLOW}📦 Construyendo imágenes...${NC}"
    docker-compose up --build -d
    
    echo -e "${GREEN}✅ Servicios iniciados en modo producción${NC}"
    echo ""
    echo "🌐 URLs disponibles:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend:  http://localhost:5001"
    echo "  API Docs: http://localhost:5001/api"
    echo ""
    echo "📊 Para ver logs: ./docker-start.sh logs"
    echo "🛑 Para parar:   ./docker-start.sh stop"
}

# Función para modo desarrollo
start_development() {
    echo -e "${BLUE}🔧 Iniciando en modo DESARROLLO...${NC}"
    check_docker
    check_config
    
    echo -e "${YELLOW}📦 Construyendo imágenes de desarrollo...${NC}"
    docker-compose -f docker-compose.dev.yml up --build
    
    echo -e "${GREEN}✅ Servicios iniciados en modo desarrollo${NC}"
}

# Función para parar servicios
stop_services() {
    echo -e "${BLUE}🛑 Parando servicios...${NC}"
    docker-compose down
    docker-compose -f docker-compose.dev.yml down
    echo -e "${GREEN}✅ Servicios detenidos${NC}"
}

# Función para limpiar
clean_all() {
    echo -e "${BLUE}🧹 Limpiando contenedores y volúmenes...${NC}"
    docker-compose down -v --remove-orphans
    docker-compose -f docker-compose.dev.yml down -v --remove-orphans
    docker system prune -f
    echo -e "${GREEN}✅ Limpieza completada${NC}"
}

# Función para mostrar logs
show_logs() {
    echo -e "${BLUE}📋 Mostrando logs...${NC}"
    docker-compose logs -f
}

# Función para mostrar estado
show_status() {
    echo -e "${BLUE}📊 Estado de los servicios:${NC}"
    echo ""
    docker-compose ps
    echo ""
    echo -e "${BLUE}📈 Uso de recursos:${NC}"
    docker stats --no-stream
}

# Procesar argumentos
case "${1:-help}" in
    "prod"|"production")
        start_production
        ;;
    "dev"|"development")
        start_development
        ;;
    "stop")
        stop_services
        ;;
    "clean")
        clean_all
        ;;
    "logs")
        show_logs
        ;;
    "status")
        show_status
        ;;
    "help"|*)
        show_help
        ;;
esac 