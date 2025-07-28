import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Empleado } from './entidades/empleado.entity';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';
import { Usuario } from '../users/users.entity';
import { Hospedaje } from '../hospedajes/entidades/hospedaje.entity';
import { Rol } from '../roles/roles.entity';

@Injectable()
export class EmpleadosService {
  constructor(
    @InjectRepository(Empleado)
    private empleadosRepository: Repository<Empleado>,
    @InjectRepository(Usuario)
    private usuariosRepository: Repository<Usuario>,
    @InjectRepository(Hospedaje)
    private hospedajesRepository: Repository<Hospedaje>,
    @InjectRepository(Rol)
    private rolesRepository: Repository<Rol>,
  ) {}

  async create(hotelId: string, createEmpleadoDto: CreateEmpleadoDto) {
    // Verificar que el hotel existe
    const hotel = await this.hospedajesRepository.findOneBy({ id: hotelId });
    if (!hotel) throw new NotFoundException('Hotel no encontrado');

    // Verificar que el usuario existe y tiene rol EMPLEADO
    const usuario = await this.usuariosRepository.findOne({
      where: { id: createEmpleadoDto.usuarioId },
      relations: ['rolesGlobales', 'rolesGlobales.rol'],
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const tieneRolEmpleado = usuario.rolesGlobales.some(
      ur => ur.rol.nombre === 'EMPLEADO'
    );
    if (!tieneRolEmpleado) {
      throw new Error('El usuario debe tener rol EMPLEADO');
    }

    // Verificar que el rol existe
    const rol = await this.rolesRepository.findOneBy({ id: createEmpleadoDto.rolId });
    if (!rol) throw new NotFoundException('Rol no encontrado');

    // Crear el empleado
    const empleado = this.empleadosRepository.create({
      usuario,
      hospedaje: hotel,
      rol,
    });

    return this.empleadosRepository.save(empleado);
  }

  async findAll(hotelId: string, rol?: string, search?: string) {
    const query = this.empleadosRepository
      .createQueryBuilder('empleado')
      .leftJoinAndSelect('empleado.usuario', 'usuario')
      .leftJoinAndSelect('empleado.rol', 'rol')
      .where('empleado.hospedaje.id = :hotelId', { hotelId });

    if (rol) {
      query.andWhere('rol.nombre = :rol', { rol });
    }

    if (search) {
      query.andWhere(
        '(usuario.nombre ILIKE :search OR usuario.apellido ILIKE :search OR usuario.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    return query.getMany();
  }

  async update(hotelId: string, empleadoId: string, updateEmpleadoDto: UpdateEmpleadoDto) {
    const empleado = await this.empleadosRepository.findOne({
      where: { id: empleadoId, hospedaje: { id: hotelId } },
      relations: ['rol'],
    });

    if (!empleado) throw new NotFoundException('Empleado no encontrado');

    if (updateEmpleadoDto.rolId) {
      const rol = await this.rolesRepository.findOneBy({ id: updateEmpleadoDto.rolId });
      if (!rol) throw new NotFoundException('Rol no encontrado');
      empleado.rol = rol;
    }

    return this.empleadosRepository.save(empleado);
  }

  async remove(hotelId: string, empleadoId: string) {
    const empleado = await this.empleadosRepository.findOne({
      where: { id: empleadoId, hospedaje: { id: hotelId } },
    });

    if (!empleado) throw new NotFoundException('Empleado no encontrado');

    await this.empleadosRepository.remove(empleado);
    return { message: 'Empleado eliminado exitosamente' };
  }

  /**
   * Elimina un empleado por su ID (método simplificado)
   * @param empleadoId ID del empleado a eliminar
   * @returns Mensaje de confirmación
   */
  async removeById(empleadoId: string) {
    const empleado = await this.empleadosRepository.findOne({
      where: { id: empleadoId },
      relations: ['hospedaje'],
    });

    if (!empleado) throw new NotFoundException('Empleado no encontrado');

    await this.empleadosRepository.remove(empleado);
    return { message: 'Empleado eliminado exitosamente' };
  }

  async findHotelesByUsuario(usuarioId: string) {
    return this.empleadosRepository.find({
      where: { usuario: { id: usuarioId } },
      relations: ['hospedaje', 'rol'],
    });
  }

  /**
   * Busca un empleado específico por hospedaje y usuario
   * @param hospedajeId ID del hospedaje
   * @param usuarioId ID del usuario
   * @returns Empleado encontrado o null
   */
  async findByHospedajeAndUser(hospedajeId: string, usuarioId: string): Promise<Empleado | null> {
    return this.empleadosRepository.findOne({
      where: {
        hospedaje: { id: hospedajeId },
        usuario: { id: usuarioId }
      },
      relations: ['usuario', 'hospedaje', 'rol'],
    });
  }

  /**
   * Verifica si un usuario tiene permisos para gestionar un hospedaje específico
   * @param hospedajeId ID del hospedaje
   * @param usuarioId ID del usuario
   * @param userRole Rol global del usuario
   * @returns true si tiene permisos, false en caso contrario
   */
  async verificarPermisosHospedaje(hospedajeId: string, usuarioId: string, userRole?: string): Promise<boolean> {
    console.log('🔐 Verificando permisos hospedaje:', {
      hospedajeId,
      usuarioId,
      userRole
    });

    // Super admins siempre tienen acceso
    if (userRole === 'SUPER_ADMIN') {
      console.log('✅ Usuario es SUPER_ADMIN, permisos concedidos');
      return true;
    }

    // Verificar si es el propietario del hospedaje
    const hospedaje = await this.hospedajesRepository.findOne({
      where: { id: hospedajeId }
    });

    console.log('🏨 Hospedaje encontrado:', {
      id: hospedaje?.id,
      nombre: hospedaje?.nombre,
      idOwnerHospedaje: hospedaje?.idOwnerHospedaje,
      esOwner: hospedaje?.idOwnerHospedaje === usuarioId
    });

    if (hospedaje && hospedaje.idOwnerHospedaje === usuarioId) {
      console.log('✅ Usuario es propietario del hospedaje, permisos concedidos');
      return true;
    }

    // Verificar si es empleado con rol válido en este hospedaje
    const empleado = await this.findByHospedajeAndUser(hospedajeId, usuarioId);
    console.log('👤 Empleado encontrado:', {
      existe: !!empleado,
      rol: empleado?.rol?.nombre,
      rolesValidos: ['ADMIN', 'ADMIN_HOTEL', 'RECEPCIONISTA', 'CONSERJE']
    });

    if (empleado && ['ADMIN', 'ADMIN_HOTEL', 'RECEPCIONISTA', 'CONSERJE'].includes(empleado.rol.nombre)) {
      console.log('✅ Usuario es empleado con rol válido, permisos concedidos');
      return true;
    }

    console.log('❌ Usuario no tiene permisos para este hospedaje');
    return false;
  }

  /**
   * Obtiene empleados de un hospedaje con validación de permisos granular
   * @param hospedajeId ID del hospedaje
   * @param usuarioId ID del usuario que hace la consulta
   * @param userRole Rol global del usuario
   * @param rol Filtro opcional por rol
   * @param search Filtro opcional de búsqueda
   * @returns Lista de empleados del hospedaje
   */
  async findAllWithPermissions(
    hospedajeId: string, 
    usuarioId: string, 
    userRole: string, 
    rol?: string, 
    search?: string
  ) {
    // Verificar permisos antes de devolver datos
    const tienePermisos = await this.verificarPermisosHospedaje(hospedajeId, usuarioId, userRole);
    
    if (!tienePermisos) {
      throw new Error('No tienes permisos para ver empleados de este hospedaje');
    }

    // Si tiene permisos, usar el método existente
    return this.findAll(hospedajeId, rol, search);
  }
}
