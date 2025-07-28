import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExtraModels } from '@nestjs/swagger';
import { NotificacionesService } from './notificaciones.service';
import { CreateNotificacionDto } from './dto/create-notificacion.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { WebSocketNotificationDto } from './dto/websocket-notification.dto';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { RolesGuard } from '../auth/jwt/jwt-roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

/**
 * ## Controlador de Notificaciones
 * 
 * Este controlador maneja las operaciones CRUD de notificaciones y proporciona
 * endpoints para la gestión de notificaciones de usuarios.
 * 
 * ### Notificaciones en tiempo real
 * 
 * Además de los endpoints HTTP, el sistema proporciona notificaciones en tiempo real
 * a través de WebSocket. Para recibir notificaciones instantáneas:
 * 
 * **Conexión WebSocket:**
 * ```
 * ws://<host>/socket.io/?token=JWT_TOKEN
 * ```
 * 
 * **Registrar usuario:**
 * ```javascript
 * socket.emit('register', 'usuario-id');
 * ```
 * 
 * **Escuchar notificaciones:**
 * ```javascript
 * socket.on('notificacion', (data) => {
 *   // data contiene la estructura de WebSocketNotificationDto
 *   console.log(`${data.titulo}: ${data.cuerpo}`);
 * });
 * ```
 * 
 * @see NotificacionesGateway Para más detalles sobre WebSocket
 * @see WebSocketNotificationDto Para la estructura de datos en tiempo real
 */
@ApiTags('notificaciones')
@ApiExtraModels(WebSocketNotificationDto)
@Controller('notificaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.PROPIETARIO)
  @ApiOperation({ 
    summary: 'Crear una nueva notificación',
    description: 'Crea una nueva notificación que será enviada automáticamente en tiempo real via WebSocket a los usuarios conectados.'
  })
  @ApiResponse({ status: 201, description: 'Notificación creada exitosamente y enviada via WebSocket' })
  create(@Body() createNotificacionDto: CreateNotificacionDto) {
    return this.notificacionesService.create(createNotificacionDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.PROPIETARIO, Role.TURISTA, Role.SUPER_ADMIN)
  @ApiOperation({ 
    summary: 'Obtener todas las notificaciones del usuario actual',
    description: 'Retorna el historial completo de notificaciones del usuario. Para notificaciones en tiempo real, usar WebSocket.'
  })
  @ApiResponse({ status: 200, description: 'Lista de notificaciones' })
  findAll(@Request() req) {
    return this.notificacionesService.findAllByUsuario(req.user.id);
  }

  @Get('by-hospedajes')
  @Roles(Role.ADMIN, Role.PROPIETARIO, Role.EMPLEADO, Role.SUPER_ADMIN)
  @ApiOperation({ 
    summary: 'Obtener notificaciones por hospedajes asociados al usuario',
    description: 'Retorna las notificaciones relacionadas con los hospedajes donde el usuario es propietario, administrador o empleado.'
  })
  @ApiResponse({ status: 200, description: 'Lista de notificaciones por hospedajes' })
  findByHospedajes(@Request() req) {
    return this.notificacionesService.findAllByUserHospedajes(req.user.id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.PROPIETARIO, Role.TURISTA, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener una notificación específica' })
  @ApiResponse({ status: 200, description: 'Notificación encontrada' })
  @ApiResponse({ status: 404, description: 'Notificación no encontrada' })
  findOne(@Param('id') id: string) {
    return this.notificacionesService.findOne(id);
  }

  @Get(':id/detalle')
  @Roles(Role.ADMIN, Role.PROPIETARIO, Role.TURISTA, Role.SUPER_ADMIN)
  @ApiOperation({ 
    summary: 'Obtener contenido detallado de una notificación',
    description: 'Retorna el contenido completo y detallado de una notificación para mostrar en modales'
  })
  @ApiResponse({ status: 200, description: 'Contenido detallado de la notificación' })
  @ApiResponse({ status: 404, description: 'Notificación no encontrada' })
  getDetailedContent(@Param('id') id: string) {
    return this.notificacionesService.getDetailedContent(id);
  }

  @Patch(':id/read')
  @Roles(Role.ADMIN, Role.PROPIETARIO, Role.TURISTA, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Marcar una notificación como leída/no leída' })
  @ApiResponse({ status: 200, description: 'Estado de lectura actualizado' })
  markAsRead(@Param('id') id: string, @Body() markReadDto: MarkReadDto, @Request() req) {
    return this.notificacionesService.markAsRead(id, markReadDto, req.user.id);
  }

  @Patch('read-all')
  @Roles(Role.ADMIN, Role.PROPIETARIO, Role.TURISTA, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  @ApiResponse({ status: 200, description: 'Todas las notificaciones marcadas como leídas' })
  markAllAsRead(@Request() req) {
    return this.notificacionesService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.PROPIETARIO, Role.TURISTA, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Eliminar una notificación' })
  @ApiResponse({ status: 200, description: 'Notificación eliminada' })
  remove(@Param('id') id: string, @Request() req) {
    return this.notificacionesService.remove(id, req.user.id);
  }
}
