import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServicioCatalogo, TipoServicio } from './entidades/servicio-catalogo.entity';
import { HospedajeServicio } from './entidades/hospedaje-servicio.entity';
import { HabitacionServicio } from './entidades/habitacion-servicio.entity';
import { CreateServicioCatalogoDto } from './dto/create-servicio-catalogo.dto';
import { UpdateServicioCatalogoDto } from './dto/update-servicio-catalogo.dto';
import { AsignarServicioDto } from './dto/asignar-servicio.dto';

/**
 * Servicio que maneja la lógica de negocio relacionada con los servicios
 * Incluye gestión del catálogo de servicios y asignación a hospedajes/habitaciones
 */
@Injectable()
export class ServiciosService {
  constructor(
    @InjectRepository(ServicioCatalogo)
    private servicioCatalogoRepository: Repository<ServicioCatalogo>,
    @InjectRepository(HospedajeServicio)
    private hospedajeServicioRepository: Repository<HospedajeServicio>,
    @InjectRepository(HabitacionServicio)
    private habitacionServicioRepository: Repository<HabitacionServicio>,
  ) {}

  /**
   * Crea un nuevo servicio en el catálogo
   * @param createDto Datos del servicio a crear
   * @returns Servicio creado
   */
  async createServicioCatalogo(createDto: CreateServicioCatalogoDto): Promise<ServicioCatalogo> {
    const servicio = this.servicioCatalogoRepository.create(createDto);
    return this.servicioCatalogoRepository.save(servicio);
  }

  /**
   * Obtiene todos los servicios del catálogo
   * @returns Lista de servicios disponibles
   */
  async findAllServiciosCatalogo(): Promise<ServicioCatalogo[]> {
    return this.servicioCatalogoRepository.find();
  }

  /**
   * Busca servicios del catálogo por tipo
   * @param tipo Tipo de servicio a filtrar
   * @returns Lista de servicios del tipo especificado
   */
  async findServiciosCatalogoByTipo(tipo: TipoServicio): Promise<ServicioCatalogo[]> {
    return this.servicioCatalogoRepository.find({ where: { tipo } });
  }

  /**
   * Busca un servicio específico del catálogo por ID
   * @param id ID del servicio a buscar
   * @returns Servicio encontrado
   * @throws NotFoundException si el servicio no existe
   */
  async findOneServicioCatalogo(id: string): Promise<ServicioCatalogo> {
    const servicio = await this.servicioCatalogoRepository.findOne({ where: { id } });
    if (!servicio) {
      throw new NotFoundException('Servicio no encontrado');
    }
    return servicio;
  }

  /**
   * Actualiza un servicio del catálogo
   * @param id ID del servicio a actualizar
   * @param updateDto Datos a actualizar
   * @returns Servicio actualizado
   */
  async updateServicioCatalogo(id: string, updateDto: UpdateServicioCatalogoDto): Promise<ServicioCatalogo> {
    const servicio = await this.findOneServicioCatalogo(id);
    Object.assign(servicio, updateDto);
    return this.servicioCatalogoRepository.save(servicio);
  }

  /**
   * Elimina un servicio del catálogo
   * @param id ID del servicio a eliminar
   * @returns Mensaje de confirmación
   */
  async removeServicioCatalogo(id: string) {
    const servicio = await this.findOneServicioCatalogo(id);
    await this.servicioCatalogoRepository.remove(servicio);
    return { message: 'Servicio eliminado exitosamente' };
  }

  /**
   * Asigna un servicio a un hospedaje
   * @param hospedajeId ID del hospedaje
   * @param asignarDto Datos de la asignación
   * @returns Servicio asignado
   */
  async asignarServicioHospedaje(hospedajeId: string, asignarDto: AsignarServicioDto): Promise<HospedajeServicio> {
    const servicio = await this.findOneServicioCatalogo(asignarDto.servicioId);
    
    const hospedajeServicio = this.hospedajeServicioRepository.create({
      hospedaje: { id: hospedajeId } as any,
      servicio: servicio as any,
      precioExtra: asignarDto.precioExtra,
      observaciones: asignarDto.observaciones
    });

    return this.hospedajeServicioRepository.save(hospedajeServicio);
  }

  /**
   * Obtiene los servicios asignados a un hospedaje
   * @param hospedajeId ID del hospedaje
   * @returns Lista de servicios asignados
   */
  async findServiciosByHospedaje(hospedajeId: string): Promise<HospedajeServicio[]> {
    return this.hospedajeServicioRepository.find({
      where: { hospedaje: { id: hospedajeId } },
      relations: ['servicio']
    });
  }

  /**
   * Elimina un servicio asignado a un hospedaje
   * @param hospedajeId ID del hospedaje
   * @param servicioId ID del servicio
   * @returns Mensaje de confirmación
   */
  async removeServicioHospedaje(hospedajeId: string, servicioId: string) {
    const hospedajeServicio = await this.hospedajeServicioRepository.findOne({
      where: {
        hospedaje: { id: hospedajeId },
        servicio: { id: servicioId }
      }
    });

    if (!hospedajeServicio) {
      throw new NotFoundException('Servicio no encontrado en el hospedaje');
    }

    await this.hospedajeServicioRepository.remove(hospedajeServicio);
    return { message: 'Servicio eliminado del hospedaje exitosamente' };
  }

