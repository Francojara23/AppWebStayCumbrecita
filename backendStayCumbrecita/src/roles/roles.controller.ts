import { Body, Controller, Get, Post, Patch, Param, Delete, UseGuards } from "@nestjs/common";
import { RolesService } from "./roles.service";
import { CreateRoleDTO } from "./dto/create-role.dto";
import { UpdateRoleDTO } from "./dto/update-role.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from 'src/common/enums/role.enum';

/**
 * Controlador que maneja las peticiones HTTP relacionadas con los roles
 * Requiere autenticación JWT y permisos específicos para ciertas operaciones
 */
@ApiTags("roles")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard)
@Controller("roles")
export class RolesController {
  constructor(private rolesService: RolesService) {}

  /**
   * Obtiene todos los roles activos del sistema
   * @returns Lista de roles con sus permisos
   */
  @Get()
  @ApiOperation({ summary: "Obtener todos los roles activos" })
  @ApiResponse({ status: 200, description: "Lista de roles obtenida exitosamente" })
  findAll() {
    return this.rolesService.findAll();
  }

  /**
   * Obtiene un rol específico por su ID
   * @param id ID del rol a buscar
   * @returns Rol encontrado con sus permisos
   */
  @Get(":id")
  @ApiOperation({ summary: "Obtener un rol activo por ID" })
  @ApiResponse({ status: 200, description: "Rol encontrado exitosamente" })
  @ApiResponse({ status: 404, description: "Rol no encontrado" })
  findOne(@Param("id") id: string) {
    return this.rolesService.findOne(id);
  }

  /**
   * Crea un nuevo rol en el sistema
   * Requiere permisos de SUPER_ADMIN o PROPIETARIO
   * @param createRoleDTO Datos del rol a crear
   * @returns Rol creado
   */
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.PROPIETARIO)
  @ApiOperation({ summary: "Crear un nuevo rol" })
  @ApiResponse({ status: 201, description: "Rol creado exitosamente" })
  @ApiResponse({ status: 409, description: "Ya existe un rol con ese nombre" })
  create(@Body() createRoleDTO: CreateRoleDTO) {
    return this.rolesService.create(createRoleDTO);
  }

  /**
   * Actualiza un rol existente
   * Requiere permisos de SUPER_ADMIN o PROPIETARIO
   * @param id ID del rol a actualizar
   * @param updateRoleDTO Datos a actualizar
   * @returns Rol actualizado
   */
  @Patch(":id")
  @Roles(Role.SUPER_ADMIN, Role.PROPIETARIO)
  @ApiOperation({ summary: "Actualizar un rol" })
  @ApiResponse({ status: 200, description: "Rol actualizado exitosamente" })
  @ApiResponse({ status: 404, description: "Rol no encontrado" })
  @ApiResponse({ status: 409, description: "Ya existe un rol con ese nombre" })
  update(@Param("id") id: string, @Body() updateRoleDTO: UpdateRoleDTO) {
    return this.rolesService.update(id, updateRoleDTO);
  }

  /**
   * Desactiva un rol (soft delete)
   * Requiere permisos de SUPER_ADMIN o PROPIETARIO
   * @param id ID del rol a desactivar
   * @returns Mensaje de confirmación
   */
  @Delete(":id")
  @Roles(Role.SUPER_ADMIN, Role.PROPIETARIO)
  @ApiOperation({ summary: "Desactivar un rol" })
  @ApiResponse({ status: 200, description: "Rol desactivado exitosamente" })
  @ApiResponse({ status: 404, description: "Rol no encontrado" })
  @ApiResponse({ status: 400, description: "No se puede desactivar el rol porque está en uso" })
  remove(@Param("id") id: string) {
    return this.rolesService.remove(id);
  }
}
