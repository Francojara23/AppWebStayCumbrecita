import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, DataSource, In } from 'typeorm';
import { Pago, EstadoPago, MetodoPago } from './entidades/pago.entity';
import { HistorialEstadoPago } from './entidades/historial-estado-pago.entity';
import { CreatePagoDto } from './dto/create-pago.dto';
import { PagoResponseDto } from './dto/pago-response.dto';
import { CambiarEstadoPagoDto } from './dto/cambiar-estado-pago.dto';
import { CancelarPagoDto } from './dto/cancelar-pago.dto';
import { FiltrosPagosDto } from './dto/filtros-pagos.dto';
import { TarjetasService } from 'src/tarjetas/tarjetas.service';
import { ReservasService } from 'src/reservas/reservas.service';
import { MailService } from 'src/mail/mail.service';
import { NotificacionesService } from 'src/notificaciones/notificaciones.service';
import { EstadoReserva } from 'src/common/enums/estado-reserva.enum';
import { ActualizarEstadoReservaDto } from 'src/reservas/dto/actualizar-estado-reserva.dto';
import { Tarjeta, TipoTarjeta } from 'src/tarjetas/entidades/tarjeta.entity';
import { TipoNotificacion } from 'src/common/enums/tipo-notificacion.enum';
import { Reserva } from 'src/reservas/entidades/reserva.entity';
import { CreatePagoPublicidadDto } from './dto/create-pago-publicidad.dto';

/**
 * Servicio que maneja la lógica de negocio relacionada con los pagos
 * Incluye gestión avanzada de estados, validación de transiciones y auditoría
 */
