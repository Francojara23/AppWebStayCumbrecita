import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Opinion } from './entidades/opinion.entity';
import { Reserva } from '../reservas/entidades/reserva.entity';
import { Hospedaje } from '../hospedajes/entidades/hospedaje.entity';
import { Usuario } from '../users/users.entity';
import { EstadoReserva } from '../common/enums/estado-reserva.enum';

export interface CreateOpinionDto {
  hospedajeId: string;
  reservaId: string;
  calificacion?: number;
  comentario?: string;
}

export interface UpdateOpinionDto {
  calificacion?: number;
  comentario?: string;
  visible?: boolean;
}

export interface RespuestaPropietarioDto {
  respuestaPropietario?: string;
}

@Injectable()
export class OpinionesService {
  constructor(
    @InjectRepository(Opinion)
    private opinionRepository: Repository<Opinion>,
    @InjectRepository(Reserva)
    private reservaRepository: Repository<Reserva>,
    @InjectRepository(Hospedaje)
    private hospedajeRepository: Repository<Hospedaje>,
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
  ) {}

  /**
   * Crea una nueva opinión
   * Solo permitido si la reserva está finalizada (CHECK_OUT o CERRADA)
   */
  async crear(createOpinionDto: CreateOpinionDto, usuarioId: string): Promise<Opinion> {
    // Validar que la reserva existe y pertenece al usuario
    const reserva = await this.reservaRepository.findOne({
      where: { 
        id: createOpinionDto.reservaId,
        turista: { id: usuarioId }
      },
      relations: ['hospedaje', 'turista']
    });

    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada o no pertenece al usuario');
    }

    // Validar que la reserva está completada (CHECK_OUT o CERRADA)
    if (reserva.estado !== EstadoReserva.CHECK_OUT && reserva.estado !== EstadoReserva.CERRADA) {
      throw new BadRequestException(
        'Solo puedes opinar sobre reservas que hayan sido completadas (check-out realizado)'
      );
    }

    // Verificar que el hospedaje coincida
    if (reserva.hospedaje.id !== createOpinionDto.hospedajeId) {
      throw new BadRequestException('El hospedaje no coincide con la reserva');
    }

    // Verificar que no existe ya una opinión para esta reserva
    const opinionExistente = await this.opinionRepository.findOne({
      where: { reserva: { id: createOpinionDto.reservaId } }
    });

    if (opinionExistente) {
      throw new BadRequestException('Ya existe una opinión para esta reserva');
    }

    // Validar que al menos se proporcione calificación o comentario
    if (!createOpinionDto.calificacion && !createOpinionDto.comentario) {
      throw new BadRequestException('Debe proporcionar al menos una calificación o un comentario');
    }

    // Buscar usuario y hospedaje
    const usuario = await this.usuarioRepository.findOne({ where: { id: usuarioId } });
    const hospedaje = await this.hospedajeRepository.findOne({ where: { id: createOpinionDto.hospedajeId } });

    // Crear la opinión
    const opinion = this.opinionRepository.create({
      hospedaje: { id: createOpinionDto.hospedajeId },
      usuario: { id: usuarioId },
      reserva: { id: createOpinionDto.reservaId },
      calificacion: createOpinionDto.calificacion || null,
      comentario: createOpinionDto.comentario || null,
      fechaOpinion: new Date(),
      visible: true
    });

