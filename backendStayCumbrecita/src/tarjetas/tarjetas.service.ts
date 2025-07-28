import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tarjeta, TipoTarjeta } from './entidades/tarjeta.entity';
import { CreateTarjetaDto } from './dto/create-tarjeta.dto';
import { UpdateTarjetaDto } from './dto/update-tarjeta.dto';

/**
 * Servicio interno que maneja la validación de tarjetas
 * Simula una pasarela de pago verificando si las tarjetas existen en la base de datos
 */
@Injectable()
export class TarjetasService {
  constructor(
    @InjectRepository(Tarjeta)
    private tarjetasRepository: Repository<Tarjeta>,
  ) {}

  /**
   * Crea una nueva tarjeta en el sistema
   * Solo accesible para SUPER_ADMIN
   * @param createTarjetaDto Datos de la tarjeta a crear
   * @returns Tarjeta creada
   * @throws ConflictException si la tarjeta ya existe
   */
  async create(createTarjetaDto: CreateTarjetaDto): Promise<Tarjeta> {
    // Verificar si la tarjeta ya existe
    const tarjetaExistente = await this.findByNumero(createTarjetaDto.numero);
    if (tarjetaExistente) {
      throw new ConflictException('Ya existe una tarjeta con este número');
    }

    // Crear la tarjeta
    const tarjeta = this.tarjetasRepository.create(createTarjetaDto);
    return this.tarjetasRepository.save(tarjeta);
  }

  /**
   * Obtiene lista de todas las tarjetas activas
   * Solo accesible para SUPER_ADMIN
   * @returns Lista de tarjetas activas
   */
  async list(): Promise<Tarjeta[]> {
    return this.tarjetasRepository.find({
      where: { active: true },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Busca una tarjeta específica por su ID
   * @param id ID de la tarjeta a buscar
   * @returns Tarjeta encontrada
   * @throws NotFoundException si la tarjeta no existe
   */
  async findOne(id: string): Promise<Tarjeta> {
    const tarjeta = await this.tarjetasRepository.findOne({
      where: { id, active: true }
    });

    if (!tarjeta) {
      throw new NotFoundException('Tarjeta no encontrada');
    }

    return tarjeta;
  }

  /**
   * Actualiza una tarjeta existente
   * Solo accesible para SUPER_ADMIN
   * @param id ID de la tarjeta a actualizar
   * @param updateTarjetaDto Datos a actualizar
   * @returns Tarjeta actualizada
   * @throws NotFoundException si la tarjeta no existe
   */
  async update(id: string, updateTarjetaDto: UpdateTarjetaDto): Promise<Tarjeta> {
    const tarjeta = await this.findOne(id);

    // Actualizar solo los campos proporcionados
    Object.assign(tarjeta, updateTarjetaDto);

    return this.tarjetasRepository.save(tarjeta);
  }

  /**
   * Elimina lógicamente una tarjeta (soft delete)
   * Solo accesible para SUPER_ADMIN
   * @param id ID de la tarjeta a eliminar
   * @throws NotFoundException si la tarjeta no existe
   */
  async softDelete(id: string): Promise<void> {
    const tarjeta = await this.findOne(id);
    
    tarjeta.active = false;
    await this.tarjetasRepository.save(tarjeta);
  }

  /**
   * Verifica si una tarjeta es válida comparando todos sus datos
   * @param criteria Datos de la tarjeta a validar
   * @returns Tarjeta si es válida, null si no lo es
   */
  async findActiveExact(criteria: {
    numero: string;
    titular: string;
    vencimiento: string;
    cve: string;
    tipo: string;
    entidad?: string;
  }): Promise<Tarjeta | null> {
    console.log('🔍 TarjetasService.findActiveExact - Criterios de búsqueda:', criteria);

    const whereCondition: any = {
      numero: criteria.numero,
      titular: criteria.titular,
      vencimiento: criteria.vencimiento,
      cve: criteria.cve,
      tipo: criteria.tipo as TipoTarjeta,
      active: true
    };

    // Agregar entidad si se proporciona
    if (criteria.entidad) {
      whereCondition.entidad = criteria.entidad;
    }

    console.log('🔍 TarjetasService.findActiveExact - Condición WHERE:', whereCondition);

    const result = await this.tarjetasRepository.findOne({
      where: whereCondition
    });

    console.log('🔍 TarjetasService.findActiveExact - Resultado:', result ? 'ENCONTRADA' : 'NO ENCONTRADA');
    
    if (!result) {
      // Buscar tarjetas similares para debug
      const similarCards = await this.tarjetasRepository.find({
        where: { numero: criteria.numero, active: true }
      });
      console.log('🔍 TarjetasService.findActiveExact - Tarjetas con mismo número:', similarCards.map(t => ({
        titular: t.titular,
        numero: t.numero,
        vencimiento: t.vencimiento,
        cve: t.cve,
        tipo: t.tipo,
        entidad: t.entidad
      })));
    }

    return result;
  }

  /**
   * Verifica si una tarjeta existe por su número
   * @param numero Número de la tarjeta a validar
   * @returns Tarjeta si existe, null si no existe
   */
  async findByNumero(numero: string): Promise<Tarjeta | null> {
    return this.tarjetasRepository.findOne({
      where: { numero, active: true }
    });
  }
} 