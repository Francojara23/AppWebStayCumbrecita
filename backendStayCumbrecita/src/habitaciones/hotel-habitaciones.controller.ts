import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { HabitacionesService } from './habitaciones.service';
import { CreateHabitacionDto } from './dto/create-habitacion.dto';
import { CreateMultipleHabitacionesDto } from './dto/create-multiple-habitaciones.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { AnyFilesInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

@ApiTags('hospedajes')
@Controller('hospedajes/:hospedajeId/habitaciones')
export class HotelHabitacionesController {
  constructor(private readonly habitacionesService: HabitacionesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear una nueva habitación en el hospedaje' })
  @ApiResponse({ status: 201, description: 'Habitación creada exitosamente' })
  @ApiResponse({ status: 403, description: 'No tienes permiso para crear habitaciones en este hospedaje' })
  @ApiResponse({ status: 404, description: 'Hospedaje no encontrado' })
  create(
    @Param('hospedajeId') hospedajeId: string,
    @Body() createHabitacionDto: CreateHabitacionDto,
    @Request() req
  ) {
    return this.habitacionesService.create(hospedajeId, createHabitacionDto, req.user.id, req.user.role);
  }

  @Post('multiple')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear múltiples habitaciones idénticas en el hospedaje' })
  @ApiResponse({ status: 201, description: 'Habitaciones múltiples creadas exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos para crear habitaciones múltiples' })
  @ApiResponse({ status: 403, description: 'No tienes permiso para crear habitaciones en este hospedaje' })
  @ApiResponse({ status: 404, description: 'Hospedaje no encontrado' })
  createMultipleInHospedaje(
    @Param('hospedajeId') hospedajeId: string,
    @Body() createMultipleDto: CreateMultipleHabitacionesDto,
    @Request() req
  ) {
    return this.habitacionesService.createMultipleInHospedaje(
      hospedajeId, 
      createMultipleDto, 
      req.user.id, 
      req.user.role
    );
  }

  @Post('multiple/:habitacionIds/imagenes')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FilesInterceptor('files', 20))
  @ApiOperation({ summary: 'Agregar imágenes a múltiples habitaciones (subida optimizada)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Imágenes agregadas exitosamente a todas las habitaciones' })
  @ApiResponse({ status: 403, description: 'No tienes permiso para agregar imágenes a estas habitaciones' })
  @ApiResponse({ status: 404, description: 'Una o más habitaciones no encontradas' })
  addImagenesToMultipleHabitaciones(
    @Param('hospedajeId') hospedajeId: string,
    @Param('habitacionIds') habitacionIds: string, // IDs separados por coma: "id1,id2,id3"
    @UploadedFiles() files: Express.Multer.File[],
    @Body('descripciones') descripciones?: string, // JSON string array
    @Body('ordenes') ordenes?: string, // JSON string array
    @Request() req?
  ) {
    const habitacionIdsArray = habitacionIds.split(',');
    return this.habitacionesService.addImagenesToMultipleHabitaciones(
      hospedajeId,
      habitacionIdsArray,
      files, 
      descripciones, 
      ordenes, 
      req?.user?.id, 
      req?.user?.role
    );
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las habitaciones del hospedaje' })
  @ApiResponse({ status: 200, description: 'Lista de habitaciones obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'Hospedaje no encontrado' })
  findAll(
    @Param('hospedajeId') hospedajeId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.habitacionesService.findAllByHospedaje(hospedajeId, page, limit);
  }
}
