import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { HabitacionesService } from './habitaciones.service';
import { CreateHabitacionDto } from './dto/create-habitacion.dto';
import { UpdateHabitacionDto } from './dto/update-habitacion.dto';
import { FindHabitacionesDto } from './dto/find-habitaciones.dto';
import { QueryDisponibilidadDto } from './dto/query-disponibilidad.dto';
import { QueryDisponibilidadMesDto } from './dto/query-disponibilidad-mes.dto';
import { QueryDisponibilidadMesesDto } from './dto/query-disponibilidad-meses.dto';
import { DisponibilidadMensualResponseDto, DisponibilidadMultipleMesesResponseDto } from './dto/disponibilidad-mensual-response.dto';
import { PrecioBaseDto } from './dto/precio-base.dto';
import { AjustePrecioDto } from './dto/ajuste-precio.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from 'src/common/enums/role.enum';

@ApiTags('habitaciones')
@Controller('habitaciones')
export class HabitacionesController {
  constructor(private readonly habitacionesService: HabitacionesService) {}

  @Get()
  @ApiOperation({ summary: 'Búsqueda global de habitaciones' })
  @ApiResponse({ status: 200, description: 'Lista de habitaciones obtenida exitosamente' })
  findAll(@Query() filters: FindHabitacionesDto) {
    return this.habitacionesService.findAll(filters);
  }

  @Get('disponibilidad')
  @ApiOperation({ summary: 'Buscar habitaciones disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de habitaciones disponibles obtenida exitosamente' })
  findDisponibles(@Query() query: QueryDisponibilidadDto) {
    return this.habitacionesService.findDisponibles(query);
  }