@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(Pago)
    private pagosRepository: Repository<Pago>,
    @InjectRepository(HistorialEstadoPago)
    private historialRepository: Repository<HistorialEstadoPago>,
    private dataSource: DataSource,
    private tarjetasService: TarjetasService,
    private reservasService: ReservasService,
    private mailService: MailService,
    private notificacionesService: NotificacionesService,
  ) {}

  // Definición de transiciones válidas entre estados
  private readonly TRANSICIONES_VALIDAS: Record<EstadoPago, EstadoPago[]> = {
    [EstadoPago.PENDIENTE]: [EstadoPago.PROCESANDO, EstadoPago.CANCELADO, EstadoPago.EXPIRADO],
    [EstadoPago.PROCESANDO]: [EstadoPago.APROBADO, EstadoPago.RECHAZADO, EstadoPago.FALLIDO],
    [EstadoPago.APROBADO]: [EstadoPago.CANCELADO, EstadoPago.REINTEGRADO], // Puede ser cancelado o reintegrado
    [EstadoPago.RECHAZADO]: [EstadoPago.PENDIENTE], // Solo para retry manual
    [EstadoPago.CANCELADO]: [], // Estado final
    [EstadoPago.REINTEGRADO]: [], // Estado final - dinero ya reintegrado
    [EstadoPago.EXPIRADO]: [EstadoPago.PENDIENTE], // Solo para retry manual
    [EstadoPago.FALLIDO]: [EstadoPago.PENDIENTE] // Solo para retry
  };

  /**
   * Crea un nuevo pago para una reserva
   * @param createPagoDto Datos del pago a crear
   * @returns Información del pago creado
   * @throws BadRequestException si la reserva no está en estado válido
   * @throws HttpException si la tarjeta no es válida
   */
  async createPago(createPagoDto: CreatePagoDto, usuarioId?: string): Promise<PagoResponseDto> {
    console.log('💰 PagosService.createPago - Iniciando con DTO:', {
      reservaId: createPagoDto.reservaId,
      metodo: createPagoDto.metodo,
      montoReserva: createPagoDto.montoReserva,
      montoTotal: createPagoDto.montoTotal,
      tieneReserva: !!createPagoDto.reservaId
    });

    // 1. Validar y obtener la reserva (solo si se proporciona)
    let reserva: any = null;
    if (createPagoDto.reservaId) {
      console.log('🏨 PagosService - Validando reserva:', createPagoDto.reservaId);
      reserva = await this.reservasService.findOne(createPagoDto.reservaId);
    
      if (![EstadoReserva.CREADA, EstadoReserva.PENDIENTE_PAGO].includes(reserva.estado)) {
        throw new BadRequestException('La reserva no está en estado válido para pago');
      }
    } else {
      console.log('💳 PagosService - Pago SIN reserva (publicidad)');
    }

    // 2. Si es pago con tarjeta, validar la tarjeta
    let tarjeta: Tarjeta | null = null;
    if (createPagoDto.metodo === 'TARJETA') {
      if (!createPagoDto.tarjeta) {
        throw new BadRequestException('Se requieren los datos de la tarjeta');
      }

      console.log('💳 PagosService - Validando tarjeta con datos:', createPagoDto.tarjeta);
      
      tarjeta = await this.tarjetasService.findActiveExact({
        numero: createPagoDto.tarjeta.numero,
        titular: createPagoDto.tarjeta.titular,
        vencimiento: createPagoDto.tarjeta.vencimiento,
        cve: createPagoDto.tarjeta.cve,
        tipo: createPagoDto.tarjeta.tipo,
        entidad: createPagoDto.tarjeta.entidad
      });
      
      console.log('💳 PagosService - Resultado de validación de tarjeta:', tarjeta ? 'VÁLIDA' : 'INVÁLIDA');

      if (!tarjeta) {
        // Calcular montos para pago rechazado
        const montoReservaRechazado = createPagoDto.montoReserva ?? reserva?.montoTotal ?? 0;
        const montoImpuestosRechazado = createPagoDto.montoImpuestos ?? reserva?.impuestos21 ?? 0;
        const montoTotalRechazado = createPagoDto.montoTotal ?? ((reserva?.montoTotal || 0) + (reserva?.impuestos21 || 0));

        // Guardar pago rechazado
        const pagoRechazado = this.pagosRepository.create({
          reserva,
          usuario: usuarioId ? { id: usuarioId } as any : null,
          metodo: createPagoDto.metodo,
          numeroEncriptado: createPagoDto.tarjeta.numero,
          titularEncriptado: createPagoDto.tarjeta.titular,
          cveEncriptado: createPagoDto.tarjeta.cve,
          vencimientoEncriptado: createPagoDto.tarjeta.vencimiento,
          montoReserva: montoReservaRechazado,
          montoImpuestos: montoImpuestosRechazado,
          montoTotal: montoTotalRechazado,
          fechaPago: new Date(),
          estado: EstadoPago.RECHAZADO
        });
        
        const pagoGuardado = await this.pagosRepository.save(pagoRechazado);
        await this.registrarCambioEstado(pagoGuardado, null, EstadoPago.RECHAZADO, 'Tarjeta no válida', usuarioId);
        
        throw new HttpException('Tarjeta no válida', HttpStatus.PAYMENT_REQUIRED);
      }
    }

    // 3. Crear el pago
    const estadoInicial = createPagoDto.metodo === 'TRANSFERENCIA' ? EstadoPago.PENDIENTE : EstadoPago.PROCESANDO;
    
    // Calcular montos: usar los del DTO si están disponibles, sino los de la reserva
    const montoReserva = createPagoDto.montoReserva ?? reserva?.montoTotal ?? 0;
    const montoImpuestos = createPagoDto.montoImpuestos ?? reserva?.impuestos21 ?? 0;
    const montoTotal = createPagoDto.montoTotal ?? ((reserva?.montoTotal || 0) + (reserva?.impuestos21 || 0));

    const pago = this.pagosRepository.create({
      reserva,
      tarjeta,
      usuario: usuarioId ? { id: usuarioId } as any : null,
      metodo: createPagoDto.metodo,
      numeroEncriptado: createPagoDto.tarjeta?.numero,
      titularEncriptado: createPagoDto.tarjeta?.titular,
      cveEncriptado: createPagoDto.tarjeta?.cve,
      vencimientoEncriptado: createPagoDto.tarjeta?.vencimiento,
      montoReserva,
      montoImpuestos,
      montoTotal,
      fechaPago: new Date(),
      estado: estadoInicial
    });

    const pagoGuardado = await this.pagosRepository.save(pago);
    await this.registrarCambioEstado(pagoGuardado, null, estadoInicial, 'Pago creado', usuarioId);

    // 4. Si es pago con tarjeta, procesar automáticamente
    if (createPagoDto.metodo === 'TARJETA') {
      console.log('🔄 PagosService - Cambiando estado a APROBADO...');
      const pagoAprobado = await this.cambiarEstado(pagoGuardado.id, EstadoPago.APROBADO, 'Pago procesado automáticamente', usuarioId);
      console.log('✅ PagosService - Estado cambiado, nuevo estado:', pagoAprobado.estado);
      return pagoAprobado;
    }

    console.log('💰 PagosService - Retornando pago sin procesar (transferencia)');
    return this.mapToResponseDto(pagoGuardado);
  }

  /**
   * Obtiene pagos con filtros
   */
  async findAll(filtros: FiltrosPagosDto) {
    const { page = 1, limit = 10, estado, metodo, usuarioId, hospedajeId, fechaDesde, fechaHasta, montoMin, montoMax } = filtros;
    const skip = (page - 1) * limit;

    const queryBuilder = this.pagosRepository.createQueryBuilder('pago')
      .leftJoinAndSelect('pago.reserva', 'reserva')
      .leftJoinAndSelect('reserva.turista', 'turista')
      .leftJoinAndSelect('reserva.hospedaje', 'hospedaje');

    if (estado) {
      queryBuilder.andWhere('pago.estado = :estado', { estado });
    }

    if (metodo) {
      queryBuilder.andWhere('pago.metodo = :metodo', { metodo });
    }

    if (usuarioId) {
      queryBuilder.andWhere('turista.id = :usuarioId', { usuarioId });
    }

    if (hospedajeId) {
      queryBuilder.andWhere('hospedaje.id = :hospedajeId', { hospedajeId });
    }

    if (fechaDesde) {
      queryBuilder.andWhere('pago.fechaPago >= :fechaDesde', { fechaDesde });
    }

    if (fechaHasta) {
      queryBuilder.andWhere('pago.fechaPago <= :fechaHasta', { fechaHasta });
    }

    if (montoMin !== undefined) {
      queryBuilder.andWhere('pago.montoTotal >= :montoMin', { montoMin });
    }

    if (montoMax !== undefined) {
      queryBuilder.andWhere('pago.montoTotal <= :montoMax', { montoMax });
    }

    const [pagos, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: pagos.map(pago => this.mapToResponseDto(pago)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene los pagos de los hospedajes que administra el usuario
   * Aplica filtros granulares de autorización por hospedaje  
   * @param usuarioId ID del usuario administrador
   * @returns Lista de pagos de los hospedajes que puede administrar
   */
  async findPagosByAdministrador(usuarioId: string): Promise<any[]> {
    console.log('🔍 Buscando pagos para administrador:', usuarioId);

    // Obtener los hospedajes que puede administrar el usuario
    const hospedajesDelUsuario = await this.dataSource.getRepository('Empleado').find({
      where: { usuario: { id: usuarioId } },
      relations: ['hospedaje', 'rol', 'usuario'],
    });

    console.log('🏨 Hospedajes como empleado:', hospedajesDelUsuario.length);

    // Obtener hospedajes donde es propietario
    const hospedajesComoPropietario = await this.dataSource.getRepository('Hospedaje').find({
      where: { idOwnerHospedaje: usuarioId }
    });

    console.log('👑 Hospedajes como propietario:', hospedajesComoPropietario.length);

    // Combinar IDs de todos los hospedajes que puede administrar
    const hospedajeIds = new Set<string>();

    // Agregar hospedajes como empleado (con roles válidos)
    hospedajesDelUsuario.forEach(empleado => {
      if (['ADMIN', 'RECEPCIONISTA', 'CONSERGE', 'EMPLEADO'].includes(empleado.rol.nombre)) {
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

    // Obtener pagos de estos hospedajes
    const pagos = await this.pagosRepository.find({
      where: {
        reserva: {
          hospedaje: {
            id: In(Array.from(hospedajeIds))
          }
        }
      },
      relations: [
        "reserva",
        "reserva.hospedaje", 
        "reserva.turista",
        "reserva.lineas",
        "reserva.lineas.habitacion",
        "reserva.lineas.habitacion.tipoHabitacion",
        "tarjeta"
      ],
      order: { createdAt: 'DESC' }
    });

    console.log(`✅ Encontrados ${pagos.length} pagos para administrador ${usuarioId}`);

    // Debug: Mostrar información de los pagos encontrados
    if (pagos.length > 0) {
      console.log('📄 Debug - Primer pago encontrado:', {
        id: pagos[0].id,
        estado: pagos[0].estado,
        metodo: pagos[0].metodo,
        reservaId: pagos[0].reserva?.id,
        hospedajeNombre: pagos[0].reserva?.hospedaje?.nombre,
        turistaNombre: pagos[0].reserva?.turista?.nombre
      });
      
      const hospedajesEncontrados = [...new Set(pagos.map(p => p.reserva?.hospedaje?.nombre).filter(Boolean))];
      console.log('🏨 Debug - Hospedajes únicos en pagos:', hospedajesEncontrados);
    }

    return pagos;
  }

  /**
   * Obtiene un pago específico por su ID
   * @param id ID del pago a buscar
   * @returns Información del pago encontrado
   * @throws NotFoundException si el pago no existe
   */
  async getPago(id: string): Promise<PagoResponseDto> {
    const pago = await this.pagosRepository.findOne({
      where: { id },
      relations: ['reserva', 'reserva.turista', 'reserva.hospedaje']
    });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    return this.mapToResponseDto(pago);
  }

  /**
   * Cambia el estado de un pago con validaciones
   */
  async cambiarEstado(pagoId: string, nuevoEstado: EstadoPago, motivo?: string, usuarioId?: string, metadatos?: any): Promise<PagoResponseDto> {
    const pago = await this.pagosRepository.findOne({
      where: { id: pagoId },
      relations: ['reserva', 'reserva.turista', 'reserva.hospedaje']
    });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    // Validar transición
    if (!this.esTransicionValida(pago.estado, nuevoEstado)) {
      throw new BadRequestException(`No se puede cambiar de ${pago.estado} a ${nuevoEstado}`);
    }

    const estadoAnterior = pago.estado;
    pago.estado = nuevoEstado;

    // Ejecutar lógica específica del estado
    await this.ejecutarLogicaEstado(pago, nuevoEstado);

    // Guardar cambios
    const pagoActualizado = await this.pagosRepository.save(pago);

    // Registrar en historial
    await this.registrarCambioEstado(pagoActualizado, estadoAnterior, nuevoEstado, motivo, usuarioId, metadatos);

    return this.mapToResponseDto(pagoActualizado);
  }

  /**
   * Cancela un pago
   */
  async cancelarPago(pagoId: string, dto: CancelarPagoDto, usuarioId?: string): Promise<PagoResponseDto> {
    return this.cambiarEstado(pagoId, EstadoPago.CANCELADO, dto.motivo, usuarioId, dto.metadatos);
  }

  /**
   * Reintenta un pago fallido o rechazado
   */
  async reintentarPago(pagoId: string, usuarioId?: string): Promise<PagoResponseDto> {
    const pago = await this.pagosRepository.findOne({
      where: { id: pagoId },
      relations: ['reserva']
    });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (![EstadoPago.RECHAZADO, EstadoPago.FALLIDO, EstadoPago.EXPIRADO].includes(pago.estado)) {
      throw new BadRequestException('Solo se pueden reintentar pagos rechazados, fallidos o expirados');
    }

    return this.cambiarEstado(pagoId, EstadoPago.PENDIENTE, 'Reintento manual', usuarioId);
  }

  /**
   * Obtiene el historial de cambios de estado de un pago
   */
  async getHistorialEstados(pagoId: string): Promise<HistorialEstadoPago[]> {
    return this.historialRepository.find({
      where: { pago: { id: pagoId } },
      relations: ['usuario'],
      order: { timestamp: 'DESC' }
    });
  }

  /**
   * Obtiene estadísticas de pagos
   */
  async getEstadisticas(hospedajeId?: string) {
    const queryBuilder = this.pagosRepository.createQueryBuilder('pago')
      .leftJoin('pago.reserva', 'reserva')
      .leftJoin('reserva.hospedaje', 'hospedaje');

    if (hospedajeId) {
      queryBuilder.where('hospedaje.id = :hospedajeId', { hospedajeId });
    }

    const [
      totalPagos,
      pagosPendientes,
      pagosAprobados,
      pagosRechazados,
      pagosCancelados,
      montoTotal
    ] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('pago.estado = :estado', { estado: EstadoPago.PENDIENTE }).getCount(),
      queryBuilder.clone().andWhere('pago.estado = :estado', { estado: EstadoPago.APROBADO }).getCount(),
      queryBuilder.clone().andWhere('pago.estado = :estado', { estado: EstadoPago.RECHAZADO }).getCount(),
      queryBuilder.clone().andWhere('pago.estado = :estado', { estado: EstadoPago.CANCELADO }).getCount(),
      queryBuilder.clone().andWhere('pago.estado = :estado', { estado: EstadoPago.APROBADO })
        .select('SUM(pago.montoTotal)', 'total').getRawOne()
    ]);

    return {
      totalPagos,
      pagosPendientes,
      pagosAprobados,
      pagosRechazados,
      pagosCancelados,
      montoTotal: montoTotal?.total || 0,
      tasaAprobacion: totalPagos > 0 ? (pagosAprobados / totalPagos) * 100 : 0
    };
  }

  /**
   * Procesa pagos expirados automáticamente
   * Nota: En un entorno de producción, esto debería ejecutarse mediante un cron job externo
   */
  async procesarPagosExpirados() {
    const fechaLimite = new Date(Date.now() - 30 * 60 * 1000); // 30 minutos atrás
    
    const pagosExpirados = await this.pagosRepository.find({
      where: {
        estado: EstadoPago.PENDIENTE,
        createdAt: LessThan(fechaLimite)
      },
      relations: ['reserva']
    });

    for (const pago of pagosExpirados) {
      await this.cambiarEstado(pago.id, EstadoPago.EXPIRADO, 'Expirado por tiempo límite (30 min)', 'SISTEMA');
    }

    // También procesar pagos en procesando por más de 5 minutos
    const fechaLimiteProcesando = new Date(Date.now() - 5 * 60 * 1000); // 5 minutos atrás
    
    const pagosFallidos = await this.pagosRepository.find({
      where: {
        estado: EstadoPago.PROCESANDO,
        updatedAt: LessThan(fechaLimiteProcesando)
      },
      relations: ['reserva']
    });

    for (const pago of pagosFallidos) {
      await this.cambiarEstado(pago.id, EstadoPago.FALLIDO, 'Fallo por timeout en procesamiento', 'SISTEMA');
    }
  }

  /**
   * Valida si una transición de estado es permitida
   */
  private esTransicionValida(estadoActual: EstadoPago, nuevoEstado: EstadoPago): boolean {
    return this.TRANSICIONES_VALIDAS[estadoActual].includes(nuevoEstado);
  }

  /**
   * Ejecuta lógica específica según el nuevo estado
   */
  private async ejecutarLogicaEstado(pago: Pago, nuevoEstado: EstadoPago): Promise<void> {
    switch (nuevoEstado) {
            case EstadoPago.APROBADO:
        if (pago.reserva) {
          // 1. Cambiar reserva a PAGADA
          const actualizarEstadoDto: ActualizarEstadoReservaDto = { estado: EstadoReserva.PAGADA };
          await this.reservasService.actualizarEstado(pago.reserva.id, actualizarEstadoDto);
          
          // 2. Enviar notificaciones
          await this.enviarNotificacionPago(pago, 'APROBADO');

          // 3. Enviar email de confirmación
          await this.mailService.sendPaymentStatusNotification(
            pago.reserva.turista.email,
            pago.reserva.turista.nombre,
            {
              monto: pago.montoTotal,
              reservaId: pago.reserva.id,
              estado: 'aprobado'
            }
          );
        }
        break;

      case EstadoPago.RECHAZADO:
        await this.enviarNotificacionPago(pago, 'RECHAZADO');
        break;

      case EstadoPago.EXPIRADO:
        if (pago.reserva) {
          // 1. Cambiar reserva a CANCELADA
          const cancelarReservaDto: ActualizarEstadoReservaDto = { estado: EstadoReserva.CANCELADA };
          await this.reservasService.actualizarEstado(pago.reserva.id, cancelarReservaDto);
          
          // 2. Notificar expiración
          await this.enviarNotificacionPago(pago, 'EXPIRADO');
        }
        break;

            case EstadoPago.CANCELADO:
        if (pago.reserva) {
          // 1. Cambiar reserva a CANCELADA si no está ya cancelada
          if (pago.reserva.estado !== EstadoReserva.CANCELADA) {
            const cancelarDto: ActualizarEstadoReservaDto = { estado: EstadoReserva.CANCELADA };
            await this.reservasService.actualizarEstado(pago.reserva.id, cancelarDto);
          }
          
          // 2. Notificar cancelación
          await this.enviarNotificacionPago(pago, 'CANCELADO');
        }
        break;

      case EstadoPago.FALLIDO:
        await this.enviarNotificacionPago(pago, 'FALLIDO');
        break;
    }
  }

  /**
   * Registra un cambio de estado en el historial
   */
  private async registrarCambioEstado(
    pago: Pago,
    estadoAnterior: EstadoPago | null,
    estadoNuevo: EstadoPago,
    motivo?: string,
    usuarioId?: string,
    metadatos?: any
  ): Promise<void> {
    const historial = this.historialRepository.create({
      pago,
      estadoAnterior,
      estadoNuevo,
      motivo,
      usuario: usuarioId ? { id: usuarioId } as any : undefined,
      metadatos,
      timestamp: new Date()
    });

    await this.historialRepository.save(historial);
  }

  /**
   * Envía notificaciones según el estado del pago
   */
  private async enviarNotificacionPago(pago: Pago, tipo: string): Promise<void> {
    const mensajes = {
      APROBADO: {
        titulo: '✅ Pago Aprobado',
        cuerpo: `Tu pago de $${pago.montoTotal} ha sido aprobado. Tu reserva está confirmada.`
      },
      RECHAZADO: {
        titulo: '❌ Pago Rechazado', 
        cuerpo: `Tu pago de $${pago.montoTotal} ha sido rechazado. Verifica los datos de tu tarjeta.`
      },
      EXPIRADO: {
        titulo: '⏰ Pago Expirado',
        cuerpo: `Tu pago de $${pago.montoTotal} ha expirado. Tu reserva ha sido cancelada.`
      },
      CANCELADO: {
        titulo: '🚫 Pago Cancelado',
        cuerpo: `Tu pago de $${pago.montoTotal} ha sido cancelado. Tu reserva ha sido cancelada.`
      },
      FALLIDO: {
        titulo: '⚠️ Error en el Pago',
        cuerpo: `Hubo un error procesando tu pago de $${pago.montoTotal}. Intenta nuevamente.`
      }
    };

    const mensaje = mensajes[tipo];
    if (mensaje) {
      // Usar la nueva función de notificaciones automáticas para mejor gestión
      const evento = tipo === 'APROBADO' ? 'pago_confirmado' : 'pago_rechazado';
      await this.notificacionesService.crearNotificacionAutomatica(
        evento,
        pago.reserva?.turista.id || '',
        {
          pagoId: pago.id,
          reservaId: pago.reserva?.id || '',
          monto: pago.montoTotal,
          metodo: pago.metodo
        },
        ['IN_APP', 'EMAIL', 'PUSH']
      );
    }
  }

  /**
   * Obtiene pagos de un usuario específico
   */
  async findByUserId(userId: string): Promise<{ data: any[], meta: { totalItemCount: number } }> {
    const [pagos, total] = await this.pagosRepository.findAndCount({
      where: {
        usuario: {
          id: userId
        }
      },
      relations: [
        'reserva', 
        'reserva.turista', 
        'reserva.hospedaje', 
        'reserva.hospedaje.imagenes',
        'tarjeta',
        'usuario'
      ],
      order: { fechaPago: 'DESC' }
    });

    return {
      data: pagos.map(pago => this.mapToDetailedResponseDto(pago)),
      meta: { totalItemCount: total }
    };
  }

  /**
   * Actualiza el reservaId de un pago existente
   * Usado cuando se crea una reserva después de un pago exitoso
   */
  async actualizarReservaId(pagoId: string, reservaId: string): Promise<PagoResponseDto> {
    const pago = await this.pagosRepository.findOne({
      where: { id: pagoId },
      relations: ['reserva', 'reserva.turista', 'reserva.hospedaje']
    });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    // Verificar que la reserva existe
    const reserva = await this.reservasService.findOne(reservaId);
    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }

    // Actualizar el pago con la nueva reserva
    pago.reserva = reserva;
    const pagoActualizado = await this.pagosRepository.save(pago);

    // Registrar el cambio en el historial
    await this.registrarCambioEstado(
      pagoActualizado, 
      pago.estado, 
      pago.estado, 
      `Pago asociado con reserva ${reservaId}`, 
      reserva.turista?.id
    );

    return this.mapToResponseDto(pagoActualizado);
  }

  /**
   * Mapea una entidad Pago a su DTO de respuesta
   */
  private mapToResponseDto(pago: Pago): PagoResponseDto {
    return {
      id: pago.id,
      reservaId: pago.reserva?.id || null,
      metodo: pago.metodo,
      estado: pago.estado,
      montoReserva: pago.montoReserva,
      montoImpuestos: pago.montoImpuestos,
      montoTotal: pago.montoTotal,
      fechaPago: pago.fechaPago
    };
  }

  /**
   * Mapea una entidad Pago a su DTO de respuesta con información detallada de la reserva
   */
  private mapToDetailedResponseDto(pago: Pago): any {
    // Obtener la primera imagen del hospedaje si está disponible
    const primeraImagen = pago.reserva?.hospedaje?.imagenes?.find(img => img.active)?.url || null;

    // Función para formatear fecha de vencimiento MM/YY
    const formatearVencimiento = (vencimiento: string): string => {
      if (!vencimiento) return '**/**';
      // Si viene en formato MMYY o MM/YY
      const cleaned = vencimiento.replace(/\D/g, ''); // Solo números
      if (cleaned.length >= 4) {
        const mes = cleaned.substring(0, 2);
        const año = cleaned.substring(2, 4);
        return `${mes}/${año}`;
      }
      return vencimiento;
    };

    // Función para obtener el tipo de tarjeta legible
    const getTipoTarjetaTexto = (tipo: TipoTarjeta): string => {
      return tipo === TipoTarjeta.CREDITO ? 'Crédito' : 'Débito';
    };

    return {
      id: pago.id,
      reservaId: pago.reserva?.id || null,
      metodo: pago.metodo,
      estado: pago.estado,
      montoReserva: pago.montoReserva,
      montoImpuestos: pago.montoImpuestos,
      montoTotal: pago.montoTotal,
      fechaPago: pago.fechaPago,
      reserva: pago.reserva ? {
        id: pago.reserva.id,
        fechaInicio: pago.reserva.fechaInicio,
        fechaFin: pago.reserva.fechaFin,
        estado: pago.reserva.estado,
        montoTotal: pago.reserva.montoTotal,
        impuestos21: pago.reserva.impuestos21,
        hospedaje: pago.reserva.hospedaje ? {
          id: pago.reserva.hospedaje.id,
          nombre: pago.reserva.hospedaje.nombre,
          direccion: pago.reserva.hospedaje.direccion,
          imagenUrl: primeraImagen
        } : null,
        turista: pago.reserva.turista ? {
          id: pago.reserva.turista.id,
          nombre: pago.reserva.turista.nombre,
          apellido: pago.reserva.turista.apellido,
          email: pago.reserva.turista.email
        } : null
      } : null,
      // Información completa de tarjeta
      tarjeta: pago.metodo === 'TARJETA' ? {
        ultimosDigitos: pago.numeroEncriptado?.slice(-4) || '****',
        titular: pago.titularEncriptado || 'No disponible',
        tipo: pago.tarjeta?.tipo ? getTipoTarjetaTexto(pago.tarjeta.tipo) : 'No disponible',
        vencimiento: formatearVencimiento(pago.vencimientoEncriptado || ''),
        entidad: pago.tarjeta?.entidad || 'No disponible'
      } : null
    };
  }

  async createPagoPublicidad(createPagoPublicidadDto: CreatePagoPublicidadDto, usuarioId?: string): Promise<Pago> {
    const { metodo, monto, tarjeta } = createPagoPublicidadDto;

    console.log('=== CREANDO PAGO PUBLICIDAD ===');
    console.log('Método:', metodo);
    console.log('Monto:', monto);
    console.log('Tarjeta enviada:', tarjeta);

    // Validar que la tarjeta exista y esté activa
    const tarjetaValida = await this.tarjetasService.findActiveExact({
      numero: tarjeta.numero,
      titular: tarjeta.titular,
      vencimiento: tarjeta.vencimiento,
      cve: tarjeta.cve,
      tipo: tarjeta.tipo,
      entidad: tarjeta.entidad
    });

    if (!tarjetaValida) {
      throw new BadRequestException('La tarjeta no existe o no está activa');
    }

    console.log('Tarjeta válida encontrada:', tarjetaValida.id);

    // Crear el pago (para publicidad, no hay reserva)
    const pago = this.pagosRepository.create({
      reserva: null,
      publicidad: null, // Se asignará desde PublicidadService
      tarjeta: tarjetaValida,
      usuario: usuarioId ? { id: usuarioId } as any : null,
      metodo: metodo,
      numeroEncriptado: tarjeta.numero,
      titularEncriptado: tarjeta.titular,
      cveEncriptado: tarjeta.cve,
      vencimientoEncriptado: tarjeta.vencimiento,
      montoReserva: 0, // Para publicidad no hay monto reserva
      montoImpuestos: 0, // Para publicidad no hay impuestos
      montoTotal: monto, // Solo el monto de la publicidad
      fechaPago: new Date(),
      estado: EstadoPago.PROCESANDO
    });

    const pagoGuardado = await this.pagosRepository.save(pago);
    
    // Registrar el cambio de estado
    await this.registrarCambioEstado(pagoGuardado, null, EstadoPago.PROCESANDO, 'Pago de publicidad creado', usuarioId);

    // Procesar pago automáticamente (simular aprobación)
    const pagoAprobado = await this.cambiarEstado(pagoGuardado.id, EstadoPago.APROBADO, 'Pago procesado automáticamente', usuarioId);

    console.log('Pago publicidad creado exitosamente:', pagoAprobado.id, 'Estado:', pagoAprobado.estado);
    
    // Devolver el pago con el estado actualizado
    const pagoFinal = await this.pagosRepository.findOne({
      where: { id: pagoGuardado.id },
      relations: ['tarjeta']
    });

    if (!pagoFinal) {
      throw new NotFoundException('No se pudo encontrar el pago creado');
    }

    return pagoFinal;
  }
}
