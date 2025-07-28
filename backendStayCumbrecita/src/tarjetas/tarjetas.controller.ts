import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { RolesGuard } from '../auth/jwt/jwt-roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { TarjetasService } from './tarjetas.service';
import { CreateTarjetaDto } from './dto/create-tarjeta.dto';
import { UpdateTarjetaDto } from './dto/update-tarjeta.dto';
import { Tarjeta } from './entidades/tarjeta.entity';

/**
 * Controlador que maneja las peticiones HTTP relacionadas con las tarjetas
 * Solo accesible para SUPER_ADMIN (simulador de pasarela de pago)
 */
@ApiTags('tarjetas')
@Controller('tarjetas')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TarjetasController {
  constructor(private readonly tarjetasService: TarjetasService) {}

  /**
   * Crea una nueva tarjeta en el sistema
   */
  @Post()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Crear una nueva tarjeta' })
  @ApiResponse({ status: 201, description: 'Tarjeta creada exitosamente', type: Tarjeta })
  @ApiResponse({ status: 403, description: 'No tienes permiso para crear tarjetas' })
  @ApiResponse({ status: 409, description: 'Ya existe una tarjeta con este número' })
  create(@Body() createTarjetaDto: CreateTarjetaDto): Promise<Tarjeta> {
    return this.tarjetasService.create(createTarjetaDto);
  }

  /**
   * Obtiene lista de todas las tarjetas activas
   */
  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener lista de tarjetas activas' })
  @ApiResponse({ status: 200, description: 'Lista de tarjetas obtenida exitosamente', type: [Tarjeta] })
  @ApiResponse({ status: 403, description: 'No tienes permiso para ver las tarjetas' })
  findAll(): Promise<Tarjeta[]> {
    return this.tarjetasService.list();
  }

  /**
   * Busca una tarjeta por su número
   */
  @Get(':numero')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Buscar una tarjeta por número' })
  @ApiResponse({ status: 200, description: 'Tarjeta encontrada', type: Tarjeta })
  @ApiResponse({ status: 404, description: 'Tarjeta no encontrada' })
  @ApiResponse({ status: 403, description: 'No tienes permiso para buscar tarjetas' })
  findByNumero(@Param('numero') numero: string): Promise<Tarjeta | null> {
    return this.tarjetasService.findByNumero(numero);
  }

  /**
   * Actualiza una tarjeta existente
   */
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Actualizar una tarjeta' })
  @ApiResponse({ status: 200, description: 'Tarjeta actualizada exitosamente', type: Tarjeta })
  @ApiResponse({ status: 404, description: 'Tarjeta no encontrada' })
  @ApiResponse({ status: 403, description: 'No tienes permiso para actualizar tarjetas' })
  update(
    @Param('id') id: string,
    @Body() updateTarjetaDto: UpdateTarjetaDto
  ): Promise<Tarjeta> {
    return this.tarjetasService.update(id, updateTarjetaDto);
  }

  /**
   * Elimina lógicamente una tarjeta (soft delete)
   */
  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Eliminar una tarjeta (soft delete)' })
  @ApiResponse({ status: 200, description: 'Tarjeta eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Tarjeta no encontrada' })
  @ApiResponse({ status: 403, description: 'No tienes permiso para eliminar tarjetas' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.tarjetasService.softDelete(id);
    return { message: 'Tarjeta eliminada exitosamente' };
  }
} 