  @Get('hospedajes/:hospedajeId/disponibilidad')
  @ApiOperation({ summary: 'Buscar habitaciones disponibles en un hospedaje específico' })
  @ApiResponse({ status: 200, description: 'Lista de habitaciones disponibles obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'Hospedaje no encontrado' })
  findDisponiblesByHospedaje(
    @Param('hospedajeId') hospedajeId: string,
    @Query() query: QueryDisponibilidadDto,
  ) {
    return this.habitacionesService.findDisponiblesByHospedaje(hospedajeId, query);
  }

  @Get('hospedajes/:hospedajeId/disponibilidad-mes')
  @ApiOperation({ summary: 'Buscar habitaciones con disponibilidad en un mes específico' })
  @ApiResponse({ 
    status: 200, 
    description: 'Habitaciones con días disponibles en el mes consultado',
    type: DisponibilidadMensualResponseDto
  })
  @ApiResponse({ status: 404, description: 'Hospedaje no encontrado' })
  findDisponibilidadMensual(
    @Param('hospedajeId') hospedajeId: string,
    @Query() query: QueryDisponibilidadMesDto,
  ) {
    return this.habitacionesService.findDisponibilidadMensual(hospedajeId, query);
  }

  @Get('hospedajes/:hospedajeId/disponibilidad-meses')
  @ApiOperation({ summary: 'Buscar habitaciones con disponibilidad en múltiples meses' })
  @ApiResponse({ 
    status: 200, 
    description: 'Habitaciones con días disponibles en los meses consultados',
    type: DisponibilidadMultipleMesesResponseDto
  })
  @ApiResponse({ status: 404, description: 'Hospedaje no encontrado' })
  findDisponibilidadMultiplesMeses(
    @Param('hospedajeId') hospedajeId: string,
    @Query() query: QueryDisponibilidadMesesDto,
  ) {
    return this.habitacionesService.findDisponibilidadMultiplesMeses(hospedajeId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una habitación' })
  @ApiResponse({ status: 200, description: 'Detalle de la habitación obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Habitación no encontrada' })
  findOne(@Param('id') id: string) {
    return this.habitacionesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar una habitación' })
  @ApiResponse({ status: 200, description: 'Habitación actualizada exitosamente' })
  @ApiResponse({ status: 403, description: 'No tienes permiso para actualizar esta habitación' })
  @ApiResponse({ status: 404, description: 'Habitación no encontrada' })
  update(
    @Param('id') id: string,
    @Body() updateHabitacionDto: UpdateHabitacionDto,
    @Request() req
  ) {
    return this.habitacionesService.update(id, updateHabitacionDto, req.user.id, req.user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar una habitación' })
  @ApiResponse({ status: 200, description: 'Habitación eliminada exitosamente' })
  @ApiResponse({ status: 403, description: 'No tienes permiso para eliminar esta habitación' })
  @ApiResponse({ status: 404, description: 'Habitación no encontrada' })
  remove(@Param('id') id: string, @Request() req) {
    return this.habitacionesService.remove(id, req.user.id, req.user.role);
  }

  @Get('tipos')
  @ApiOperation({ summary: 'Obtener catálogo de tipos de habitación' })
  @ApiResponse({ status: 200, description: 'Catálogo de tipos obtenido exitosamente' })
  findAllTipos() {
    return this.habitacionesService.findAllTipos();
  }

  @Get('precios/rangos')
  @ApiOperation({ summary: 'Obtener rangos de precio mínimo y máximo de todas las habitaciones' })
  @ApiResponse({ status: 200, description: 'Rangos de precio obtenidos exitosamente' })
  getRangosPrecio(
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string
  ) {
    const fechaInicioDate = fechaInicio ? new Date(fechaInicio) : undefined;
    const fechaFinDate = fechaFin ? new Date(fechaFin) : undefined;
    return this.habitacionesService.getRangosPrecio(fechaInicioDate, fechaFinDate);
  }

  @Get(':id/imagenes')
  @ApiOperation({ summary: 'Obtener imágenes de una habitación' })
  @ApiResponse({ status: 200, description: 'Imágenes obtenidas exitosamente' })
  @ApiResponse({ status: 404, description: 'Habitación no encontrada' })
  findImagenes(@Param('id') id: string) {
    return this.habitacionesService.findImagenesByHabitacion(id);
  }

  @Patch(':id/precio-base')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.PROPIETARIO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Establecer precio base de una habitación' })
  @ApiResponse({ status: 200, description: 'Precio base actualizado exitosamente' })
  setPrecioBase(
    @Param('id') id: string,
    @Body() dto: PrecioBaseDto,
    @Request() req
  ) {
    return this.habitacionesService.setPrecioBase(id, dto, req.user.id, req.user.role);
  }

  @Post(':id/ajustes')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.PROPIETARIO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Añadir ajuste de precio a una habitación' })
  @ApiResponse({ status: 201, description: 'Ajuste añadido exitosamente' })
  addAjuste(
    @Param('id') id: string,
    @Body() dto: AjustePrecioDto,
    @Request() req
  ) {
    return this.habitacionesService.addAjuste(id, dto, req.user.id, req.user.role);
  }

  @Patch(':id/ajustes/:idx')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.PROPIETARIO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar ajuste de precio de una habitación' })
  @ApiResponse({ status: 200, description: 'Ajuste actualizado exitosamente' })
  updateAjuste(
    @Param('id') id: string,
    @Param('idx') idx: number,
    @Body() dto: AjustePrecioDto,
    @Request() req
  ) {
    return this.habitacionesService.updateAjuste(id, idx, dto, req.user.id, req.user.role);
  }

  @Delete(':id/ajustes/:idx')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.PROPIETARIO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar ajuste de precio de una habitación' })
  @ApiResponse({ status: 200, description: 'Ajuste eliminado exitosamente' })
  deleteAjuste(
    @Param('id') id: string,
    @Param('idx') idx: number,
    @Request() req
  ) {
    return this.habitacionesService.deleteAjuste(id, idx, req.user.id, req.user.role);
  }

  @Get(':id/precio')
  @ApiOperation({ summary: 'Obtener precio de una habitación para una fecha específica' })
  @ApiResponse({ status: 200, description: 'Precio obtenido exitosamente' })
  getPrecioPorFecha(
    @Param('id') id: string,
    @Query('fecha') fecha: string
  ) {
    return this.habitacionesService.getPrecioPorFecha(id, new Date(fecha));
  }

  @Get(':id/calendario-precios')
  @ApiOperation({ summary: 'Obtener calendario de precios de una habitación' })
  @ApiResponse({ status: 200, description: 'Calendario de precios obtenido exitosamente' })
  getCalendarioPrecios(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string
  ) {
    return this.habitacionesService.getCalendarioPrecios(id, new Date(from), new Date(to));
  }



  @Patch('servicios/:catalogoId')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.PROPIETARIO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar servicio de habitación' })
  @ApiResponse({ status: 200, description: 'Servicio actualizado exitosamente' })
  updateServicio(
    @Param('catalogoId') catalogoId: string,
    @Body() dto: UpdateServicioDto,
    @Request() req
  ) {
    return this.habitacionesService.updateServicio(catalogoId, dto, req.user.id, req.user.role);
  }

  /* ------------------------------------------------------------------ */
  /*  Endpoints para Imágenes                                            */
  /* ------------------------------------------------------------------ */

  @Post(':id/imagenes')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Agregar imagen a una habitación' })
  @ApiResponse({ status: 201, description: 'Imagen agregada exitosamente' })
  @ApiResponse({ status: 403, description: 'No tienes permiso para agregar imágenes a esta habitación' })
  @ApiResponse({ status: 404, description: 'Habitación no encontrada' })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  addImagen(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('descripcion') descripcion?: string,
    @Body('orden') orden?: number,
    @Request() req?
  ) {
    return this.habitacionesService.addImagen(id, file, descripcion, orden, req?.user?.id, req?.user?.role);
  }

  @Delete(':id/imagenes/:imagenId')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar imagen de una habitación' })
  @ApiResponse({ status: 200, description: 'Imagen eliminada exitosamente' })
  @ApiResponse({ status: 403, description: 'No tienes permiso para eliminar imágenes de esta habitación' })
  @ApiResponse({ status: 404, description: 'Imagen no encontrada' })
  removeImagen(
    @Param('id') id: string,
    @Param('imagenId') imagenId: string,
    @Request() req?
  ) {
    return this.habitacionesService.removeImagen(id, imagenId, req?.user?.id, req?.user?.role);
  }
}
