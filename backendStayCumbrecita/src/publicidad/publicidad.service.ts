import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { Publicidad, EstadoPublicidad } from './entidades/publicidad.entity';
import { Hospedaje } from '../hospedajes/entidades/hospedaje.entity';
import { Tarjeta } from '../tarjetas/entidades/tarjeta.entity';
import { Usuario } from '../users/users.entity';
import { Pago, MetodoPago, EstadoPago } from '../pagos/entidades/pago.entity';
import { PagosService } from '../pagos/pagos.service';
import { HospedajesService } from '../hospedajes/hospedajes.service';
import { EmpleadosService } from '../empleados/empleados.service';
import { MailService } from '../mail/mail.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { CreatePagoPublicidadDto } from '../pagos/dto/create-pago-publicidad.dto';

export interface CreatePublicidadDto {
  hospedajeId: string;
  monto: number;
  fechaInicio: Date;
  fechaFin: Date;
  tarjeta: {
    numero: string;
    titular: string;
    vencimiento: string;
    cve: string;
    tipo: 'CREDITO' | 'DEBITO';
    entidad: string;
  };
  renovacionAutomatica?: boolean;
}

export interface UpdatePublicidadDto {
  renovacionAutomatica?: boolean;
}

export interface CancelarPublicidadDto {
  motivoCancelacion?: string;
}

@Injectable()
export class PublicidadService {
  constructor(
    @InjectRepository(Publicidad)
    private publicidadRepository: Repository<Publicidad>,
    @InjectRepository(Pago)
    private pagosRepository: Repository<Pago>,
    private pagosService: PagosService,
    @Inject(forwardRef(() => HospedajesService))
    private hospedajesService: HospedajesService,
    private empleadosService: EmpleadosService,
    private mailService: MailService,
    private notificacionesService: NotificacionesService,
  ) {}

  /**
   * Crea una nueva publicidad con pago inmediato (igual que el checkout)
   */
  async crear(createDto: CreatePublicidadDto, usuarioId: string): Promise<Publicidad> {
    // Verificar permisos granulares
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(
      createDto.hospedajeId,
      usuarioId
    );

    if (!tienePermisos) {
      throw new ForbiddenException(
        `No tienes permisos para gestionar publicidad del hospedaje ${createDto.hospedajeId}`
      );
    }

    // Validar datos de tarjeta
    if (!createDto.tarjeta) {
      throw new BadRequestException('Se requieren los datos de la tarjeta');
    }

    // Validar tipo de tarjeta (solo crédito/débito)
    if (createDto.tarjeta.tipo !== 'CREDITO' && createDto.tarjeta.tipo !== 'DEBITO') {
      throw new BadRequestException('Solo se aceptan tarjetas de crédito o débito para publicidad');
    }

    // Usar las fechas proporcionadas
    const fechaInicio = createDto.fechaInicio;
    const fechaFin = createDto.fechaFin;

    // Crear el pago usando el método específico para publicidad
    const pagoData = {
      metodo: MetodoPago.TARJETA,
      monto: createDto.monto,
      tarjeta: createDto.tarjeta
    };

    console.log('💳 Datos de tarjeta recibidos para publicidad:', createDto.tarjeta);
    console.log('💰 Datos de pago específico para publicidad:', pagoData);

    const pago = await this.pagosService.createPagoPublicidad(pagoData, usuarioId);

    console.log('💰 PublicidadService - Pago creado:', {
      id: pago.id,
      estado: pago.estado,
      montoTotal: pago.montoTotal
    });

    // Si el pago falló, no crear la publicidad
    if (pago.estado !== EstadoPago.APROBADO) {
      console.log('❌ PublicidadService - Pago NO aprobado, estado actual:', pago.estado);
      throw new BadRequestException('El pago de la publicidad fue rechazado');
    }

    console.log('✅ PublicidadService - Pago APROBADO, continuando con creación de publicidad');

    // Crear la publicidad
    const publicidad = this.publicidadRepository.create({
      hospedaje: { id: createDto.hospedajeId },
      usuario: { id: usuarioId },
      monto: createDto.monto,
      fechaInicio,
      fechaFin,
      estado: EstadoPublicidad.ACTIVA,
      renovacionAutomatica: createDto.renovacionAutomatica || false,
    });

    const publicidadGuardada = await this.publicidadRepository.save(publicidad);

    // Asociar el pago con la publicidad
    await this.pagosRepository.update(pago.id, { publicidad: { id: publicidadGuardada.id } });

    // Actualizar monto acumulado del hospedaje
    await this.actualizarMontoAcumulado(createDto.hospedajeId);

    // Enviar notificación por email
    try {
      await this.enviarNotificacionPublicidad(publicidadGuardada, 'creada');
    } catch (error) {
      console.error('Error enviando notificación de publicidad:', error);
    }

    return this.findOne(publicidadGuardada.id);
  }

