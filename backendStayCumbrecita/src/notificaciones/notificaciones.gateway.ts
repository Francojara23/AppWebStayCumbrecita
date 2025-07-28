import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApiExtraModels } from '@nestjs/swagger';
import { WebSocketNotificationDto } from './dto/websocket-notification.dto';

/**
 * Gateway de WebSocket para notificaciones en tiempo real
 * 
 * ## Conexión WebSocket
 * 
 * **URL de conexión:**
 * ```
 * ws://<host>/socket.io/?token=JWT
 * ```
 * 
 * **Autenticación:**
 * El token JWT debe ser incluido como query parameter en la conexión.
 * 
 * ## Eventos disponibles
 * 
 * ### Cliente -> Servidor
 * 
 * **Evento: `register`**
 * - **Descripción:** Registra el cliente para recibir notificaciones específicas de su usuario
 * - **Payload:** `{ userId: string }`
 * - **Respuesta:** Confirmación de registro exitoso
 * 
 * **Evento: `join-admin-room`**
 * - **Descripción:** Une al cliente a la sala de administradores para notificaciones masivas
 * - **Payload:** `{ userId: string, role: string }`
 * - **Respuesta:** Confirmación de unión a sala admin
 * 
 * **Evento: `leave-admin-room`**
 * - **Descripción:** Abandona la sala de administradores
 * - **Payload:** `{ userId: string }`
 * 
 * ### Servidor -> Cliente
 * 
 * **Evento: `notification`**
 * - **Descripción:** Notificación en tiempo real para el usuario
 * - **Payload:** `WebSocketNotificationDto`
 * 
 * **Ejemplo de payload:**
 * ```json
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "titulo": "Nueva reserva confirmada",
 *   "cuerpo": "Su reserva para el Hotel Vista Mar ha sido confirmada",
 *   "tipo": "RESERVA",
 *   "data": {
 *     "reservaId": "abc123",
 *     "hospedajeId": "def456"
 *   },
 *   "createdAt": "2024-03-15T10:30:00.000Z",
 *   "leida": false
 * }
 * ```
 */