    return this.opinionRepository.save(opinion);
  }

  /**
   * Obtiene todas las opiniones de un hospedaje (solo las visibles)
   */
  async findByHospedaje(hospedajeId: string, incluirOcultas = false): Promise<Opinion[]> {
    const where: any = { hospedaje: { id: hospedajeId } };
    
    if (!incluirOcultas) {
      where.visible = true;
    }

    return this.opinionRepository.find({
      where,
      relations: ['usuario', 'reserva'],
      order: { fechaOpinion: 'DESC' }
    });
  }

  /**
   * Obtiene las opiniones de un usuario
   */
  async findByUsuario(usuarioId: string): Promise<Opinion[]> {
    return this.opinionRepository.find({
      where: { usuario: { id: usuarioId } },
      relations: ['hospedaje', 'reserva'],
      order: { fechaOpinion: 'DESC' }
    });
  }

  /**
   * Obtiene una opinión específica
   */
  async findOne(id: string): Promise<Opinion> {
    const opinion = await this.opinionRepository.findOne({
      where: { id },
      relations: ['hospedaje', 'usuario', 'reserva']
    });

    if (!opinion) {
      throw new NotFoundException('Opinión no encontrada');
    }

    return opinion;
  }

  /**
   * Actualiza una opinión (solo el usuario propietario)
   */
  async actualizar(id: string, updateOpinionDto: UpdateOpinionDto, usuarioId: string): Promise<Opinion> {
    const opinion = await this.findOne(id);

    // Verificar que el usuario es propietario de la opinión
    if (opinion.usuario.id !== usuarioId) {
      throw new ForbiddenException('No tienes permiso para actualizar esta opinión');
    }

    // Actualizar campos
    if (updateOpinionDto.calificacion !== undefined) {
      opinion.calificacion = updateOpinionDto.calificacion;
    }
    if (updateOpinionDto.comentario !== undefined) {
      opinion.comentario = updateOpinionDto.comentario;
    }
    if (updateOpinionDto.visible !== undefined) {
      opinion.visible = updateOpinionDto.visible;
    }

    return this.opinionRepository.save(opinion);
  }

  /**
   * Respuesta del propietario a una opinión
   */
  async responderPropietario(
    id: string, 
    respuestaDto: RespuestaPropietarioDto, 
    usuarioId: string
  ): Promise<Opinion> {
    const opinion = await this.opinionRepository.findOne({
      where: { id },
      relations: ['hospedaje', 'hospedaje.empleados', 'hospedaje.empleados.usuario', 'hospedaje.empleados.rol']
    });

    if (!opinion) {
      throw new NotFoundException('Opinión no encontrada');
    }

    // Verificar que el usuario es propietario del hospedaje o empleado admin
    const esPropietario = opinion.hospedaje.idOwnerHospedaje === usuarioId;
    const esAdminHotel = opinion.hospedaje.empleados?.some(emp => 
      emp.usuario.id === usuarioId && emp.rol.nombre === 'ADMIN_HOTEL'
    );

    if (!esPropietario && !esAdminHotel) {
      throw new ForbiddenException('No tienes permiso para responder esta opinión');
    }

    // Actualizar respuesta
    opinion.respuestaPropietario = respuestaDto.respuestaPropietario || null;
    opinion.fechaRespuesta = new Date();

    return this.opinionRepository.save(opinion);
  }

  /**
   * Elimina una opinión (soft delete)
   */
  async eliminar(id: string, usuarioId: string): Promise<void> {
    const opinion = await this.findOne(id);

    // Verificar que el usuario es propietario de la opinión
    if (opinion.usuario.id !== usuarioId) {
      throw new ForbiddenException('No tienes permiso para eliminar esta opinión');
    }

    await this.opinionRepository.softDelete(id);
  }

  /**
   * Calcula el promedio de calificaciones de un hospedaje
   */
  async calcularPromedioCalificacion(hospedajeId: string): Promise<{ promedio: number; totalOpiniones: number }> {
    const result = await this.opinionRepository
      .createQueryBuilder('opinion')
      .select('AVG(opinion.calificacion)', 'promedio')
      .addSelect('COUNT(opinion.id)', 'total')
      .where('opinion.hospedaje.id = :hospedajeId', { hospedajeId })
      .andWhere('opinion.calificacion IS NOT NULL')
      .andWhere('opinion.visible = true')
      .getRawOne();

    return {
      promedio: parseFloat(result.promedio) || 0,
      totalOpiniones: parseInt(result.total) || 0
    };
  }

  /**
   * Obtiene estadísticas de opiniones de un hospedaje
   */
  async getEstadisticas(hospedajeId: string) {
    const { promedio, totalOpiniones } = await this.calcularPromedioCalificacion(hospedajeId);

    // Distribución por estrellas
    const distribucion = await this.opinionRepository
      .createQueryBuilder('opinion')
      .select('opinion.calificacion', 'estrellas')
      .addSelect('COUNT(opinion.id)', 'cantidad')
      .where('opinion.hospedaje.id = :hospedajeId', { hospedajeId })
      .andWhere('opinion.calificacion IS NOT NULL')
      .andWhere('opinion.visible = true')
      .groupBy('opinion.calificacion')
      .orderBy('opinion.calificacion', 'DESC')
      .getRawMany();

    return {
      promedio,
      totalOpiniones,
      distribucion: distribucion.map(d => ({
        estrellas: parseInt(d.estrellas),
        cantidad: parseInt(d.cantidad)
      }))
    };
  }
}
