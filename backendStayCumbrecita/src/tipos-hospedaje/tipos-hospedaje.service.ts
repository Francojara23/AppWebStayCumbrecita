import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoHospedaje } from './entidades/tipo-hospedaje.entity';
import { CreateTipoHospedajeDto } from './dto/create-tipo-hospedaje.dto';
import { UpdateTipoHospedajeDto } from './dto/update-tipo-hospedaje.dto';

/**
 * Servicio que maneja la lógica de negocio relacionada con los tipos de hospedaje
 * Incluye operaciones CRUD y gestión del catálogo de tipos de hospedaje
 */
@Injectable()
export class TiposHospedajeService {
  constructor(
    @InjectRepository(TipoHospedaje)
    private readonly tipoHospedajeRepository: Repository<TipoHospedaje>,
  ) {}

  /**
   * Crea un nuevo tipo de hospedaje
   * @param createTipoHospedajeDto Datos del tipo de hospedaje a crear
   * @returns Tipo de hospedaje creado
   */
  async create(createTipoHospedajeDto: CreateTipoHospedajeDto): Promise<TipoHospedaje> {
    const tipoHospedaje = this.tipoHospedajeRepository.create(createTipoHospedajeDto);
    return await this.tipoHospedajeRepository.save(tipoHospedaje);
  }

  /**
   * Obtiene todos los tipos de hospedaje
   * @returns Lista de tipos de hospedaje
   */
  async findAll(): Promise<TipoHospedaje[]> {
    return await this.tipoHospedajeRepository.find();
  }

  /**
   * Busca un tipo de hospedaje por su ID
   * @param id ID del tipo de hospedaje
   * @returns Tipo de hospedaje encontrado
   * @throws NotFoundException si el tipo de hospedaje no existe
   */
  async findOne(id: string): Promise<TipoHospedaje> {
    const tipoHospedaje = await this.tipoHospedajeRepository.findOne({ where: { id } });
    if (!tipoHospedaje) {
      throw new NotFoundException(`Tipo de hospedaje con ID ${id} no encontrado`);
    }
    return tipoHospedaje;
  }

  /**
   * Actualiza un tipo de hospedaje existente
   * @param id ID del tipo de hospedaje a actualizar
   * @param updateTipoHospedajeDto Datos a actualizar
   * @returns Tipo de hospedaje actualizado
   */
  async update(id: string, updateTipoHospedajeDto: UpdateTipoHospedajeDto): Promise<TipoHospedaje> {
    const tipoHospedaje = await this.findOne(id);
    Object.assign(tipoHospedaje, updateTipoHospedajeDto);
    return await this.tipoHospedajeRepository.save(tipoHospedaje);
  }

  /**
   * Elimina un tipo de hospedaje (soft delete)
   * @param id ID del tipo de hospedaje a eliminar
   */
  async remove(id: string): Promise<void> {
    const tipoHospedaje = await this.findOne(id);
    await this.tipoHospedajeRepository.softRemove(tipoHospedaje);
  }
} 