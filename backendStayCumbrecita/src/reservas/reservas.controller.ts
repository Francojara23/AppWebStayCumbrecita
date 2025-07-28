import { Controller, Get, Post, Body, Param, Put, UseGuards, Request, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReservasService } from './reservas.service';
import { CrearReservaDto } from './dto/crear-reserva.dto';
import { ActualizarEstadoReservaDto } from './dto/actualizar-estado-reserva.dto';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { CotizarReservaDto } from './dto/cotizar-reserva.dto';
import { CheckinDto } from './dto/checkin.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { ApproveTransferDto } from './dto/approve-transfer.dto';
import { VerificarQrDto } from './dto/checkin/verificar-qr.dto';
import { RealizarCheckinDto } from './dto/checkin/realizar-checkin.dto';
import { RolesGuard } from 'src/auth/jwt/jwt-roles.guard';

/**
 * Controlador que maneja las peticiones HTTP relacionadas con las reservas
 * Requiere autenticación JWT y permisos específicos según el rol del usuario
 */
@ApiTags('reservas')
@Controller('reservas')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  /**
   * Crea una nueva reserva
   * Requiere rol de TURISTA
   * @param crearReservaDto Datos de la reserva a crear
   * @param req Objeto de request con información del usuario
   * @returns Reserva creada
   */
  @Post()
  @Roles(Role.TURISTA)
  async create(@Body() crearReservaDto: CrearReservaDto, @Request() req) {
    return this.reservasService.crear(crearReservaDto, req.user.id);
  }

  /**
   * Obtiene todas las reservas
   * Requiere rol de ADMIN o PROPIETARIO
   * @returns Lista de reservas
   */
  @Get()
  @Roles(Role.ADMIN, Role.PROPIETARIO)
  async findAll() {
    return this.reservasService.findAll();
  }

  /**
   * Obtiene las reservas de los hospedajes que administra el usuario
   * Aplica filtros granulares de autorización por hospedaje
   * @param req Objeto de request con información del usuario autenticado
   * @returns Lista de reservas de los hospedajes que el usuario puede administrar
   */
  @Get('administrar')
  @Roles(Role.ADMIN, Role.PROPIETARIO, 'ADMIN_HOTEL', 'RECEPCIONISTA', 'CONSERJE', 'EMPLEADO')
  @ApiOperation({ summary: 'Obtener reservas de hospedajes que administra el usuario' })
  @ApiResponse({ status: 200, description: 'Lista de reservas obtenida exitosamente' })
  async findReservasByAdministrador(@Request() req) {
    return this.reservasService.findReservasByAdministrador(req.user.id);
  }

  /**
   * Obtiene todas las reservas del usuario autenticado
   * Endpoint optimizado que incluye todas las relaciones necesarias
   * @param req Objeto de request con información del usuario autenticado
   * @returns Lista de reservas del usuario con todas las relaciones
   */
  @Get('mis-reservas')
  @Roles(Role.TURISTA)
  @ApiOperation({ summary: 'Obtener todas las reservas del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de reservas del usuario obtenida exitosamente' })
  async getMisReservas(@Request() req) {
    return this.reservasService.findByUsuarioCompleto(req.user.id);
  }

  /**
   * Obtiene una reserva específica por su ID
   * Requiere rol de ADMIN, PROPIETARIO o TURISTA
   * @param id ID de la reserva a buscar
   * @returns Reserva encontrada
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.PROPIETARIO, Role.TURISTA)
  async findOne(@Param('id') id: string) {
    return this.reservasService.findOne(id);
  }

  /**
   * Actualiza el estado de una reserva
   * Requiere rol de ADMIN o PROPIETARIO
   * @param id ID de la reserva a actualizar
   * @param actualizarEstadoDto Nuevo estado de la reserva
   * @returns Reserva actualizada
   */
  @Put(':id/estado')
  @Roles(Role.ADMIN, Role.PROPIETARIO)
  async actualizarEstado(
    @Param('id') id: string,
    @Body() actualizarEstadoDto: ActualizarEstadoReservaDto,
  ) {
    return this.reservasService.actualizarEstado(id, actualizarEstadoDto);
  }

  @Post('cotizar')
  @ApiOperation({ summary: 'Cotizar una reserva' })
  @ApiResponse({ status: 200, description: 'Cotización generada exitosamente' })
  async cotizar(@Body() dto: CotizarReservaDto) {
    return this.reservasService.cotizar(dto);
  }

  @Patch(':id/checkin')
  @Roles('ADMIN', 'PROPIETARIO')
  @ApiOperation({ summary: 'Registrar check-in de una reserva' })
  @ApiResponse({ status: 200, description: 'Check-in registrado exitosamente' })
  async checkin(@Param('id') id: string, @Body() dto: CheckinDto) {
    return this.reservasService.registrarCheckIn(id, dto);
  }

  @Patch(':id/checkout')
  @Roles('ADMIN', 'PROPIETARIO')
  @ApiOperation({ summary: 'Registrar check-out de una reserva' })
  @ApiResponse({ status: 200, description: 'Check-out registrado exitosamente' })
  async checkout(@Param('id') id: string, @Body() dto: CheckoutDto) {
    return this.reservasService.registrarCheckOut(id, dto);
  }

  @Patch(':id/pago-transferencia')
  @Roles('ADMIN', 'PROPIETARIO')
  @ApiOperation({ summary: 'Aprobar pago por transferencia' })
  @ApiResponse({ status: 200, description: 'Pago aprobado exitosamente' })
  async aprobarTransferencia(@Param('id') id: string, @Body() dto: ApproveTransferDto) {
    return this.reservasService.aprobarTransferencia(id, dto);
  }

  @Get('habitaciones/:habitacionId/reservas')
  @ApiOperation({ summary: 'Obtener reservas de una habitación' })
  @ApiResponse({ status: 200, description: 'Lista de reservas obtenida exitosamente' })
  async getReservasByHabitacion(
    @Param('habitacionId') habitacionId: string,
    @Query('desde') desde?: Date,
    @Query('hasta') hasta?: Date
  ) {
    return this.reservasService.findByHabitacion(habitacionId, desde, hasta);
  }

  /**
   * Obtiene todas las reservas de un usuario específico
   * Requiere rol de ADMIN, PROPIETARIO o TURISTA (solo puede ver sus propias reservas)
   * @param usuarioId ID del usuario cuyas reservas se quieren obtener
   * @param req Objeto de request con información del usuario autenticado
   * @returns Lista de reservas del usuario
   */
  @Get('usuario/:usuarioId')
  @Roles(Role.ADMIN, Role.PROPIETARIO, Role.TURISTA)
  @ApiOperation({ summary: 'Obtener todas las reservas de un usuario específico' })
  @ApiResponse({ status: 200, description: 'Lista de reservas del usuario obtenida exitosamente' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para ver las reservas de este usuario' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async getReservasByUsuario(
    @Param('usuarioId') usuarioId: string,
    @Request() req
  ) {
    return this.reservasService.findByUsuario(usuarioId, req.user);
  }

  /**
   * Obtiene las reservas completadas de un usuario (estado CERRADA y pago APROBADO)
   * Útil para mostrar el historial de estadías completadas
   * @param usuarioId ID del usuario cuyas reservas completadas se quieren obtener
   * @param req Objeto de request con información del usuario autenticado
   * @returns Lista de reservas completadas del usuario
   */
  @Get('usuario/:usuarioId/completadas')
  @Roles(Role.ADMIN, Role.PROPIETARIO, Role.TURISTA)
  @ApiOperation({ summary: 'Obtener reservas completadas de un usuario (cerradas y pagadas)' })
  @ApiResponse({ status: 200, description: 'Lista de reservas completadas obtenida exitosamente' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para ver las reservas de este usuario' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async getReservasCompletadasByUsuario(
    @Param('usuarioId') usuarioId: string,
    @Request() req
  ) {
    return this.reservasService.findReservasCompletadasByUsuario(usuarioId, req.user);
  }

  /**
   * Verifica un código QR de reserva para check-in
   * Requiere rol de ADMIN, PROPIETARIO, EMPLEADO, CONSERGE o RECEPCIONISTA
   * @param dto Datos del QR a verificar
   * @returns Información de la reserva si el QR es válido
   */
  @Post('verificar-qr')
  @Roles(Role.ADMIN, Role.PROPIETARIO, 'EMPLEADO', 'CONSERGE', 'RECEPCIONISTA')
  @ApiOperation({ summary: 'Verificar código QR de reserva para check-in' })
  @ApiResponse({ status: 200, description: 'QR verificado exitosamente' })
  @ApiResponse({ status: 400, description: 'Código QR inválido o expirado' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  async verificarQr(@Body() dto: VerificarQrDto) {
    return this.reservasService.verificarQr(dto);
  }

  /**
   * Realiza el check-in de una reserva con todos los huéspedes
   * Requiere rol de ADMIN, PROPIETARIO, EMPLEADO, CONSERGE o RECEPCIONISTA
   * @param dto Datos del check-in incluido QR y huéspedes
   * @returns Reserva actualizada con estado CHECK_IN
   */
  @Post('realizar-checkin')
  @Roles(Role.ADMIN, Role.PROPIETARIO, 'EMPLEADO', 'CONSERGE', 'RECEPCIONISTA')
  @ApiOperation({ summary: 'Realizar check-in de una reserva con todos los huéspedes' })
  @ApiResponse({ status: 200, description: 'Check-in realizado exitosamente' })
  @ApiResponse({ status: 400, description: 'Error en los datos del check-in' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  async realizarCheckin(@Body() dto: RealizarCheckinDto) {
    return this.reservasService.realizarCheckin(dto);
  }

}
