import { Body, Controller, Get, Post, Put, Param, Delete, Patch, UseGuards, Query, HttpException, HttpStatus } from "@nestjs/common";
import { CreateUserDTO } from "./dto/create-user.dto";
import { UsersService } from "./users.service";
import { UpdateUserDTO } from "./dto/update-user.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { RolesGuard } from "../auth/jwt/jwt-roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from 'src/common/enums/role.enum';

/**
 * Controlador que maneja las peticiones HTTP relacionadas con los usuarios.
 * Requiere autenticación JWT y rol de SUPER_ADMIN para todas las operaciones.
 */
@ApiTags("users")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROPIETARIO)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Crea un nuevo usuario en el sistema.
   * @param createUserDTO - Datos del usuario a crear
   * @returns Usuario creado
   */
  @Post() //http://{ipAdress}:3000/users -> POST
  @ApiOperation({ summary: "Crear un usuario" })
  @ApiResponse({ status: 200, description: "Usuario creado exitosamente" })
  create(@Body() createUserDTO: CreateUserDTO) {
    return this.usersService.create(createUserDTO);
  }

  /**
   * Obtiene todos los usuarios activos del sistema.
   * @returns Lista de usuarios activos
   */
  @Get()
  @ApiOperation({ summary: "Obtener todos los usuarios activos" })
  @ApiResponse({ status: 200, description: "Lista de usuarios obtenida exitosamente" })
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * Busca usuarios por DNI que tengan rol EMPLEADO.
   * @param dni - DNI del usuario a buscar
   * @returns Lista de usuarios con rol EMPLEADO que coinciden con el DNI
   */
  @Get("buscar-por-dni")
  @ApiOperation({ summary: "Buscar usuarios por DNI con rol EMPLEADO" })
  @ApiResponse({ status: 200, description: "Usuarios encontrados exitosamente" })
  @ApiResponse({ status: 400, description: "DNI no proporcionado" })
  buscarPorDni(@Query("dni") dni: string) {
    if (!dni || dni.trim() === "") {
      throw new HttpException("El DNI es requerido", HttpStatus.BAD_REQUEST);
    }
    return this.usersService.buscarPorDni(dni.trim());
  }

  /**
   * Busca un usuario activo por su ID.
   * @param id - ID del usuario a buscar
   * @returns Usuario encontrado
   */
  @Get(":id")
  @ApiOperation({ summary: "Obtener un usuario activo por ID" })
  @ApiResponse({ status: 200, description: "Usuario encontrado exitosamente" })
  @ApiResponse({ status: 404, description: "Usuario no encontrado" })
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * Actualiza los datos de un usuario existente.
   * @param id - ID del usuario a actualizar
   * @param updateUserDTO - Datos actualizados del usuario
   * @returns Usuario actualizado
   */
  @Patch(":id")
  @ApiOperation({ summary: "Actualizar un usuario" })
  @ApiResponse({ status: 200, description: "Usuario actualizado exitosamente" })
  @ApiResponse({ status: 404, description: "Usuario no encontrado" })
  @ApiResponse({ status: 409, description: "Email o DNI ya registrado" })
  update(@Param("id") id: string, @Body() updateUserDTO: UpdateUserDTO) {
    return this.usersService.update(id, updateUserDTO);
  }

  /**
   * Desactiva un usuario del sistema.
   * @param id - ID del usuario a desactivar
   * @returns Mensaje de confirmación
   */
  @Delete(":id")
  @ApiOperation({ summary: "Desactivar un usuario" })
  @ApiResponse({ status: 200, description: "Usuario desactivado exitosamente" })
  @ApiResponse({ status: 404, description: "Usuario no encontrado" })
  @ApiResponse({ status: 400, description: "No se puede desactivar el usuario porque tiene roles asignados en hoteles" })
  deactivate(@Param("id") id: string) {
    return this.usersService.deactivate(id);
  }

  /**
   * Obtiene los detalles completos de un usuario incluyendo sus roles.
   * @param id - ID del usuario
   * @returns Detalles del usuario
   */
  @Get("details/:id")
  @ApiOperation({ summary: "Obtener detalles de un usuario" })
  @ApiResponse({ status: 200, description: "Detalles obtenidos exitosamente" })
  getUserDetails(@Param("id") id: string) {
    return this.usersService.getUserDetails(id);
  }
}
