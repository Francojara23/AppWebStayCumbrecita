import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { HabitacionesService } from './habitaciones.service';
import { CreateHabitacionDto } from './dto/create-habitacion.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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
