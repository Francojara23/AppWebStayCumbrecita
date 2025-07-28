import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { RolesGuard } from '../auth/jwt/jwt-roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { ServiciosService } from './servicios.service';
import { CreateServicioCatalogoDto } from './dto/create-servicio-catalogo.dto';
import { UpdateServicioCatalogoDto } from './dto/update-servicio-catalogo.dto';
import { AsignarServicioDto } from './dto/asignar-servicio.dto';
import { TipoServicio } from './entidades/servicio-catalogo.entity';

/**
 * Controlador que maneja las peticiones HTTP relacionadas con los servicios
 * Requiere autenticación JWT y permisos específicos para ciertas operaciones
 */
@Controller('servicios')
@ApiTags('servicios')
export class ServiciosController {
  constructor(private readonly serviciosService: ServiciosService) {}

  /**
   * Crea un nuevo servicio en el catálogo
   * Requiere permiso de administrador
   */
  @Post('catalogo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear un nuevo servicio en el catálogo' })
  @ApiResponse({ status: 201, description: 'Servicio creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  createServicioCatalogo(@Body() createDto: CreateServicioCatalogoDto) {
    return this.serviciosService.createServicioCatalogo(createDto);
  }

  /**
   * Obtiene todos los servicios del catálogo
   * Accesible públicamente
   */
  @Get('catalogo')
  @ApiOperation({ summary: 'Obtener todos los servicios del catálogo' })
  @ApiResponse({ status: 200, description: 'Lista de servicios obtenida exitosamente' })
  findAllServiciosCatalogo() {
    return this.serviciosService.findAllServiciosCatalogo();
  }

  /**
   * Busca servicios del catálogo por tipo
   * Accesible públicamente
   */
  @Get('catalogo/tipo/:tipo')
  @ApiOperation({ summary: 'Buscar servicios por tipo' })
  @ApiResponse({ status: 200, description: 'Lista de servicios filtrada por tipo' })
  findServiciosCatalogoByTipo(@Param('tipo') tipo: TipoServicio) {
    return this.serviciosService.findServiciosCatalogoByTipo(tipo);
  }

  /**
   * Busca un servicio específico del catálogo por ID
   * Accesible públicamente
   */
  @Get('catalogo/:id')
  @ApiOperation({ summary: 'Buscar un servicio por ID' })
  @ApiResponse({ status: 200, description: 'Servicio encontrado exitosamente' })
  @ApiResponse({ status: 404, description: 'Servicio no encontrado' })
  findOneServicioCatalogo(@Param('id') id: string) {
    return this.serviciosService.findOneServicioCatalogo(id);
  }

  /**
   * Actualiza un servicio del catálogo
   * Requiere permiso de administrador
   */
  @Patch('catalogo/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar un servicio del catálogo' })
  @ApiResponse({ status: 200, description: 'Servicio actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Servicio no encontrado' })
  updateServicioCatalogo(
    @Param('id') id: string,
    @Body() updateDto: UpdateServicioCatalogoDto
  ) {
    return this.serviciosService.updateServicioCatalogo(id, updateDto);
  }

  /**
   * Elimina un servicio del catálogo
   * Requiere permiso de administrador
   */
  @Delete('catalogo/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar un servicio del catálogo' })
  @ApiResponse({ status: 200, description: 'Servicio eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Servicio no encontrado' })
  removeServicioCatalogo(@Param('id') id: string) {
    return this.serviciosService.removeServicioCatalogo(id);
  }

  /**
   * Asigna un servicio a un hospedaje
   * Requiere permiso de administrador o propietario
   */
  @Post('hospedajes/:id/servicios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Asignar un servicio a un hospedaje' })
  @ApiResponse({ status: 201, description: 'Servicio asignado exitosamente' })
  asignarServicioHospedaje(
    @Param('id') id: string,
    @Body() asignarDto: AsignarServicioDto
  ) {
    return this.serviciosService.asignarServicioHospedaje(id, asignarDto);
  }

  /**
   * Obtiene los servicios asignados a un hospedaje
   * Accesible públicamente para consultas
   */
  @Get('hospedajes/:id/servicios')
  @ApiOperation({ summary: 'Obtener servicios de un hospedaje' })
  @ApiResponse({ status: 200, description: 'Lista de servicios obtenida exitosamente' })
  findServiciosByHospedaje(@Param('id') id: string) {
    return this.serviciosService.findServiciosByHospedaje(id);
  }

  /**
   * Busca servicios asignados a un hospedaje por término de búsqueda
   * Accesible públicamente para consultas del chatbot
   */
  @Get('hospedajes/:id/buscar')
  @ApiOperation({ summary: 'Buscar servicios de un hospedaje por término' })
  @ApiQuery({ 
    name: 'termino', 
    description: 'Término a buscar en nombre o descripción del servicio',
    example: 'jacuzzi',
    required: true
  })
  @ApiResponse({ status: 200, description: 'Lista de servicios filtrados obtenida exitosamente' })
  @ApiResponse({ status: 400, description: 'El término de búsqueda es requerido' })
  buscarServiciosByHospedaje(
    @Param('id') id: string,
    @Query('termino') termino: string
  ) {
    if (!termino || termino.trim() === '') {
      throw new BadRequestException('El término de búsqueda es requerido');
    }
    return this.serviciosService.buscarServiciosByHospedaje(id, termino.trim());
  }

  /**
   * Elimina un servicio asignado a un hospedaje
   * Requiere permiso de administrador o propietario
   */
  @Delete('hospedajes/:hospedajeId/servicios/:servicioId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar un servicio de un hospedaje' })
  @ApiResponse({ status: 200, description: 'Servicio eliminado exitosamente' })
  removeServicioHospedaje(
    @Param('hospedajeId') hospedajeId: string,
    @Param('servicioId') servicioId: string
  ) {
    return this.serviciosService.removeServicioHospedaje(hospedajeId, servicioId);
  }

  /**
   * Asigna un servicio a una habitación
   * Requiere permiso de administrador o propietario
   */
  @Post('habitaciones/:id/servicios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Asignar un servicio a una habitación' })
  @ApiResponse({ status: 201, description: 'Servicio asignado exitosamente' })
  asignarServicioHabitacion(
    @Param('id') id: string,
    @Body() asignarDto: AsignarServicioDto
  ) {
    return this.serviciosService.asignarServicioHabitacion(id, asignarDto);
  }

  /**
   * Obtiene los servicios asignados a una habitación
   * Accesible públicamente para consultas
   */
  @Get('habitaciones/:id/servicios')
  @ApiOperation({ summary: 'Obtener servicios de una habitación' })
  @ApiResponse({ status: 200, description: 'Lista de servicios obtenida exitosamente' })
  findServiciosByHabitacion(@Param('id') id: string) {
    return this.serviciosService.findServiciosByHabitacion(id);
  }

  /**
   * Busca servicios asignados a una habitación por término de búsqueda
   * Accesible públicamente para consultas del chatbot
   */
  @Get('habitaciones/:id/buscar')
  @ApiOperation({ summary: 'Buscar servicios de una habitación por término' })
  @ApiQuery({ 
    name: 'termino', 
    description: 'Término a buscar en nombre o descripción del servicio',
    example: 'jacuzzi',
    required: true
  })
  @ApiResponse({ status: 200, description: 'Lista de servicios filtrados obtenida exitosamente' })
  @ApiResponse({ status: 400, description: 'El término de búsqueda es requerido' })
  buscarServiciosByHabitacion(
    @Param('id') id: string,
    @Query('termino') termino: string
  ) {
    if (!termino || termino.trim() === '') {
      throw new BadRequestException('El término de búsqueda es requerido');
    }
    return this.serviciosService.buscarServiciosByHabitacion(id, termino.trim());
  }

  /**
   * Elimina un servicio asignado a una habitación
   * Requiere permiso de administrador o propietario
   */
  @Delete('habitaciones/:habitacionId/servicios/:servicioId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar un servicio de una habitación' })
  @ApiResponse({ status: 200, description: 'Servicio eliminado exitosamente' })
  removeServicioHabitacion(
    @Param('habitacionId') habitacionId: string,
    @Param('servicioId') servicioId: string
  ) {
    return this.serviciosService.removeServicioHabitacion(habitacionId, servicioId);
  }
}
