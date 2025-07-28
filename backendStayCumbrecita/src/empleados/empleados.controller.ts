import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { EmpleadosService } from './empleados.service';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../auth/jwt/jwt-roles.guard';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

// Nuevo controlador simplificado para empleados
@ApiTags('empleados')
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PROPIETARIO, Role.ADMIN, Role.SUPER_ADMIN, Role.EMPLEADO)
@Controller('empleados')
export class EmpleadosSimpleController {
  constructor(private readonly empleadosService: EmpleadosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo empleado' })
  @ApiResponse({ status: 201, description: 'Empleado creado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario, hospedaje o rol no encontrado' })
  @ApiResponse({ status: 400, description: 'El usuario debe tener rol EMPLEADO' })
  createEmpleado(@Body() createEmpleadoDto: CreateEmpleadoDto & { hospedajeId: string }) {
    return this.empleadosService.create(createEmpleadoDto.hospedajeId, createEmpleadoDto);
  }

  @Get('hospedaje/:hospedajeId')
  @ApiOperation({ summary: 'Listar empleados de un hospedaje' })
  @ApiResponse({ status: 200, description: 'Lista de empleados' })
  findEmpleadosByHospedaje(
    @Param('hospedajeId') hospedajeId: string,
    @Request() req,
    @Query('rol') rol?: string,
    @Query('search') search?: string,
  ) {
    return this.empleadosService.findAllWithPermissions(hospedajeId, req.user.id, req.user.roles[0], rol, search);
  }

  @Delete(':empleadoId')
  @ApiOperation({ summary: 'Eliminar un empleado' })
  @ApiResponse({ status: 200, description: 'Empleado eliminado exitosamente' })
  removeEmpleado(@Param('empleadoId') empleadoId: string) {
    return this.empleadosService.removeById(empleadoId);
  }

  @Get('mis-empleos')
  @Roles(Role.EMPLEADO, Role.PROPIETARIO, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener empleos del usuario actual' })
  @ApiResponse({ status: 200, description: 'Lista de empleos del usuario' })
  findMisEmpleos(@Request() req) {
    return this.empleadosService.findHotelesByUsuario(req.user.id);
  }
}

@ApiTags('empleados')
@Controller('api/hoteles/:hotelId/empleados')
@UseGuards(RolesGuard)
export class EmpleadosController {
  constructor(private readonly empleadosService: EmpleadosService) {}

  @Post()
  @Roles('PROPIETARIO')
  @ApiOperation({ summary: 'Crear un nuevo empleado en el hotel' })
  @ApiResponse({ status: 201, description: 'Empleado creado exitosamente' })
  create(
    @Param('hotelId') hotelId: string,
    @Body() createEmpleadoDto: CreateEmpleadoDto,
  ) {
    return this.empleadosService.create(hotelId, createEmpleadoDto);
  }

  @Get()
  @Roles('PROPIETARIO', 'EMPLEADO')
  @ApiOperation({ summary: 'Listar empleados del hotel' })
  @ApiResponse({ status: 200, description: 'Lista de empleados' })
  findAll(
    @Param('hotelId') hotelId: string,
    @Query('rol') rol?: string,
    @Query('search') search?: string,
  ) {
    return this.empleadosService.findAll(hotelId, rol, search);
  }

  @Patch(':empleadoId')
  @Roles('PROPIETARIO')
  @ApiOperation({ summary: 'Actualizar datos de un empleado' })
  @ApiResponse({ status: 200, description: 'Empleado actualizado exitosamente' })
  update(
    @Param('hotelId') hotelId: string,
    @Param('empleadoId') empleadoId: string,
    @Body() updateEmpleadoDto: UpdateEmpleadoDto,
  ) {
    return this.empleadosService.update(hotelId, empleadoId, updateEmpleadoDto);
  }

  @Delete(':empleadoId')
  @Roles('PROPIETARIO')
  @ApiOperation({ summary: 'Eliminar un empleado' })
  @ApiResponse({ status: 200, description: 'Empleado eliminado exitosamente' })
  remove(
    @Param('hotelId') hotelId: string,
    @Param('empleadoId') empleadoId: string,
  ) {
    return this.empleadosService.remove(hotelId, empleadoId);
  }
}

@Controller('api/usuarios/:usuarioId/hoteles')
@UseGuards(RolesGuard)
export class UsuarioHotelesController {
  constructor(private readonly empleadosService: EmpleadosService) {}

  @Get()
  @Roles('PROPIETARIO', 'EMPLEADO')
  @ApiOperation({ summary: 'Listar hoteles donde trabaja un usuario' })
  @ApiResponse({ status: 200, description: 'Lista de hoteles' })
  findHotelesByUsuario(@Param('usuarioId') usuarioId: string) {
    return this.empleadosService.findHotelesByUsuario(usuarioId);
  }
}