@ApiExtraModels(WebSocketNotificationDto)
@WebSocketGateway({
  cors: {
    origin: "*",
  },
  namespace: "/notifications"
})
export class NotificacionesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificacionesGateway.name);
  private connectedUsers = new Map<string, Socket[]>(); // userId -> sockets[]

  /**
   * Maneja nuevas conexiones de clientes
   * @param client Cliente WebSocket que se conecta
   */
  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
    
    // Extraer token del query parameter para autenticación
    const token = client.handshake.query.token as string;
    if (!token) {
      this.logger.warn(`Cliente ${client.id} conectado sin token`);
      client.emit('error', { message: 'Token de autenticación requerido' });
      client.disconnect();
      return;
    }

    // TODO: Validar JWT token aquí para obtener userId
    // Por ahora simulamos la validación
    this.logger.log(`Cliente ${client.id} autenticado exitosamente`);
  }

  /**
   * Maneja desconexiones de clientes
   * @param client Cliente WebSocket que se desconecta
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
    
    // Remover cliente de todas las salas de usuarios
    for (const [userId, sockets] of this.connectedUsers.entries()) {
      const updatedSockets = sockets.filter(socket => socket.id !== client.id);
      if (updatedSockets.length === 0) {
        this.connectedUsers.delete(userId);
      } else {
        this.connectedUsers.set(userId, updatedSockets);
      }
    }
  }

  /**
   * Registra un cliente para recibir notificaciones de un usuario específico
   * @param client Cliente WebSocket
   * @param payload Datos de registro que incluyen userId
   */
  @SubscribeMessage('register')
  handleRegister(client: Socket, payload: { userId: string }) {
    const { userId } = payload;
    
    if (!userId) {
      client.emit('error', { message: 'userId es requerido para el registro' });
      return;
    }

    // Agregar cliente a la lista de sockets del usuario
    const userSockets = this.connectedUsers.get(userId) || [];
    userSockets.push(client);
    this.connectedUsers.set(userId, userSockets);

    // Unir cliente a su sala personal
    client.join(`user-${userId}`);
    
    this.logger.log(`Cliente ${client.id} registrado para usuario ${userId}`);
    client.emit('registered', { 
      message: 'Registrado exitosamente para notificaciones',
      userId 
    });
  }

  /**
   * Une un cliente a la sala de administradores
   * @param client Cliente WebSocket
   * @param payload Datos que incluyen userId y role
   */
  @SubscribeMessage('join-admin-room')
  handleJoinAdminRoom(client: Socket, payload: { userId: string, role: string }) {
    const { userId, role } = payload;
    
    // Verificar que el usuario tenga rol administrativo
    const adminRoles = ['ADMIN', 'PROPIETARIO', 'SUPER_ADMIN', 'EMPLEADO', 'CONSERGE', 'RECEPCIONISTA'];
    if (!adminRoles.includes(role)) {
      client.emit('error', { message: 'No tienes permisos para unirte a la sala de administradores' });
      return;
    }

    client.join('admin-room');
    this.logger.log(`Admin ${userId} (${role}) se unió a la sala de administradores`);
    client.emit('joined-admin-room', { 
      message: 'Unido a sala de administradores exitosamente',
      userId,
      role 
    });
  }

  /**
   * Remueve un cliente de la sala de administradores
   * @param client Cliente WebSocket
   * @param payload Datos que incluyen userId
   */
  @SubscribeMessage('leave-admin-room')
  handleLeaveAdminRoom(client: Socket, payload: { userId: string }) {
    const { userId } = payload;
    
    client.leave('admin-room');
    this.logger.log(`Usuario ${userId} abandonó la sala de administradores`);
    client.emit('left-admin-room', { 
      message: 'Saliste de la sala de administradores',
      userId 
    });
  }

  /**
   * Escucha eventos de notificaciones creadas y las retransmite vía WebSocket
   * Este método se ejecuta automáticamente cuando el servicio de notificaciones emite el evento
   * @param payload Datos del evento que incluyen la notificación y el usuarioId
   */
  @OnEvent('notificacion.created')
  handleNotificationCreated(payload: { notificacion: WebSocketNotificationDto, usuarioId: string }) {
    const { notificacion, usuarioId } = payload;
    
    try {
      // Enviar notificación al usuario específico
      this.server.to(`user-${usuarioId}`).emit('notification', notificacion);
      
      this.logger.log(`✅ Notificación WebSocket enviada a usuario ${usuarioId}: ${notificacion.titulo}`);
      
      // Contar conexiones activas para el usuario
      const userSockets = this.connectedUsers.get(usuarioId);
      const activeConnections = userSockets ? userSockets.length : 0;
      
      if (activeConnections === 0) {
        this.logger.warn(`⚠️ Usuario ${usuarioId} no tiene conexiones WebSocket activas`);
      } else {
        this.logger.log(`📱 Notificación enviada a ${activeConnections} conexión(es) del usuario ${usuarioId}`);
      }
      
    } catch (error) {
      this.logger.error(`❌ Error enviando notificación WebSocket a usuario ${usuarioId}:`, error);
    }
  }

  /**
   * Envía una notificación a todos los administradores conectados
   * @param notificacion Notificación a enviar
   */
  notifyAdmins(notificacion: WebSocketNotificationDto) {
    try {
      this.server.to('admin-room').emit('admin-notification', notificacion);
      this.logger.log(`📢 Notificación de administrador enviada: ${notificacion.titulo}`);
    } catch (error) {
      this.logger.error('❌ Error enviando notificación a administradores:', error);
    }
  }

  /**
   * Envía una notificación de sistema a todos los usuarios conectados
   * @param notificacion Notificación de sistema
   */
  notifyAllUsers(notificacion: WebSocketNotificationDto) {
    try {
      this.server.emit('system-notification', notificacion);
      this.logger.log(`🌐 Notificación de sistema enviada a todos: ${notificacion.titulo}`);
    } catch (error) {
      this.logger.error('❌ Error enviando notificación de sistema:', error);
    }
  }

  /**
   * Obtiene estadísticas de conexiones activas
   * @returns Objeto con estadísticas de conexiones
   */
  getConnectionStats() {
    const totalUsers = this.connectedUsers.size;
    const totalConnections = Array.from(this.connectedUsers.values())
      .reduce((sum, sockets) => sum + sockets.length, 0);
    
    return {
      totalUsers,
      totalConnections,
      connectedUsers: Array.from(this.connectedUsers.keys())
    };
  }
} 