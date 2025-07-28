import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateRoleDTO } from "./dto/create-role.dto";
import { Rol } from "./roles.entity";
import { UpdateRoleDTO } from "./dto/update-role.dto";

/**
 * Servicio que maneja la lógica de negocio relacionada con los roles del sistema
 * Incluye operaciones CRUD y validaciones de permisos
 */
@Injectable()
export class RolesService {
  // Inyección de dependencias del repositorio de roles
  constructor(
    @InjectRepository(Rol) private rolesRepository: Repository<Rol>,
  ) {}

  /**
   * Obtiene todos los roles activos del sistema
   * @returns Lista de roles con sus permisos asociados
   */
  async findAll(): Promise<Rol[]> {
    return this.rolesRepository.find({
      where: { activo: true },
      relations: ['permisos', 'permisos.permiso'],
    });
  }

  /**
   * Busca un rol específico por su ID
   * @param id ID del rol a buscar
   * @returns Rol encontrado con sus permisos
   * @throws HttpException si el rol no existe
   */
  async findOne(id: string): Promise<Rol> {
    const role = await this.rolesRepository.findOne({
      where: { id, activo: true },
      relations: ['permisos', 'permisos.permiso'],
    });
    
    if (!role) {
      throw new HttpException('Rol no encontrado', HttpStatus.NOT_FOUND);
    }
    
    return role;
  }

  /**
   * Crea un nuevo rol en el sistema
   * @param createRoleDTO Datos del rol a crear
   * @returns Rol creado
   * @throws HttpException si ya existe un rol con el mismo nombre
   */
  async create(createRoleDTO: CreateRoleDTO): Promise<Rol> {
    // Verificar si ya existe un rol con el mismo nombre
    const existingRole = await this.rolesRepository.findOne({
      where: { nombre: createRoleDTO.nombre }
    });

    if (existingRole) {
      throw new HttpException(
        'Ya existe un rol con ese nombre',
        HttpStatus.CONFLICT
      );
    }

    const newRole = this.rolesRepository.create(createRoleDTO);
    return this.rolesRepository.save(newRole);
  }

  /**
   * Actualiza un rol existente
   * @param id ID del rol a actualizar
   * @param updateRoleDTO Datos a actualizar
   * @returns Rol actualizado
   * @throws HttpException si el rol no existe o si el nuevo nombre ya está en uso
   */
  async update(id: string, updateRoleDTO: UpdateRoleDTO): Promise<Rol> {
    const role = await this.rolesRepository.findOne({
      where: { id, activo: true }
    });

    if (!role) {
      throw new HttpException('Rol no encontrado', HttpStatus.NOT_FOUND);
    }

    // Si se intenta cambiar el nombre, verificar que no exista
    if (updateRoleDTO.nombre && updateRoleDTO.nombre !== role.nombre) {
      const existingRole = await this.rolesRepository.findOne({
        where: { nombre: updateRoleDTO.nombre }
      });

      if (existingRole) {
        throw new HttpException(
          'Ya existe un rol con ese nombre',
          HttpStatus.CONFLICT
        );
      }
    }

    Object.assign(role, updateRoleDTO);
    return this.rolesRepository.save(role);
  }

  /**
   * Desactiva un rol (soft delete)
   * @param id ID del rol a desactivar
   * @returns Mensaje de confirmación
   * @throws HttpException si el rol no existe o está en uso
   */
  async remove(id: string) {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: ['usuarios', 'empleados']
    });

    if (!role) {
      throw new HttpException('Rol no encontrado', HttpStatus.NOT_FOUND);
    }

    // Verificar si el rol está en uso
    if (role.usuarios && role.usuarios.length > 0) {
      throw new HttpException(
        'No se puede desactivar el rol porque está asignado a usuarios',
        HttpStatus.BAD_REQUEST
      );
    }

    if (role.empleados && role.empleados.length > 0) {
      throw new HttpException(
        'No se puede desactivar el rol porque está asignado a empleados',
        HttpStatus.BAD_REQUEST
      );
    }

    // Realizar la baja lógica
    role.activo = false;
    await this.rolesRepository.save(role);

    return {
      message: "Rol eliminado exitosamente",
      id: id
    };
  }
}