  /**
   * Obtiene todas las publicidades con filtros
   */
  async findAll(usuarioId?: string, hospedajeId?: string, activas?: boolean) {
    const queryBuilder = this.publicidadRepository
      .createQueryBuilder('publicidad')
      .leftJoinAndSelect('publicidad.hospedaje', 'hospedaje')
      .leftJoinAndSelect('publicidad.usuario', 'usuario')
      .leftJoinAndSelect('publicidad.pagos', 'pagos');

    if (usuarioId) {
      queryBuilder.andWhere('publicidad.usuario.id = :usuarioId', { usuarioId });
    }

    if (hospedajeId) {
      queryBuilder.andWhere('publicidad.hospedaje.id = :hospedajeId', { hospedajeId });
    }

    if (activas) {
      queryBuilder.andWhere('publicidad.estado = :estado', { estado: EstadoPublicidad.ACTIVA });
      queryBuilder.andWhere('publicidad.fechaFin > :ahora', { ahora: new Date() });
    }

    return queryBuilder
      .orderBy('publicidad.fechaInicio', 'DESC')
      .getMany();
  }

  /**
   * Obtiene las publicidades de los hospedajes que administra el usuario
   * Aplica filtros granulares de autorización por hospedaje
   * @param usuarioId ID del usuario administrador
   * @returns Lista de publicidades de los hospedajes que puede administrar
   */
  async findPublicidadesByAdministrador(usuarioId: string): Promise<any[]> {
    console.log('🔍 Buscando publicidades para administrador:', usuarioId);

    // Obtener los hospedajes que puede administrar el usuario
    const hospedajesDelUsuario = await this.empleadosService.findHotelesByUsuario(usuarioId);

    console.log('🏨 Hospedajes como empleado:', hospedajesDelUsuario.length);

    // Obtener hospedajes donde es propietario usando HospedajesService
    const hospedajesComoPropietarioResult = await this.hospedajesService.findMisPropiedades({}, usuarioId);
    const hospedajesComoPropietario = hospedajesComoPropietarioResult.data;

    console.log('👑 Hospedajes como propietario:', hospedajesComoPropietario.length);

    // Combinar IDs de todos los hospedajes que puede administrar
    const hospedajeIds = new Set<string>();

    // Agregar hospedajes como empleado (con roles válidos para publicidad)
    hospedajesDelUsuario.forEach(empleado => {
      if (['ADMIN', 'ADMIN_HOTEL', 'RECEPCIONISTA'].includes(empleado.rol.nombre)) {
        hospedajeIds.add(empleado.hospedaje.id);
      }
    });

    // Agregar hospedajes como propietario
    hospedajesComoPropietario.forEach(hospedaje => {
      hospedajeIds.add(hospedaje.id);
    });

    console.log('📋 IDs de hospedajes administrables:', Array.from(hospedajeIds));

    // Si no tiene hospedajes, devolver array vacío
    if (hospedajeIds.size === 0) {
      console.log('⚠️ Usuario no administra ningún hospedaje');
      return [];
    }

    // Obtener publicidades de estos hospedajes
    const publicidades = await this.publicidadRepository
      .createQueryBuilder('publicidad')
      .leftJoinAndSelect('publicidad.hospedaje', 'hospedaje')
      .leftJoinAndSelect('publicidad.usuario', 'usuario')
      .leftJoinAndSelect('publicidad.pagos', 'pagos')
      .where('hospedaje.id IN (:...hospedajeIds)', { hospedajeIds: Array.from(hospedajeIds) })
      .orderBy('publicidad.fechaInicio', 'DESC')
      .getMany();

    console.log(`✅ Encontradas ${publicidades.length} publicidades para administrador ${usuarioId}`);

    return publicidades;
  }

