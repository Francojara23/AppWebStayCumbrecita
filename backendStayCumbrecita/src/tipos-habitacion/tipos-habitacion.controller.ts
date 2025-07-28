import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TiposHabitacionService } from './tipos-habitacion.service';
import { CreateTipoHabitacionDto } from './dto/create-tipo-habitacion.dto';
import { UpdateTipoHabitacionDto } from './dto/update-tipo-habitacion.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { RolesGuard } from '../auth/jwt/jwt-roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

/**
 * Controlador que maneja las peticiones HTTP relacionadas con los tipos de habitación
 * Requiere autenticación JWT y permisos de administrador para operaciones de escritura
 */
@ApiTags('tipos-habitacion')
@Controller('tipos-habitacion')
export class TiposHabitacionController {
  constructor(private readonly tiposHabitacionService: TiposHabitacionService) {}

  /**
   * Crea un nuevo tipo de habitación
   * Requiere permiso de administrador
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear un nuevo tipo de habitación' })
  @ApiResponse({ status: 201, description: 'Tipo de habitación creado exitosamente' })
  create(@Body() createTipoHabitacionDto: CreateTipoHabitacionDto) {
    return this.tiposHabitacionService.create(createTipoHabitacionDto);
  }

  /**
   * Obtiene todos los tipos de habitación
   * Accesible para todos los usuarios autenticados
   */
  @Get()
  @ApiOperation({ summary: 'Obtener todos los tipos de habitación' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de habitación obtenida exitosamente' })
  findAll() {
    return this.tiposHabitacionService.findAll();
  }

  /**
   * Busca un tipo de habitación por su ID
   * Accesible para todos los usuarios autenticados
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un tipo de habitación por ID' })
  @ApiResponse({ status: 200, description: 'Tipo de habitación obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Tipo de habitación no encontrado' })
  findOne(@Param('id') id: string) {
    return this.tiposHabitacionService.findOne(id);
  }

  /**
   * Actualiza un tipo de habitación existente
   * Requiere permiso de administrador
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar un tipo de habitación' })
  @ApiResponse({ status: 200, description: 'Tipo de habitación actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Tipo de habitación no encontrado' })
  update(@Param('id') id: string, @Body() updateTipoHabitacionDto: UpdateTipoHabitacionDto) {
    return this.tiposHabitacionService.update(id, updateTipoHabitacionDto);
  }

  /**
   * Elimina un tipo de habitación
   * Requiere permiso de administrador
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar un tipo de habitación' })
  @ApiResponse({ status: 200, description: 'Tipo de habitación eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Tipo de habitación no encontrado' })
  remove(@Param('id') id: string) {
    return this.tiposHabitacionService.remove(id);
  }
} 