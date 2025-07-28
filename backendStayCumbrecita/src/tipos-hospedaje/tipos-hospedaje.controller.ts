import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { RolesGuard } from '../auth/jwt/jwt-roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { TiposHospedajeService } from './tipos-hospedaje.service';
import { CreateTipoHospedajeDto } from './dto/create-tipo-hospedaje.dto';
import { UpdateTipoHospedajeDto } from './dto/update-tipo-hospedaje.dto';
import { TipoHospedaje } from './entidades/tipo-hospedaje.entity';

/**
 * Controlador que maneja las peticiones HTTP relacionadas con los tipos de hospedaje
 * Requiere autenticación JWT y permisos de administrador para operaciones de escritura
 */
@ApiTags('tipos-hospedaje')
@Controller('tipos-hospedaje')
export class TiposHospedajeController {
  constructor(private readonly tiposHospedajeService: TiposHospedajeService) {}

  /**
   * Crea un nuevo tipo de hospedaje
   * Requiere permiso de administrador
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Crear un nuevo tipo de hospedaje' })
  @ApiResponse({ status: 201, description: 'Tipo de hospedaje creado exitosamente', type: TipoHospedaje })
  create(@Body() createTipoHospedajeDto: CreateTipoHospedajeDto) {
    return this.tiposHospedajeService.create(createTipoHospedajeDto);
  }

  /**
   * Obtiene todos los tipos de hospedaje
   * Accesible para todos los usuarios autenticados
   */
  @Get()
  @ApiOperation({ summary: 'Obtener todos los tipos de hospedaje' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de hospedaje', type: [TipoHospedaje] })
  findAll() {
    return this.tiposHospedajeService.findAll();
  }

  /**
   * Busca un tipo de hospedaje por su ID
   * Accesible para todos los usuarios autenticados
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un tipo de hospedaje por ID' })
  @ApiResponse({ status: 200, description: 'Tipo de hospedaje encontrado', type: TipoHospedaje })
  @ApiResponse({ status: 404, description: 'Tipo de hospedaje no encontrado' })
  findOne(@Param('id') id: string) {
    return this.tiposHospedajeService.findOne(id);
  }

  /**
   * Actualiza un tipo de hospedaje existente
   * Requiere permiso de administrador
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Actualizar un tipo de hospedaje' })
  @ApiResponse({ status: 200, description: 'Tipo de hospedaje actualizado exitosamente', type: TipoHospedaje })
  @ApiResponse({ status: 404, description: 'Tipo de hospedaje no encontrado' })
  update(@Param('id') id: string, @Body() updateTipoHospedajeDto: UpdateTipoHospedajeDto) {
    return this.tiposHospedajeService.update(id, updateTipoHospedajeDto);
  }

  /**
   * Elimina un tipo de hospedaje
   * Requiere permiso de administrador
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Eliminar un tipo de hospedaje' })
  @ApiResponse({ status: 200, description: 'Tipo de hospedaje eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Tipo de hospedaje no encontrado' })
  remove(@Param('id') id: string) {
    return this.tiposHospedajeService.remove(id);
  }
} 