  /**
   * Busca una publicidad por ID
   */
  async findOne(id: string): Promise<Publicidad> {
    const publicidad = await this.publicidadRepository.findOne({
      where: { id },
      relations: ['hospedaje', 'usuario', 'pagos']
    });

    if (!publicidad) {
      throw new NotFoundException('Publicidad no encontrada');
    }

    return publicidad;
  }

  /**
   * Actualiza configuración de una publicidad
   */
  async actualizar(id: string, updateDto: UpdatePublicidadDto, usuarioId: string): Promise<Publicidad> {
    const publicidad = await this.findOne(id);

    // Verificar permisos
    const esPropietario = publicidad.hospedaje.idOwnerHospedaje === usuarioId;
    const esAdminHotel = publicidad.hospedaje.empleados?.some(emp => 
      emp.usuario.id === usuarioId && emp.rol.nombre === 'ADMIN_HOTEL'
    );

    if (!esPropietario && !esAdminHotel) {
      throw new ForbiddenException('No tienes permiso para actualizar esta publicidad');
    }

    // Actualizar campos
    if (updateDto.renovacionAutomatica !== undefined) {
      publicidad.renovacionAutomatica = updateDto.renovacionAutomatica;
    }

    return this.publicidadRepository.save(publicidad);
  }

  /**
   * Cancela una publicidad
   */
  async cancelar(id: string, cancelarDto: CancelarPublicidadDto, usuarioId: string): Promise<Publicidad> {
    const publicidad = await this.findOne(id);

    // Verificar permisos
    const esPropietario = publicidad.hospedaje.idOwnerHospedaje === usuarioId;
    const esAdminHotel = publicidad.hospedaje.empleados?.some(emp => 
      emp.usuario.id === usuarioId && emp.rol.nombre === 'ADMIN_HOTEL'
    );

    if (!esPropietario && !esAdminHotel) {
      throw new ForbiddenException('No tienes permiso para cancelar esta publicidad');
    }

    // Verificar que esté activa
    if (publicidad.estado !== EstadoPublicidad.ACTIVA) {
      throw new BadRequestException('Solo se pueden cancelar publicidades activas');
    }

    // Cancelar
    publicidad.estado = EstadoPublicidad.CANCELADA;
    publicidad.motivoCancelacion = cancelarDto.motivoCancelacion;
    publicidad.renovacionAutomatica = false;

    const publicidadActualizada = await this.publicidadRepository.save(publicidad);

    // Actualizar monto acumulado
    await this.actualizarMontoAcumulado(publicidad.hospedaje.id);

    // Enviar notificación
    try {
      await this.enviarNotificacionPublicidad(publicidadActualizada, 'cancelada');
    } catch (error) {
      console.error('Error enviando notificación de cancelación:', error);
    }

    return publicidadActualizada;
  }

  /**
   * Obtiene estadísticas de publicidad para un hospedaje
   */
  async getEstadisticas(hospedajeId: string) {
    const publicidades = await this.publicidadRepository.find({
      where: { hospedaje: { id: hospedajeId } },
      order: { fechaInicio: 'DESC' }
    });

    const activas = publicidades.filter(p => p.estaVigente());
    const montoTotalInvertido = publicidades.reduce((sum, p) => sum + parseFloat(p.monto.toString()), 0);
    const montoActivoActual = activas.reduce((sum, p) => sum + parseFloat(p.monto.toString()), 0);

    return {
      totalPublicidades: publicidades.length,
      publicidadesActivas: activas.length,
      montoTotalInvertido,
      montoActivoActual,
      publicidades: publicidades.slice(0, 10) // Últimas 10
    };
  }

  /**
   * Procesa renovaciones automáticas (ejecutar diariamente)
   */
  async procesarRenovacionesAutomaticas(): Promise<void> {
    const publicidadesParaRenovar = await this.publicidadRepository.find({
      where: {
        renovacionAutomatica: true,
        estado: EstadoPublicidad.ACTIVA,
        fechaFin: LessThan(new Date(Date.now() + 24 * 60 * 60 * 1000)), // Próximas 24 horas
      },
      relations: ['hospedaje', 'usuario', 'pagos']
    });

    for (const publicidad of publicidadesParaRenovar) {
      try {
        await this.renovarPublicidad(publicidad);
      } catch (error) {
        console.error(`Error renovando publicidad ${publicidad.id}:`, error);
        await this.marcarRenovacionFallida(publicidad, error.message);
      }
    }
  }

