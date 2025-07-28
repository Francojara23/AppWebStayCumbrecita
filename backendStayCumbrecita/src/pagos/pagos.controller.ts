import { Controller, Get, Post, Body, Param, UseGuards, Query, Patch, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PagosService } from './pagos.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { PagoResponseDto } from './dto/pago-response.dto';
import { CambiarEstadoPagoDto } from './dto/cambiar-estado-pago.dto';
import { CancelarPagoDto } from './dto/cancelar-pago.dto';
import { FiltrosPagosDto } from './dto/filtros-pagos.dto';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { RolesGuard } from '../auth/jwt/jwt-roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

/**
 * Controlador que maneja las peticiones HTTP relacionadas con los pagos
 * Incluye gestión avanzada de estados, filtros y estadísticas
 */
@ApiTags('pagos')
@Controller('pagos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  /**
   * Crea un nuevo pago para una reserva
   */
  @Post()
  @Roles(Role.TURISTA)
  @ApiOperation({ summary: 'Crear un nuevo pago' })
  @ApiResponse({ status: 201, description: 'Pago creado exitosamente', type: PagoResponseDto })
  @ApiResponse({ status: 400, description: 'Datos de pago inválidos' })
  @ApiResponse({ status: 402, description: 'Tarjeta no válida' })
  create(@Body() createPagoDto: CreatePagoDto, @Request() req): Promise<PagoResponseDto> {
    return this.pagosService.createPago(createPagoDto, req.user.id);
  }

  /**
   * Obtiene lista de pagos con filtros
   */
  @Get()
  @Roles(Role.ADMIN, Role.PROPIETARIO, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener lista de pagos con filtros' })
  @ApiResponse({ status: 200, description: 'Lista de pagos obtenida exitosamente' })
  findAll(@Query() filtros: FiltrosPagosDto) {
    return this.pagosService.findAll(filtros);
  }

  /**
   * Obtiene los pagos de los hospedajes que administra el usuario
   * Aplica filtros granulares de autorización por hospedaje
   * @param req Objeto de request con información del usuario autenticado
   * @returns Lista de pagos de los hospedajes que el usuario puede administrar
   */
  @Get('administrar')
  @Roles(Role.ADMIN, Role.PROPIETARIO, 'ADMIN_HOTEL', 'RECEPCIONISTA', 'CONSERJE', 'EMPLEADO')
  @ApiOperation({ summary: 'Obtener pagos de hospedajes que administra el usuario' })
  @ApiResponse({ status: 200, description: 'Lista de pagos obtenida exitosamente' })
  async findPagosByAdministrador(@Request() req) {
    return this.pagosService.findPagosByAdministrador(req.user.id);
  }

  /**
   * Obtiene pagos del usuario autenticado
   */
  @Get('mis-pagos')
  @Roles(Role.TURISTA)
  @ApiOperation({ summary: 'Obtener pagos del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Pagos del usuario obtenidos exitosamente' })
  getMisPagos(@Request() req) {
    return this.pagosService.findByUserId(req.user.id);
  }

  /**
   * Obtiene estadísticas de pagos
   */
  @Get('reportes/estadisticas')
  @Roles(Role.ADMIN, Role.PROPIETARIO, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener estadísticas de pagos' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas exitosamente' })
  getEstadisticas(@Query('hospedajeId') hospedajeId?: string) {
    return this.pagosService.getEstadisticas(hospedajeId);
  }

  /**
   * Obtiene pagos por usuario
   */
  @Get('usuario/:usuarioId')
  @Roles(Role.ADMIN, Role.PROPIETARIO, Role.SUPER_ADMIN, Role.TURISTA)
  @ApiOperation({ summary: 'Obtener pagos de un usuario específico' })
  @ApiResponse({ status: 200, description: 'Pagos del usuario obtenidos exitosamente' })
  getPagosByUsuario(@Param('usuarioId') usuarioId: string, @Query() filtros: FiltrosPagosDto) {
    return this.pagosService.findAll({ ...filtros, usuarioId });
  }

  /**
   * Obtiene pagos por hospedaje
   */
  @Get('hospedaje/:hospedajeId')
  @Roles(Role.ADMIN, Role.PROPIETARIO, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener pagos de un hospedaje específico' })
  @ApiResponse({ status: 200, description: 'Pagos del hospedaje obtenidos exitosamente' })
  getPagosByHospedaje(@Param('hospedajeId') hospedajeId: string, @Query() filtros: FiltrosPagosDto) {
    return this.pagosService.findAll({ ...filtros, hospedajeId });
  }

  /**
   * Ejecuta proceso manual de verificación de pagos expirados
   */
  @Post('procesos/verificar-expirados')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Ejecutar verificación manual de pagos expirados' })
  @ApiResponse({ status: 200, description: 'Proceso ejecutado exitosamente' })
  procesarExpirados() {
    return this.pagosService.procesarPagosExpirados();
  }

  /**
   * Obtiene un pago específico por su ID
   */
  @Get(':id')
  @Roles(Role.TURISTA, Role.PROPIETARIO, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener un pago por ID' })
  @ApiResponse({ status: 200, description: 'Pago encontrado', type: PagoResponseDto })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  findOne(@Param('id') id: string): Promise<PagoResponseDto> {
    return this.pagosService.getPago(id);
  }

  /**
   * Cambia el estado de un pago
   */
  @Patch(':id/estado')
  @Roles(Role.ADMIN, Role.PROPIETARIO, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cambiar estado de un pago' })
  @ApiResponse({ status: 200, description: 'Estado cambiado exitosamente' })
  @ApiResponse({ status: 400, description: 'Transición de estado no válida' })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  cambiarEstado(
    @Param('id') id: string, 
    @Body() dto: CambiarEstadoPagoDto,
    @Request() req
  ): Promise<PagoResponseDto> {
    return this.pagosService.cambiarEstado(id, dto.estado, dto.motivo, req.user.id, dto.metadatos);
  }

  /**
   * Cancela un pago
   */
  @Post(':id/cancelar')
  @Roles(Role.ADMIN, Role.PROPIETARIO, Role.SUPER_ADMIN, Role.TURISTA)
  @ApiOperation({ summary: 'Cancelar un pago' })
  @ApiResponse({ status: 200, description: 'Pago cancelado exitosamente' })
  @ApiResponse({ status: 400, description: 'No se puede cancelar el pago' })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  cancelar(
    @Param('id') id: string,
    @Body() dto: CancelarPagoDto,
    @Request() req
  ): Promise<PagoResponseDto> {
    return this.pagosService.cancelarPago(id, dto, req.user.id);
  }

  /**
   * Reintenta un pago fallido o rechazado
   */
  @Post(':id/reintentar')
  @Roles(Role.ADMIN, Role.PROPIETARIO, Role.SUPER_ADMIN, Role.TURISTA)
  @ApiOperation({ summary: 'Reintentar un pago fallido o rechazado' })
  @ApiResponse({ status: 200, description: 'Pago reintentado exitosamente' })
  @ApiResponse({ status: 400, description: 'No se puede reintentar el pago' })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  reintentar(@Param('id') id: string, @Request() req): Promise<PagoResponseDto> {
    return this.pagosService.reintentarPago(id, req.user.id);
  }

  /**
   * Obtiene el historial de cambios de estado de un pago
   */
  @Get(':id/historial')
  @Roles(Role.ADMIN, Role.PROPIETARIO, Role.SUPER_ADMIN, Role.TURISTA)
  @ApiOperation({ summary: 'Obtener historial de estados de un pago' })
  @ApiResponse({ status: 200, description: 'Historial obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  getHistorial(@Param('id') id: string) {
    return this.pagosService.getHistorialEstados(id);
  }

  /**
   * Actualiza el reservaId de un pago existente
   */
  @Patch(':id/reserva/:reservaId')
  @Roles(Role.TURISTA, Role.ADMIN, Role.PROPIETARIO, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Asociar un pago con una reserva' })
  @ApiResponse({ status: 200, description: 'Pago actualizado exitosamente', type: PagoResponseDto })
  @ApiResponse({ status: 404, description: 'Pago o reserva no encontrados' })
  actualizarReservaId(
    @Param('id') pagoId: string, 
    @Param('reservaId') reservaId: string
  ): Promise<PagoResponseDto> {
    return this.pagosService.actualizarReservaId(pagoId, reservaId);
  }


}
