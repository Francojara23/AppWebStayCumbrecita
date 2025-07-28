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
import { OpinionesService, CreateOpinionDto, UpdateOpinionDto, RespuestaPropietarioDto } from './opiniones.service';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { RolesGuard } from '../auth/jwt/jwt-roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('opiniones')
@Controller('opiniones')
export class OpinionesController {
  constructor(private readonly opinionesService: OpinionesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TURISTA)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Crear una nueva opinión',
    description: 'Permite a un turista crear una opinión sobre un hospedaje después de completar su reserva'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Opinión creada exitosamente' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Datos inválidos o reserva no completada' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Reserva no encontrada' 
  })
  async crear(@Body() createOpinionDto: CreateOpinionDto, @Request() req) {
    return this.opinionesService.crear(createOpinionDto, req.user.id);
  }

  @Get('hospedaje/:hospedajeId')
  @ApiOperation({ 
    summary: 'Obtener opiniones de un hospedaje',
    description: 'Obtiene todas las opiniones visibles de un hospedaje específico'
  })
  @ApiParam({ name: 'hospedajeId', description: 'ID del hospedaje' })
  @ApiQuery({ name: 'incluirOcultas', required: false, type: Boolean, description: 'Incluir opiniones ocultas (solo admin)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de opiniones del hospedaje' 
  })
  async findByHospedaje(
    @Param('hospedajeId') hospedajeId: string,
    @Query('incluirOcultas') incluirOcultas?: boolean
  ) {
    return this.opinionesService.findByHospedaje(hospedajeId, incluirOcultas);
  }

  @Get('hospedaje/:hospedajeId/estadisticas')
  @ApiOperation({ 
    summary: 'Obtener estadísticas de opiniones de un hospedaje',
    description: 'Obtiene el promedio de calificaciones y distribución por estrellas'
  })
  @ApiParam({ name: 'hospedajeId', description: 'ID del hospedaje' })
  @ApiResponse({ 
    status: 200, 
    description: 'Estadísticas de opiniones' 
  })
  async getEstadisticas(@Param('hospedajeId') hospedajeId: string) {
    return this.opinionesService.getEstadisticas(hospedajeId);
  }

  @Get('mis-opiniones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TURISTA)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Obtener mis opiniones',
    description: 'Obtiene todas las opiniones del usuario autenticado'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de opiniones del usuario' 
  })
  async getMisOpiniones(@Request() req) {
    return this.opinionesService.findByUsuario(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Obtener una opinión específica',
    description: 'Obtiene los detalles de una opinión por su ID'
  })
  @ApiParam({ name: 'id', description: 'ID de la opinión' })
  @ApiResponse({ 
    status: 200, 
    description: 'Detalle de la opinión' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Opinión no encontrada' 
  })
  async findOne(@Param('id') id: string) {
    return this.opinionesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TURISTA)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Actualizar una opinión',
    description: 'Permite al turista propietario actualizar su opinión'
  })
  @ApiParam({ name: 'id', description: 'ID de la opinión' })
  @ApiResponse({ 
    status: 200, 
    description: 'Opinión actualizada exitosamente' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'No tienes permiso para actualizar esta opinión' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Opinión no encontrada' 
  })
  async actualizar(
    @Param('id') id: string,
    @Body() updateOpinionDto: UpdateOpinionDto,
    @Request() req
  ) {
    return this.opinionesService.actualizar(id, updateOpinionDto, req.user.id);
  }

  @Patch(':id/respuesta')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Responder a una opinión',
    description: 'Permite al propietario o admin del hospedaje responder a una opinión'
  })
  @ApiParam({ name: 'id', description: 'ID de la opinión' })
  @ApiResponse({ 
    status: 200, 
    description: 'Respuesta agregada exitosamente' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'No tienes permiso para responder esta opinión' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Opinión no encontrada' 
  })
  async responderPropietario(
    @Param('id') id: string,
    @Body() respuestaDto: RespuestaPropietarioDto,
    @Request() req
  ) {
    return this.opinionesService.responderPropietario(id, respuestaDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TURISTA)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Eliminar una opinión',
    description: 'Permite al turista propietario eliminar su opinión'
  })
  @ApiParam({ name: 'id', description: 'ID de la opinión' })
  @ApiResponse({ 
    status: 204, 
    description: 'Opinión eliminada exitosamente' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'No tienes permiso para eliminar esta opinión' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Opinión no encontrada' 
  })
  async eliminar(@Param('id') id: string, @Request() req) {
    await this.opinionesService.eliminar(id, req.user.id);
  }
}