  /**
   * Marca publicidades como expiradas (ejecutar diariamente)
   */
  async marcarExpiradas(): Promise<void> {
    await this.publicidadRepository.update(
      {
        estado: EstadoPublicidad.ACTIVA,
        fechaFin: LessThan(new Date()),
        renovacionAutomatica: false
      },
      {
        estado: EstadoPublicidad.EXPIRADA
      }
    );
  }

  /**
   * Renueva una publicidad automáticamente
   */
  private async renovarPublicidad(publicidad: Publicidad): Promise<void> {
    // Para renovación automática, necesitaríamos obtener los datos de tarjeta del último pago
    // Por ahora, marcar como expirada ya que no tenemos los datos de tarjeta
    throw new Error('Renovación automática requiere reimplementación sin tarjeta guardada');
  }

  /**
   * Marca una renovación como fallida
   */
  private async marcarRenovacionFallida(publicidad: Publicidad, motivo: string): Promise<void> {
    publicidad.estado = EstadoPublicidad.EXPIRADA;
    publicidad.renovacionAutomatica = false;
    publicidad.motivoCancelacion = `Renovación automática fallida: ${motivo}`;
    publicidad.fechaUltimaRenovacion = new Date();

    await this.publicidadRepository.save(publicidad);

    // Actualizar monto acumulado
    await this.actualizarMontoAcumulado(publicidad.hospedaje.id);

    // Enviar notificación de fallo
    await this.enviarNotificacionPublicidad(publicidad, 'fallo_renovacion');
  }

  /**
   * Actualiza el monto acumulado de publicidad para un hospedaje
   */
  private async actualizarMontoAcumulado(hospedajeId: string): Promise<void> {
    const publicidadesActivas = await this.publicidadRepository.find({
      where: {
        hospedaje: { id: hospedajeId },
        estado: EstadoPublicidad.ACTIVA,
        fechaFin: MoreThan(new Date())
      }
    });

    const montoAcumulado = publicidadesActivas.reduce(
      (sum, p) => sum + parseFloat(p.monto.toString()), 
      0
    );

    // Actualizar todas las publicidades activas del hospedaje
    await this.publicidadRepository.update(
      {
        hospedaje: { id: hospedajeId },
        estado: EstadoPublicidad.ACTIVA
      },
      { montoAcumulado }
    );
  }

  /**
   * Envía notificaciones por email sobre publicidad
   */
  private async enviarNotificacionPublicidad(publicidad: Publicidad, tipo: string): Promise<void> {
    const usuario = publicidad.usuario;
    const hospedaje = publicidad.hospedaje.nombre;

    let asunto = '';
    let contenido = '';

    switch (tipo) {
      case 'creada':
        asunto = '✅ Publicidad activada - Stay at Cumbrecita';
        contenido = `Tu publicidad para ${hospedaje} ha sido activada exitosamente por $${publicidad.monto}. Duración: 30 días.`;
        break;
      case 'renovada':
        asunto = '🔄 Publicidad renovada automáticamente';
        contenido = `Tu publicidad para ${hospedaje} se ha renovado automáticamente por $${publicidad.monto} por 30 días más.`;
        break;
      case 'cancelada':
        asunto = '❌ Publicidad cancelada';
        contenido = `Tu publicidad para ${hospedaje} ha sido cancelada.`;
        break;
      case 'fallo_renovacion':
        asunto = '⚠️ Fallo en renovación automática';
        contenido = `No se pudo renovar automáticamente tu publicidad para ${hospedaje}. Por favor, verifica tu tarjeta y crea una nueva publicidad.`;
        break;
    }

    try {
      await this.mailService.sendSimpleNotification(
        usuario.email,
        usuario.nombre,
        asunto,
        contenido
      );
    } catch (error) {
      console.error('Error enviando email de publicidad:', error);
    }
  }
}
