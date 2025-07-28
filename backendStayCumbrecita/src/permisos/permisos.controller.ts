import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { PermisosService } from "./permisos.service";
import { CreatePermisoDTO } from "./dto/create-permiso.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from 'src/common/enums/role.enum';

/**
 * Controlador que maneja las peticiones HTTP relacionadas con los permisos
 * Requiere autenticación JWT y permisos específicos para ciertas operaciones
 */
@ApiTags("permisos")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard)
@Controller("permisos")
export class PermisosController {
  constructor(private readonly permisosService: PermisosService) {}

  /**
   * Obtiene todos los permisos activos del sistema
   * Accesible para todos los usuarios autenticados
   */
  @Get()
  @ApiOperation({ summary: "Obtener todos los permisos activos" })
  @ApiResponse({ status: 200, description: "Lista de permisos obtenida exitosamente" })
  findAll() {
    return this.permisosService.findAll();
  }

  /**
   * Crea un nuevo permiso en el sistema
   * Requiere permisos de SUPER_ADMIN o PROPIETARIO
   */
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.PROPIETARIO)
  @ApiOperation({ summary: "Crear un nuevo permiso" })
  @ApiResponse({ status: 201, description: "Permiso creado exitosamente" })
  @ApiResponse({ status: 409, description: "Ya existe un permiso con ese nombre" })
  create(@Body() createPermisoDTO: CreatePermisoDTO) {
    return this.permisosService.create(createPermisoDTO);
  }
} 