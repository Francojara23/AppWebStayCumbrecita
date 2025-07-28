import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Usuario } from "./users.entity";
import { UsuarioRol } from "./usersRoles.entity";
import { Repository } from "typeorm";
import { CreateUserDTO } from "./dto/create-user.dto";
import { UpdateUserDTO } from "./dto/update-user.dto";

/**
 * Servicio que maneja la lógica de negocio relacionada con los usuarios.
 * Incluye operaciones CRUD, gestión de roles y validaciones de seguridad.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usersRepository: Repository<Usuario>,
    @InjectRepository(UsuarioRol)
    private readonly usuarioRolRepository: Repository<UsuarioRol>,
  ) {}

  /**
   * Crea un nuevo usuario en el sistema.
   * @param createUserDTO - Datos del usuario a crear
   * @returns Usuario creado
   */
  async create(createUserDTO: CreateUserDTO) {
    const newUser = this.usersRepository.create(createUserDTO);
    return this.usersRepository.save(newUser);
  }

  /**
   * Obtiene todos los usuarios activos con sus roles globales.
   * @returns Lista de usuarios activos con sus roles
   */
  async findAll(): Promise<any[]> {
    const users = await this.usersRepository.find({
      where: { activo: true },
      relations: ["rolesGlobales", "rolesGlobales.rol"],
    });
    return users.map((user) => ({
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      telefono: user.telefono,
      dni: user.dni,
      direccion: user.direccion,
      fotoUrl: user.fotoUrl,
      estadoConfirmacion: user.estadoConfirmacion,
      activo: user.activo,
      roles: user.rolesGlobales.map((rolGlobal) => ({
        id: rolGlobal.rol.id,
        nombre: rolGlobal.rol.nombre,
      })),
    }));
  }

  /**
   * Actualiza los datos de un usuario existente.
   * Verifica que el email y DNI no estén duplicados.
   * @param id - ID del usuario a actualizar
   * @param updateUserDTO - Datos actualizados del usuario
   * @returns Usuario actualizado
   * @throws HttpException si el usuario no existe o hay conflictos con email/DNI
   */
  async update(id: string, updateUserDTO: UpdateUserDTO) {
    const userFound = await this.usersRepository.findOne({
      where: { id },
      relations: ["rolesGlobales", "rolesGlobales.rol"],
    });

    if (!userFound) {
      throw new HttpException("El usuario no existe", HttpStatus.NOT_FOUND);
    }

    // Si se intenta actualizar el email, verificar que no exista
    if (updateUserDTO.email && updateUserDTO.email !== userFound.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateUserDTO.email }
      });
      if (existingUser) {
        throw new HttpException("El email ya está registrado", HttpStatus.CONFLICT);
      }
    }

    // Si se intenta actualizar el DNI, verificar que no exista
    if (updateUserDTO.dni && updateUserDTO.dni !== userFound.dni) {
      const existingUser = await this.usersRepository.findOne({
        where: { dni: updateUserDTO.dni }
      });
      if (existingUser) {
        throw new HttpException("El DNI ya está registrado", HttpStatus.CONFLICT);
      }
    }

    Object.assign(userFound, updateUserDTO);
    const updatedUser = await this.usersRepository.save(userFound);

    return {
      id: updatedUser.id,
      nombre: updatedUser.nombre,
      apellido: updatedUser.apellido,
      email: updatedUser.email,
      telefono: updatedUser.telefono,
      dni: updatedUser.dni,
      direccion: updatedUser.direccion,
      fotoUrl: updatedUser.fotoUrl,
      estadoConfirmacion: updatedUser.estadoConfirmacion,
      roles: updatedUser.rolesGlobales.map((rolGlobal) => ({
        id: rolGlobal.rol.id,
        nombre: rolGlobal.rol.nombre,
      })),
    };
  }

  /**
   * Elimina lógicamente un usuario del sistema.
   * Verifica que no tenga roles de hotel asignados.
   * @param id - ID del usuario a eliminar
   * @returns Mensaje de confirmación
   * @throws HttpException si el usuario no existe o tiene roles de hotel
   */
  async remove(id: string) {
    const userFound = await this.usersRepository.findOne({
      where: { id },
      relations: ["rolesHotel"],
    });

    if (!userFound) {
      throw new HttpException("El usuario no existe", HttpStatus.NOT_FOUND);
    }

    // Verificar si el usuario tiene roles de hotel
    if (userFound.rolesHotel && userFound.rolesHotel.length > 0) {
      throw new HttpException(
        "No se puede desactivar el usuario porque tiene roles asignados en hoteles",
        HttpStatus.BAD_REQUEST
      );
    }

    // Realizar la baja lógica
    userFound.activo = false;
    await this.usersRepository.save(userFound);

    return {
      message: "Usuario eliminado exitosamente",
      id: id
    };
  }

  /**
   * Obtiene los detalles completos de un usuario incluyendo sus roles.
   * @param id - ID del usuario
   * @returns Detalles del usuario con sus roles
   * @throws HttpException si el usuario no existe
   */
  async getUserDetails(id: string): Promise<any> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ["rolesGlobales", "rolesGlobales.rol"],
    });

    if (!user) {
      throw new HttpException("El usuario no existe", HttpStatus.NOT_FOUND);
    }

    return {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      telefono: user.telefono,
      dni: user.dni,
      direccion: user.direccion,
      fotoUrl: user.fotoUrl,
      estadoConfirmacion: user.estadoConfirmacion,
      roles: user.rolesGlobales.map((rolGlobal) => ({
        id: rolGlobal.rol.id,
        nombre: rolGlobal.rol.nombre,
      })),
    };
  }

  /**
   * Busca un usuario activo por su ID.
   * @param id - ID del usuario a buscar
   * @returns Usuario encontrado con sus roles
   * @throws HttpException si el usuario no existe
   */
  async findOne(id: string): Promise<any> {
    const user = await this.usersRepository.findOne({
      where: { id, activo: true },
      relations: ["rolesGlobales", "rolesGlobales.rol"],
    });
    if (!user) {
      throw new HttpException("El usuario no existe", HttpStatus.NOT_FOUND);
    }
    return {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      telefono: user.telefono,
      dni: user.dni,
      direccion: user.direccion,
      fotoUrl: user.fotoUrl,
      estadoConfirmacion: user.estadoConfirmacion,
      activo: user.activo,
      roles: user.rolesGlobales.map((rolGlobal) => ({
        id: rolGlobal.rol.id,
        nombre: rolGlobal.rol.nombre,
      })),
    };
  }

  /**
   * Desactiva un usuario del sistema.
   * Verifica que no tenga roles de hotel asignados.
   * @param id - ID del usuario a desactivar
   * @returns Mensaje de confirmación
   * @throws HttpException si el usuario no existe o tiene roles de hotel
   */
  async deactivate(id: string) {
    const userFound = await this.usersRepository.findOne({
      where: { id },
      relations: ["rolesHotel"],
    });

    if (!userFound) {
      throw new HttpException("El usuario no existe", HttpStatus.NOT_FOUND);
    }

    // Verificar si el usuario tiene roles de hotel
    if (userFound.rolesHotel && userFound.rolesHotel.length > 0) {
      throw new HttpException(
        "No se puede desactivar el usuario porque tiene roles asignados en hoteles",
        HttpStatus.BAD_REQUEST
      );
    }

    // Realizar la baja lógica
    userFound.activo = false;
    await this.usersRepository.save(userFound);

    return {
      message: "Usuario desactivado exitosamente",
      id: id
    };
  }

  /**
   * Busca usuarios por DNI que tengan rol EMPLEADO.
   * @param dni - DNI del usuario a buscar
   * @returns Lista de usuarios con rol EMPLEADO que coinciden con el DNI
   */
  async buscarPorDni(dni: string): Promise<any[]> {
    // Primero buscar usuarios que coincidan con el DNI
    const users = await this.usersRepository.find({
      where: { 
        dni: parseInt(dni),
        activo: true 
      },
      relations: ["rolesGlobales", "rolesGlobales.rol"],
    });

    // Filtrar solo los que tienen rol EMPLEADO
    const empleados = users.filter(user => 
      user.rolesGlobales.some(rolGlobal => rolGlobal.rol.nombre === "EMPLEADO")
    );

    return empleados.map((user) => ({
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      telefono: user.telefono,
      dni: user.dni,
      direccion: user.direccion,
      fotoUrl: user.fotoUrl,
      estadoConfirmacion: user.estadoConfirmacion,
      activo: user.activo,
      roles: user.rolesGlobales.map((rolGlobal) => ({
        id: rolGlobal.rol.id,
        nombre: rolGlobal.rol.nombre,
      })),
    }));
  }
}
