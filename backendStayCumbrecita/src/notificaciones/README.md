# Módulo de Notificaciones 📢

Este módulo proporciona un sistema completo de notificaciones con soporte para múltiples canales de envío y notificaciones en tiempo real.

## Características

- ✅ **CRUD de notificaciones** - Gestión completa via API REST
- ✅ **Notificaciones por email** - Integración con servicio de correo
- ✅ **Notificaciones push** - Firebase Cloud Messaging (FCM)
- ✅ **Notificaciones en tiempo real** - WebSocket con Socket.io
- ✅ **Tipificación de notificaciones** - RESERVA, PAGO, SISTEMA
- ✅ **Estado de lectura** - Control de notificaciones leídas/no leídas

## API REST

### Endpoints disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/notificaciones` | Crear nueva notificación |
| `GET` | `/notificaciones` | Listar notificaciones del usuario |
| `GET` | `/notificaciones/:id` | Obtener notificación específica |
| `PATCH` | `/notificaciones/:id/read` | Marcar como leída/no leída |
| `PATCH` | `/notificaciones/read-all` | Marcar todas como leídas |
| `DELETE` | `/notificaciones/:id` | Eliminar notificación |

### Ejemplo de uso

```typescript
// Crear notificación
const nuevaNotificacion = {
  usuarioId: "user-123",
  titulo: "Nueva reserva",
  cuerpo: "Su reserva ha sido confirmada",
  tipo: "RESERVA",
  data: { reservaId: "res-456" },
  canales: ["IN_APP", "EMAIL"]
};

fetch('/notificaciones', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token 
  },
  body: JSON.stringify(nuevaNotificacion)
});
```

## WebSocket - Notificaciones en Tiempo Real 🔄

### Conexión

**URL de conexión:**
```
ws://<host>/socket.io/?token=JWT_TOKEN
```

**Ejemplo de conexión:**
```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:3000', {
  query: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
});
```

### Eventos

#### Cliente → Servidor

**Evento: `register`**
- **Descripción:** Registra al usuario para recibir notificaciones
- **Payload:** `string` - ID del usuario
- **Ejemplo:**
```javascript
socket.emit('register', 'user-123');
```

#### Servidor → Cliente

**Evento: `notificacion`**
- **Descripción:** Nueva notificación enviada al cliente
- **Payload:** Objeto `WebSocketNotificationDto`

### Estructura de datos WebSocket

```typescript
interface WebSocketNotificationDto {
  id: string;              // ID único de la notificación
  titulo: string;          // Título de la notificación
  cuerpo: string;          // Contenido del mensaje
  tipo: 'RESERVA' | 'PAGO' | 'SISTEMA';  // Tipo de notificación
  data?: any;              // Datos adicionales
  createdAt: string;       // Fecha de creación
  leida: boolean;          // Estado de lectura
}
```

### Ejemplo completo de implementación

```javascript
import io from 'socket.io-client';

class NotificationService {
  constructor(jwtToken, userId) {
    this.socket = io('ws://localhost:3000', {
      query: { token: jwtToken }
    });
    
    this.userId = userId;
    this.setupListeners();
  }
  
  setupListeners() {
    // Conexión establecida
    this.socket.on('connect', () => {
      console.log('Conectado al servidor de notificaciones');
      // Registrar usuario para recibir notificaciones
      this.socket.emit('register', this.userId);
    });
    
    // Recibir notificaciones
    this.socket.on('notificacion', (notification) => {
      console.log('Nueva notificación:', notification);
      this.mostrarNotificacion(notification);
    });
    
    // Manejar desconexión
    this.socket.on('disconnect', () => {
      console.log('Desconectado del servidor');
    });
  }
  
  mostrarNotificacion(notification) {
    // Mostrar notificación en la UI
    const notificationElement = document.createElement('div');
    notificationElement.className = 'notification';
    notificationElement.innerHTML = `
      <h4>${notification.titulo}</h4>
      <p>${notification.cuerpo}</p>
      <span class="tipo">${notification.tipo}</span>
    `;
    
    document.getElementById('notifications-container')
      .appendChild(notificationElement);
  }
  
  disconnect() {
    this.socket.disconnect();
  }
}

// Uso
const notificationService = new NotificationService(
  'jwt-token-aqui',
  'user-123'
);
```

### Implementación en React

```jsx
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function useNotifications(token, userId) {
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);
  
  useEffect(() => {
    const newSocket = io('ws://localhost:3000', {
      query: { token }
    });
    
    newSocket.on('connect', () => {
      console.log('Conectado');
      newSocket.emit('register', userId);
    });
    
    newSocket.on('notificacion', (notification) => {
      setNotifications(prev => [notification, ...prev]);
    });
    
    setSocket(newSocket);
    
    return () => newSocket.close();
  }, [token, userId]);
  
  return { notifications, socket };
}

// Componente
function NotificationComponent() {
  const { notifications } = useNotifications(token, userId);
  
  return (
    <div>
      {notifications.map(notification => (
        <div key={notification.id} className="notification">
          <h4>{notification.titulo}</h4>
          <p>{notification.cuerpo}</p>
        </div>
      ))}
    </div>
  );
}
```

## Tipos de Notificación

| Tipo | Descripción | Uso típico |
|------|-------------|------------|
| `RESERVA` | Notificaciones relacionadas con reservas | Confirmaciones, cancelaciones, check-in/out |
| `PAGO` | Notificaciones de pagos | Confirmación de pago, fallos de pago |
| `SISTEMA` | Notificaciones del sistema | Mantenimiento, actualizaciones |

## Canales de Envío

- **`IN_APP`** - Notificación en la aplicación (WebSocket)
- **`EMAIL`** - Envío por correo electrónico  
- **`PUSH`** - Notificación push (FCM)

## Autenticación

Todas las conexiones WebSocket requieren autenticación JWT:

```javascript
const socket = io('ws://localhost:3000', {
  query: { token: 'JWT_TOKEN_AQUI' }
});
```

## Solución de Problemas

### El WebSocket no se conecta
- Verificar que el token JWT sea válido
- Comprobar que el servidor esté ejecutándose
- Revisar la configuración CORS

### No recibo notificaciones
- Asegurar que se ejecutó `socket.emit('register', userId)`
- Verificar que el userId sea correcto
- Comprobar los logs del servidor

### Desconexiones frecuentes
- Implementar reconexión automática
- Verificar la estabilidad de la red
- Considerar aumentar el timeout del socket

## Configuración de Desarrollo

```bash
# Instalar dependencias
npm install socket.io

# Variables de entorno requeridas
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
FCM_PROJECT_ID=tu_project_id
```

## Monitoreo

Para monitorear las conexiones WebSocket:

```javascript
// En el servidor (development)
gateway.server.engine.clientsCount; // Número de clientes conectados
```
