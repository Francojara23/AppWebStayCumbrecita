import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Permiso } from "./entidades/permiso.entity";
import { CreatePermisoDTO } from "./dto/create-permiso.dto";

/**
 * Servicio que maneja la lógica de negocio relacionada con los permisos
 * Incluye operaciones CRUD y gestión de permisos del sistema
 */
@Injectable()
export class PermisosService {
  constructor(
    @InjectRepository(Permiso)
    private permisosRepository: Repository<Permiso>,
  ) {}

  /**
   * Obtiene todos los permisos activos del sistema
   * @returns Lista de permisos con sus roles asociados
   */
  async findAll(): Promise<Permiso[]> {
    return this.permisosRepository.find({
      where: { activo: true },
      relations: ['roles', 'roles.rol'],
    });
  }

  /**
   * Crea un nuevo permiso en el sistema
   * @param createPermisoDTO Datos del permiso a crear
   * @returns Permiso creado
   * @throws HttpException si ya existe un permiso con el mismo nombre
   */
  async create(createPermisoDTO: CreatePermisoDTO): Promise<Permiso> {
    // Verificar si ya existe un permiso con el mismo nombre
    const existingPermiso = await this.permisosRepository.findOne({
      where: { nombre: createPermisoDTO.nombre }
    });

    if (existingPermiso) {
      throw new HttpException(
        'Ya existe un permiso con ese nombre',
        HttpStatus.CONFLICT
      );
    }

    const newPermiso = this.permisosRepository.create(createPermisoDTO);
    return this.permisosRepository.save(newPermiso);
  }
} 