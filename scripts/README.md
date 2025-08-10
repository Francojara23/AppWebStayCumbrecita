# 🚀 Scripts de Configuración - Stay at Cumbrecita

Scripts automatizados para configurar el entorno de desarrollo local y acceso WiFi.

## 📋 Scripts Disponibles

### 🏠 `local-setup.sh` - Modo Local
Configura el entorno para desarrollo solo en tu Mac.

```bash
./scripts/local-setup.sh
```

**Acceso:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5001
- Panel Admin: http://localhost:3000/adminABM

### 📱 `wifi-setup.sh` - Modo WiFi
Configura el entorno para acceso desde dispositivos móviles en la misma red WiFi.

```bash
./scripts/wifi-setup.sh
```

**Acceso desde celular:**
- Frontend: http://[TU_IP]:3001
- Panel Admin: http://[TU_IP]:3001/adminABM
- Check-in: http://[TU_IP]:3001/adminABM/checkin

## 🔧 Uso Manual (Avanzado)

### Configuración WiFi Manual
```bash
# 1. Obtener IP de tu Mac
export MAC_IP=$(ipconfig getifaddr en0)

# 2. Configurar variables
export NEXT_PUBLIC_API_URL="http://$MAC_IP:5001"
export NEXT_PUBLIC_FRONTEND_URL="http://$MAC_IP:3001"
export CORS_ORIGIN="http://$MAC_IP:3001,http://localhost:3000"

# 3. Levantar Docker
docker-compose -f docker-compose.wifi.yml up -d
```

### Configuración Local Manual
```bash
docker-compose up -d
```

## 🔄 Cambiar Entre Modos

### De Local a WiFi:
```bash
./scripts/wifi-setup.sh
```

### De WiFi a Local:
```bash
./scripts/local-setup.sh
```

## 🛠️ Comandos Útiles

### Ver estado:
```bash
docker-compose ps
# o para WiFi:
docker-compose -f docker-compose.wifi.yml ps
```

### Ver logs:
```bash
docker-compose logs -f
# o para WiFi:
docker-compose -f docker-compose.wifi.yml logs -f
```

### Parar servicios:
```bash
docker-compose down
# o para WiFi:
docker-compose -f docker-compose.wifi.yml down
```

### Rebuild completo:
```bash
docker-compose down -v
docker-compose up --build -d
```

## 🚨 Troubleshooting

### No se detecta la IP:
```bash
# Verificar interfaces de red
ifconfig | grep "inet "

# Configurar manualmente
export MAC_IP=192.168.1.100  # Tu IP real
./scripts/wifi-setup.sh
```

### Docker no inicia:
```bash
# Verificar Docker
docker info

# Limpiar todo
docker system prune -a
docker volume prune
```

### Puertos ocupados:
```bash
# Ver qué está usando los puertos
lsof -i :3000
lsof -i :5001

# Matar procesos si es necesario
pkill -f "node"
```

## 📱 Configuración Específica para Check-in QR

Para usar el check-in desde iPhone:

1. **Conectar iPhone a la misma WiFi que tu Mac**
2. **Ejecutar modo WiFi:**
   ```bash
   ./scripts/wifi-setup.sh
   ```
3. **Acceder desde iPhone:**
   - Panel Admin: `http://[IP_DE_TU_MAC]:3001/adminABM`
   - Check-in: `http://[IP_DE_TU_MAC]:3001/adminABM/checkin`
4. **Iniciar sesión con usuario admin**
5. **Usar "Iniciar Check-in" → Escanear QR**

## 🔐 Variables de Entorno

El script WiFi configura automáticamente:

- `MAC_IP`: IP detectada de tu Mac
- `NEXT_PUBLIC_API_URL`: URL del backend para el frontend
- `NEXT_PUBLIC_FRONTEND_URL`: URL del frontend
- `CORS_ORIGIN`: Orígenes permitidos para CORS

## 📝 Notas Importantes

- ✅ Los scripts detectan automáticamente tu IP
- ✅ Limpian configuraciones anteriores
- ✅ Verifican que Docker esté funcionando
- ⚠️ Si cambias de red WiFi, ejecuta `wifi-setup.sh` nuevamente
- ⚠️ Solo un modo puede estar activo a la vez