  /**
   * Asigna un servicio a una habitación
   * @param habitacionId ID de la habitación
   * @param asignarDto Datos de la asignación
   * @returns Servicio asignado
   */
  async asignarServicioHabitacion(habitacionId: string, asignarDto: AsignarServicioDto): Promise<HabitacionServicio> {
    const servicio = await this.findOneServicioCatalogo(asignarDto.servicioId);
    
    const habitacionServicio = this.habitacionServicioRepository.create({
      habitacion: { id: habitacionId } as any,
      servicio: servicio as any,
      precioExtra: asignarDto.precioExtra,
      observaciones: asignarDto.observaciones,
      incrementoCapacidad: asignarDto.incrementoCapacidad || 0
    });

    return this.habitacionServicioRepository.save(habitacionServicio);
  }

  /**
   * Obtiene los servicios asignados a una habitación
   * @param habitacionId ID de la habitación
   * @returns Lista de servicios asignados
   */
  async findServiciosByHabitacion(habitacionId: string): Promise<HabitacionServicio[]> {
    return this.habitacionServicioRepository.find({
      where: { habitacion: { id: habitacionId } },
      relations: ['servicio']
    });
  }

  /**
   * Elimina un servicio asignado a una habitación
   * @param habitacionId ID de la habitación
   * @param servicioId ID del servicio
   * @returns Mensaje de confirmación
   */
  async removeServicioHabitacion(habitacionId: string, servicioId: string) {
    const habitacionServicio = await this.habitacionServicioRepository.findOne({
      where: {
        habitacion: { id: habitacionId },
        servicio: { id: servicioId }
      }
    });

    if (!habitacionServicio) {
      throw new NotFoundException('Servicio no encontrado en la habitación');
    }

    await this.habitacionServicioRepository.remove(habitacionServicio);
    return { message: 'Servicio eliminado de la habitación exitosamente' };
  }

  /**
   * Busca servicios asignados a una habitación por término de búsqueda
   * @param habitacionId ID de la habitación
   * @param termino Término a buscar en nombre o descripción del servicio
   * @returns Lista de servicios que coinciden con el término
   */
  async buscarServiciosByHabitacion(habitacionId: string, termino: string): Promise<HabitacionServicio[]> {
    return this.habitacionServicioRepository
      .createQueryBuilder('hs')
      .select([
        'hs.id',
        'hs.active',
        'hs.precioExtra',
        'hs.observaciones',
        'hs.incrementoCapacidad'
      ])
      .leftJoin('hs.servicio', 'servicio')
      .addSelect([
        'servicio.id',
        'servicio.active',
        'servicio.createdAt',
        'servicio.updatedAt',
        'servicio.deletedAt',
        'servicio.nombre',
        'servicio.descripcion',
        'servicio.iconoUrl',
        'servicio.tipo'
      ])
      .leftJoin('hs.habitacion', 'habitacion')
      .addSelect([
        'habitacion.id',
        'habitacion.active',
        'habitacion.nombre'
      ])
      .where('hs.habitacion_id = :habitacionId', { habitacionId })
      .andWhere('(LOWER(servicio.nombre) LIKE LOWER(:termino) OR LOWER(servicio.descripcion) LIKE LOWER(:termino))', 
        { termino: `%${termino}%` })
      .getMany();
  }

  /**
   * Busca servicios asignados a un hospedaje por término de búsqueda
   * @param hospedajeId ID del hospedaje
   * @param termino Término a buscar en nombre o descripción del servicio
   * @returns Lista de servicios que coinciden con el término
   */
  async buscarServiciosByHospedaje(hospedajeId: string, termino: string): Promise<HospedajeServicio[]> {
    return this.hospedajeServicioRepository
      .createQueryBuilder('hs')
      .select([
        'hs.id',
        'hs.active',
        'hs.precioExtra',
        'hs.observaciones'
      ])
      .leftJoin('hs.servicio', 'servicio')
      .addSelect([
        'servicio.id',
        'servicio.active',
        'servicio.createdAt',
        'servicio.updatedAt',
        'servicio.deletedAt',
        'servicio.nombre',
        'servicio.descripcion',
        'servicio.iconoUrl',
        'servicio.tipo'
      ])
      .leftJoin('hs.hospedaje', 'hospedaje')
      .addSelect([
        'hospedaje.id',
        'hospedaje.active',
        'hospedaje.nombre'
      ])
      .where('hs.hospedaje_id = :hospedajeId', { hospedajeId })
      .andWhere('(LOWER(servicio.nombre) LIKE LOWER(:termino) OR LOWER(servicio.descripcion) LIKE LOWER(:termino))', 
        { termino: `%${termino}%` })
      .getMany();
  }
}
