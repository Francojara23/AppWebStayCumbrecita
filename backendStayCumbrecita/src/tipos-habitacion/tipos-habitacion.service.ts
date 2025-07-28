import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoHabitacionEntity } from '../habitaciones/entidades/tipo-habitacion.entity';
import { CreateTipoHabitacionDto } from './dto/create-tipo-habitacion.dto';
import { UpdateTipoHabitacionDto } from './dto/update-tipo-habitacion.dto';

/**
 * Servicio que maneja la lógica de negocio relacionada con los tipos de habitación
 * Incluye operaciones CRUD y gestión del catálogo de tipos de habitación
 */
@Injectable()
export class TiposHabitacionService {
  constructor(
    @InjectRepository(TipoHabitacionEntity)
    private tiposHabitacionRepository: Repository<TipoHabitacionEntity>,
  ) {}

  /**
   * Crea un nuevo tipo de habitación
   * @param createTipoHabitacionDto Datos del tipo de habitación a crear
   * @returns Tipo de habitación creado
   */
  async create(createTipoHabitacionDto: CreateTipoHabitacionDto): Promise<TipoHabitacionEntity> {
    const tipoHabitacion = this.tiposHabitacionRepository.create(createTipoHabitacionDto);
    return this.tiposHabitacionRepository.save(tipoHabitacion);
  }

  /**
   * Obtiene todos los tipos de habitación
   * @returns Lista de tipos de habitación
   */
  async findAll(): Promise<TipoHabitacionEntity[]> {
    return this.tiposHabitacionRepository.find();
  }

  /**
   * Busca un tipo de habitación por su ID
   * @param id ID del tipo de habitación
   * @returns Tipo de habitación encontrado con sus habitaciones relacionadas
   * @throws NotFoundException si el tipo de habitación no existe
   */
  async findOne(id: string): Promise<TipoHabitacionEntity> {
    const tipoHabitacion = await this.tiposHabitacionRepository.findOne({
      where: { id },
      relations: ['habitaciones'],
    });

    if (!tipoHabitacion) {
      throw new NotFoundException('Tipo de habitación no encontrado');
    }

    return tipoHabitacion;
  }

  /**
   * Actualiza un tipo de habitación existente
   * @param id ID del tipo de habitación a actualizar
   * @param updateTipoHabitacionDto Datos a actualizar
   * @returns Tipo de habitación actualizado
   */
  async update(id: string, updateTipoHabitacionDto: UpdateTipoHabitacionDto): Promise<TipoHabitacionEntity> {
    const tipoHabitacion = await this.findOne(id);
    Object.assign(tipoHabitacion, updateTipoHabitacionDto);
    return this.tiposHabitacionRepository.save(tipoHabitacion);
  }

  /**
   * Elimina un tipo de habitación (soft delete)
   * @param id ID del tipo de habitación a eliminar
   */
  async remove(id: string): Promise<void> {
    const tipoHabitacion = await this.findOne(id);
    await this.tiposHabitacionRepository.softDelete(id);
  }
} 