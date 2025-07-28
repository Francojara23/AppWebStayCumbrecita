import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Request,
  Query,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PublicidadService, CreatePublicidadDto, UpdatePublicidadDto, CancelarPublicidadDto } from './publicidad.service';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { RolesGuard } from '../auth/jwt/jwt-roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('publicidad')
@Controller('publicidad')
export class PublicidadController {
  constructor(private readonly publicidadService: PublicidadService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Crear nueva publicidad',
    description: 'Permite a propietarios y admins crear publicidad para destacar hospedajes. El pago se valida inmediatamente.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Publicidad creada y activada exitosamente' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Datos inválidos o pago rechazado' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'No tienes permiso para crear publicidad para este hospedaje' 
  })
  async crear(@Body() createPublicidadDto: CreatePublicidadDto, @Request() req) {
    return this.publicidadService.crear(createPublicidadDto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Obtener publicidades',
    description: 'Lista las publicidades con filtros opcionales'
  })
  @ApiQuery({ name: 'usuarioId', required: false, description: 'Filtrar por ID de usuario' })
  @ApiQuery({ name: 'hospedajeId', required: false, description: 'Filtrar por ID de hospedaje' })
  @ApiQuery({ name: 'activas', required: false, type: Boolean, description: 'Solo publicidades activas y vigentes' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de publicidades' 
  })
  async findAll(
    @Query('usuarioId') usuarioId?: string,
    @Query('hospedajeId') hospedajeId?: string,
    @Query('activas') activas?: boolean
  ) {
    return this.publicidadService.findAll(usuarioId, hospedajeId, activas);
  }

  @Get('mis-publicidades')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Obtener mis publicidades',
    description: 'Lista todas las publicidades del usuario autenticado'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de publicidades del usuario' 
  })
  async getMisPublicidades(@Request() req) {
    return this.publicidadService.findAll(req.user.id);
  }

  @Get('administrar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN, Role.EMPLEADO, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Obtener publicidades de hospedajes que administra el usuario',
    description: 'Lista las publicidades de los hospedajes donde el usuario es propietario o empleado'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de publicidades de hospedajes administrados' 
  })
  async findPublicidadesByAdministrador(@Request() req) {
    return this.publicidadService.findPublicidadesByAdministrador(req.user.id);
  }

  @Get('hospedaje/:hospedajeId/estadisticas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Obtener estadísticas de publicidad de un hospedaje',
    description: 'Muestra estadísticas detalladas de inversión publicitaria'
  })
  @ApiParam({ name: 'hospedajeId', description: 'ID del hospedaje' })
  @ApiResponse({ 
    status: 200, 
    description: 'Estadísticas de publicidad' 
  })
  async getEstadisticas(@Param('hospedajeId') hospedajeId: string) {
    return this.publicidadService.getEstadisticas(hospedajeId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Obtener detalle de una publicidad',
    description: 'Obtiene los detalles completos de una publicidad específica'
  })
  @ApiParam({ name: 'id', description: 'ID de la publicidad' })
  @ApiResponse({ 
    status: 200, 
    description: 'Detalle de la publicidad' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Publicidad no encontrada' 
  })
  async findOne(@Param('id') id: string) {
    return this.publicidadService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Actualizar configuración de publicidad',
    description: 'Permite actualizar configuraciones como renovación automática'
  })
  @ApiParam({ name: 'id', description: 'ID de la publicidad' })
  @ApiResponse({ 
    status: 200, 
    description: 'Publicidad actualizada exitosamente' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'No tienes permiso para actualizar esta publicidad' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Publicidad no encontrada' 
  })
  async actualizar(
    @Param('id') id: string,
    @Body() updatePublicidadDto: UpdatePublicidadDto,
    @Request() req
  ) {
    return this.publicidadService.actualizar(id, updatePublicidadDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Cancelar una publicidad',
    description: 'Cancela una publicidad activa antes de su vencimiento'
  })
  @ApiParam({ name: 'id', description: 'ID de la publicidad' })
  @ApiResponse({ 
    status: 200, 
    description: 'Publicidad cancelada exitosamente' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'No tienes permiso para cancelar esta publicidad' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Publicidad no encontrada' 
  })
  async cancelar(
    @Param('id') id: string, 
    @Body() cancelarDto: CancelarPublicidadDto,
    @Request() req
  ) {
    return this.publicidadService.cancelar(id, cancelarDto, req.user.id);
  }

  @Post('procesar-renovaciones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Procesar renovaciones automáticas (admin)',
    description: 'Endpoint administrativo para procesar renovaciones automáticas manualmente'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Renovaciones procesadas exitosamente' 
  })
  async procesarRenovaciones() {
    await this.publicidadService.procesarRenovacionesAutomaticas();
    return { message: 'Renovaciones automáticas procesadas' };
  }

  @Post('marcar-expiradas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Marcar publicidades expiradas (admin)',
    description: 'Endpoint administrativo para marcar publicidades vencidas como expiradas'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Publicidades expiradas marcadas exitosamente' 
  })
  async marcarExpiradas() {
    await this.publicidadService.marcarExpiradas();
    return { message: 'Publicidades expiradas marcadas' };
  }
}
