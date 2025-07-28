import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notificacion } from './entidades/notificacion.entity';
import { CreateNotificacionDto } from './dto/create-notificacion.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { Role } from '../common/enums/role.enum';
import { FcmService } from '../fcm/fcm.service';
import { TipoNotificacion } from '../common/enums/tipo-notificacion.enum';
import { WebSocketNotificationDto } from './dto/websocket-notification.dto';
import { Empleado } from '../empleados/entidades/empleado.entity';
import { Hospedaje } from '../hospedajes/entidades/hospedaje.entity';

@Injectable()
export class NotificacionesService {
  constructor(
    @InjectRepository(Notificacion)
    private readonly notificacionRepository: Repository<Notificacion>,
    @InjectRepository(Empleado)
    private readonly empleadoRepository: Repository<Empleado>,
    @InjectRepository(Hospedaje)
    private readonly hospedajeRepository: Repository<Hospedaje>,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly fcmService: FcmService,
  ) {}

  /**
   * Crea una nueva notificación y la envía por los canales especificados en tiempo real
   * @param createNotificacionDto Datos de la notificación a crear
   * @returns La notificación creada
   */
  async create(createNotificacionDto: CreateNotificacionDto): Promise<Notificacion> {
    // Obtener información del usuario destinatario
    const usuario = await this.usersService.findOne(createNotificacionDto.usuarioId);
    if (!usuario) {
      throw new NotFoundException('Usuario destinatario no encontrado');
    }

    // Determinar canales por defecto si no se especifican
    const canales = createNotificacionDto.canales || ['IN_APP'];
    
    // Crear la notificación en base de datos
    const notificacion = this.notificacionRepository.create({
      ...createNotificacionDto,
      usuario,
      canalInApp: canales.includes('IN_APP'),
      canalEmail: canales.includes('EMAIL'),
      canalPush: canales.includes('PUSH'),
    });
    
    const notificacionGuardada = await this.notificacionRepository.save(notificacion);

    // Procesar envío por canales especificados de forma asíncrona y en paralelo
    const envios: Promise<void>[] = [];

    // 1. Notificación IN_APP (WebSocket) - Tiempo real
    if (canales.includes('IN_APP')) {
      envios.push(this.sendInAppNotification(notificacionGuardada));
    }

    // 2. Notificación por EMAIL - Tiempo real
    if (canales.includes('EMAIL')) {
      envios.push(this.sendEmailNotification(notificacionGuardada));
    }

    // 3. Notificación PUSH - Tiempo real
    if (canales.includes('PUSH')) {
      envios.push(this.sendPushNotification(notificacionGuardada));
    }

    // Ejecutar todos los envíos en paralelo para máxima velocidad
    try {
      await Promise.allSettled(envios);
    } catch (error) {
      // La notificación ya se guardó, los errores de envío no deben detener el proceso
    }

    return notificacionGuardada;
  }

  /**
   * Envía notificación in-app via WebSocket en tiempo real
   * @param notificacion Notificación a enviar
   */
  private async sendInAppNotification(notificacion: Notificacion): Promise<void> {
    try {
      const webSocketPayload: WebSocketNotificationDto = {
        id: notificacion.id,
        titulo: notificacion.titulo,
        cuerpo: notificacion.cuerpo,
        tipo: notificacion.tipo,
        data: notificacion.data,
        createdAt: notificacion.createdAt.toISOString(),
        leida: notificacion.leida,
      };

      // Emitir evento para el gateway WebSocket
      this.eventEmitter.emit('notificacion.created', {
        notificacion: webSocketPayload,
        usuarioId: notificacion.usuario.id,
      });

    } catch (error) {
      // Error silencioso para WebSocket
    }
  }

  /**
   * Envía una notificación por email en tiempo real
   * @param notificacion Notificación a enviar
   */
  private async sendEmailNotification(notificacion: Notificacion): Promise<void> {
    try {
      const usuario = notificacion.usuario;
      if (!usuario?.email) {
        return;
      }

      const actionUrl = this.getActionUrl(notificacion);
      const actionText = this.getActionText(notificacion);
      const buttonText = this.getButtonText(notificacion);
      const additionalInfo = await this.getAdditionalInfo(notificacion);

      // Crear nombre completo del usuario
      const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || usuario.email.split('@')[0];

      // Obtener mensaje específico para email si existe
      const mensajeEmail = this.getEmailMessage(notificacion);

      await this.mailService.sendNotification(usuario.email, {
        tipo: notificacion.tipo,
        titulo: notificacion.titulo,
        mensaje: mensajeEmail,
        actionUrl,
        actionText,
        actionButtonText: buttonText,
        additionalInfo,
        nombreUsuario: nombreCompleto,
      });

    } catch (error) {
      // Error silencioso para email
    }
  }

  /**
   * Envía una notificación push en tiempo real
   * @param notificacion Notificación a enviar
   */
  private async sendPushNotification(notificacion: Notificacion): Promise<void> {
    try {
      const usuario = notificacion.usuario;
      const actionUrl = this.getActionUrl(notificacion);
      const actionText = this.getActionText(notificacion);
      const additionalInfo = this.getAdditionalInfo(notificacion);

      const message = {
        title: notificacion.titulo,
        body: notificacion.cuerpo,
        data: {
          type: notificacion.tipo,
          notificationId: notificacion.id,
          actionUrl,
          actionText,
          ...additionalInfo,
        },
      };

      // Determinar el topic basado en el rol del usuario para notificaciones grupales
      const isAdmin = this.isAdminUser(usuario);
      const topic = isAdmin ? 'admin-notifications' : 'tourist-notifications';

      // Enviar a topic (grupos)
      await this.fcmService.sendToTopic(topic, message);

      // TODO: Para notificaciones más específicas, agregar envío a token individual
      // if (usuario.fcmToken) {
      //   await this.fcmService.sendToDevice(usuario.fcmToken, message);
      // }

    } catch (error) {
      // Error silencioso para notificación push
    }
  }

  /**
   * Verifica si un usuario tiene rol administrativo
   * @param usuario Usuario a verificar
   * @returns true si es administrador
   */
  private isAdminUser(usuario: any): boolean {
    const adminRoles = [
      Role.ADMIN, 
      Role.PROPIETARIO, 
      Role.CONSERGE, 
      Role.SUPER_ADMIN, 
      Role.EMPLEADO,
      'ADMIN_HOTEL', // Rol específico de hotel
      'RECEPCIONISTA' // Rol de recepcionista
    ];
    
    // Verificar rol principal
    if (adminRoles.includes(usuario.rol)) return true;
    
    // Verificar roles adicionales si los tiene
    if (usuario.rolesGlobales?.some((userRole: any) => 
      adminRoles.includes(userRole.rol?.nombre))) return true;
      
    return false;
  }

  /**
   * Crea y envía notificaciones automáticas para eventos del sistema
   * @param evento Tipo de evento
   * @param usuarioId ID del usuario destinatario
   * @param data Datos adicionales del evento
   * @param canales Canales por los que enviar (por defecto todos)
   */
  async crearNotificacionAutomatica(
    evento: 'reserva_creada' | 'reserva_confirmada' | 'reserva_cancelada' | 
           'pago_confirmado' | 'pago_rechazado' | 'check_in' | 'check_out' |
           'mantenimiento' | 'actualizacion_sistema' | 'nueva_reserva_admin',
    usuarioId: string,
    data: any,
    canales: ('IN_APP' | 'EMAIL' | 'PUSH')[] = ['IN_APP', 'EMAIL', 'PUSH']
  ): Promise<Notificacion> {
    const { titulo, cuerpo, tipo } = this.getNotificationContent(evento, data);
    
    const createDto: CreateNotificacionDto = {
      usuarioId,
      titulo,
      cuerpo,
      tipo,
      data,
      canales,
    };

    return this.create(createDto);
  }

  /**
   * Obtiene el contenido de notificación según el evento
   * @param evento Tipo de evento
   * @param data Datos del evento
   * @returns Contenido de la notificación
   */
  /**
   * Formatea una fecha de forma segura sin problemas de zona horaria
   * @param fecha Fecha como string o Date object
   * @returns Fecha formateada en español argentino
   */
  private formatearFechaSinZonaHoraria(fecha: string | Date): string {
    try {
      // Si es un string de fecha (YYYY-MM-DD), procesarlo directamente
      if (typeof fecha === 'string') {
        const partes = fecha.split('T')[0].split('-'); // Tomar solo la parte de fecha, no la hora
        if (partes.length === 3) {
          const [año, mes, dia] = partes;
          const fechaLocal = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
          return fechaLocal.toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
      }

      // Si es un Date object, extraer las componentes sin afectación de zona horaria
      const fechaObj = new Date(fecha);
      // Usar getFullYear, getMonth, getDate que obtienen valores locales
      const fechaLocal = new Date(fechaObj.getFullYear(), fechaObj.getMonth(), fechaObj.getDate());
      return fechaLocal.toLocaleDateString('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Fecha no disponible';
    }
  }

  /**
   * Formatea una fecha de forma simple (DD/MM/YYYY) sin problemas de zona horaria
   * @param fecha Fecha como string o Date object
   * @returns Fecha formateada simple
   */
  private formatearFechaSimple(fecha: string | Date): string {
    try {
      // Si es un string de fecha (YYYY-MM-DD), procesarlo directamente
      if (typeof fecha === 'string') {
        const partes = fecha.split('T')[0].split('-'); // Tomar solo la parte de fecha, no la hora
        if (partes.length === 3) {
          const [año, mes, dia] = partes;
          return `${dia}/${mes}/${año}`;
        }
      }

      // Si es un Date object, extraer las componentes sin afectación de zona horaria
      const fechaObj = new Date(fecha);
      const dia = fechaObj.getDate().toString().padStart(2, '0');
      const mes = (fechaObj.getMonth() + 1).toString().padStart(2, '0');
      const año = fechaObj.getFullYear();
      return `${dia}/${mes}/${año}`;
    } catch (error) {
      return 'Fecha no disponible';
    }
  }

  /**
   * Plantillas predefinidas para notificaciones automáticas del sistema
   * Cada plantilla define título, cuerpo y tipo para diferentes eventos
   */
  private readonly PLANTILLAS_AUTOMATICAS = {
    // === RESERVAS ===
    reserva_creada: {
      titulo: '🎉 Nueva reserva creada',
      cuerpo: (data: any, formatearFecha: (fecha: any) => string) => 
        `Tu reserva en ${data.hospedaje} ha sido creada exitosamente. ` +
        `Check-in: ${formatearFecha(data.fechaInicio)} | ` +
        `Check-out: ${formatearFecha(data.fechaFin)} | ` +
        `Total: $${data.monto?.toLocaleString('es-AR') || data.monto}.`,
      cuerpoEmail: (data: any, formatearFecha: (fecha: any) => string) => 
        `Tu reserva en ${data.hospedaje} ha sido creada exitosamente. ` +
        `Check-in: ${formatearFecha(data.fechaInicio)} | ` +
        `Check-out: ${formatearFecha(data.fechaFin)} | ` +
        `Total: $${data.monto?.toLocaleString('es-AR') || data.monto}. ` +
        `📱 Encontrarás tu código QR para check-in en este email.`,
      tipo: TipoNotificacion.RESERVA
    },
    reserva_confirmada: {
      titulo: '✅ Reserva confirmada',
      cuerpo: (data: any, formatearFecha: (fecha: any) => string) => 
        `¡Excelente! Tu reserva en ${data.hospedaje} ha sido confirmada. ` +
        `Ya puedes disfrutar de tu estadía desde el ${formatearFecha(data.fechaInicio)} ` +
        `hasta el ${formatearFecha(data.fechaFin)}.`,
      cuerpoEmail: (data: any, formatearFecha: (fecha: any) => string) => 
        `¡Excelente! Tu reserva en ${data.hospedaje} ha sido confirmada. ` +
        `Ya puedes disfrutar de tu estadía desde el ${formatearFecha(data.fechaInicio)} ` +
        `hasta el ${formatearFecha(data.fechaFin)}. ` +
        `📱 Presenta tu código QR en la recepción el día del check-in.`,
      tipo: TipoNotificacion.RESERVA
    },
    reserva_cancelada: {
      titulo: '❌ Reserva cancelada',
      cuerpo: (data: any, formatearFecha: (fecha: any) => string) => 
        `Tu reserva en ${data.hospedaje} ha sido cancelada. ` +
        `Si tienes dudas, contáctanos. Fechas: ${formatearFecha(data.fechaInicio)} - ${formatearFecha(data.fechaFin)}`,
      tipo: TipoNotificacion.RESERVA
    },
    check_in: {
      titulo: '🏨 Check-in realizado',
      cuerpo: (data: any, formatearFecha?: (fecha: any) => string) => 
        `¡Bienvenido a ${data.hospedaje}! Tu check-in se ha realizado exitosamente. ` +
        `¡Disfruta tu estadía!`,
      tipo: TipoNotificacion.RESERVA
    },
    check_out: {
      titulo: '👋 Check-out realizado',
      cuerpo: (data: any, formatearFecha?: (fecha: any) => string) => 
        `Tu check-out de ${data.hospedaje} se ha completado. ` +
        `¡Esperamos que hayas disfrutado tu estadía! Gracias por elegirnos.`,
      tipo: TipoNotificacion.RESERVA
    },

    // === PAGOS ===
    pago_confirmado: {
      titulo: '💳 Pago confirmado',
      cuerpo: (data: any, formatearFecha?: (fecha: any) => string) => 
        `Tu pago de $${data.monto?.toLocaleString('es-AR') || data.monto} ha sido confirmado exitosamente. ` +
        `Método: ${data.metodo} | Tu reserva está asegurada.`,
      tipo: TipoNotificacion.PAGO
    },
    pago_rechazado: {
      titulo: '⚠️ Pago rechazado',
      cuerpo: (data: any, formatearFecha?: (fecha: any) => string) => 
        `Tu pago de $${data.monto?.toLocaleString('es-AR') || data.monto} ha sido rechazado. ` +
        `Verifica los datos de tu tarjeta e intenta nuevamente.`,
      tipo: TipoNotificacion.PAGO
    },
    pago_pendiente: {
      titulo: '⏳ Pago pendiente',
      cuerpo: (data: any, formatearFecha?: (fecha: any) => string) => 
        `Tu pago de $${data.monto?.toLocaleString('es-AR') || data.monto} está siendo procesado. ` +
        `Te notificaremos cuando se complete la transacción.`,
      tipo: TipoNotificacion.PAGO
    },
    pago_expirado: {
      titulo: '⏰ Pago expirado',
      cuerpo: (data: any, formatearFecha?: (fecha: any) => string) => 
        `Tu pago de $${data.monto?.toLocaleString('es-AR') || data.monto} ha expirado. ` +
        `Tu reserva ha sido cancelada. Puedes intentar reservar nuevamente.`,
      tipo: TipoNotificacion.PAGO
    },

    // === ADMINISTRACIÓN ===
    nueva_reserva_admin: {
      titulo: '📋 Nueva reserva recibida',
      cuerpo: (data: any, formatearFecha: (fecha: any) => string) => 
        `${data.nombreHuesped} reservó ${data.habitacion} en ${data.hospedaje} desde ${formatearFecha(data.fechaInicio)} al ${formatearFecha(data.fechaFin)}. ` +
        `Pago: $${data.monto?.toLocaleString('es-AR') || data.monto} vía ${data.metodoPago} - ${data.estadoPago}`,
      cuerpoDetallado: (data: any, formatearFecha: (fecha: any) => string) => 
        `🎯 NUEVA RESERVA CONFIRMADA\n\n` +
        `👤 Huésped: ${data.nombreHuesped}\n` +
        `📧 Email: ${data.emailHuesped}\n` +
        `📱 Teléfono: ${data.telefonoHuesped || 'No especificado'}\n\n` +
        `🏨 Hospedaje: ${data.hospedaje}\n` +
        `🛏️ Habitación: ${data.habitacion}\n` +
        `👥 Cantidad de huéspedes: ${data.cantidadHuespedes}\n\n` +
        `📅 Check-in: ${formatearFecha(data.fechaInicio)}\n` +
        `📅 Check-out: ${formatearFecha(data.fechaFin)}\n` +
        `🌙 Noches: ${data.cantidadNoches}\n\n` +
        `💰 INFORMACIÓN DE PAGO:\n` +
        `• Monto total: $${data.monto?.toLocaleString('es-AR') || data.monto}\n` +
        `• Método: ${data.metodoPago}\n` +
        `• Estado: ${data.estadoPago}\n` +
        `• Fecha de pago: ${data.fechaPago ? formatearFecha(data.fechaPago) : 'Pendiente'}\n\n` +
        `🆔 Código de reserva: ${data.codigoReserva}\n\n` +
        `⚡ Acciones requeridas:\n` +
        `• Preparar habitación para el ${formatearFecha(data.fechaInicio)}\n` +
        `• Contactar al huésped si es necesario\n` +
        `• Verificar disponibilidad de servicios adicionales`,
      tipo: TipoNotificacion.SISTEMA
    },
    pago_pendiente_admin: {
      titulo: '💰 Pago por revisar',
      cuerpo: (data: any, formatearFecha?: (fecha: any) => string) => 
        `Nuevo pago por transferencia de $${data.monto?.toLocaleString('es-AR') || data.monto} pendiente de revisión. ` +
        `Reserva: ${data.reservaId}`,
      tipo: TipoNotificacion.PAGO
    },

    // === SISTEMA ===
    bienvenida: {
      titulo: '🌟 ¡Bienvenido a La Cumbrecita!',
      cuerpo: (data: any, formatearFecha?: (fecha: any) => string) => 
        `Hola ${data.nombre}, bienvenido a nuestra plataforma. ` +
        `Descubre los mejores hospedajes en La Cumbrecita y disfruta de una experiencia única.`,
      tipo: TipoNotificacion.SISTEMA
    },
    recordatorio_checkin: {
      titulo: '🕐 Recordatorio de Check-in',
      cuerpo: (data: any, formatearFecha: (fecha: any) => string) => 
        `Tu check-in en ${data.hospedaje} es mañana (${formatearFecha(data.fechaInicio)}). ` +
        `¡Esperamos verte pronto!`,
      tipo: TipoNotificacion.RESERVA
    },
    valoracion_solicitada: {
      titulo: '⭐ ¿Cómo fue tu estadía?',
      cuerpo: (data: any, formatearFecha?: (fecha: any) => string) => 
        `Esperamos que hayas disfrutado tu estadía en ${data.hospedaje}. ` +
        `Tu opinión es muy importante para nosotros. ¡Déjanos una reseña!`,
      tipo: TipoNotificacion.SISTEMA
    }
  };

  private getNotificationContent(evento: string, data: any): { 
    titulo: string; 
    cuerpo: string; 
    tipo: TipoNotificacion 
  } {
    const plantilla = this.PLANTILLAS_AUTOMATICAS[evento];
    
    if (!plantilla) {
      // Plantilla por defecto para eventos no definidos
      return {
        titulo: '📢 Nueva notificación',
        cuerpo: 'Tienes una nueva notificación en el sistema.',
        tipo: TipoNotificacion.SISTEMA
      };
    }

    // Crear función de formateo de fechas que será pasada a las plantillas
    const formatearFecha = (fecha: any) => this.formatearFechaSimple(fecha);

    return {
      titulo: plantilla.titulo,
      cuerpo: typeof plantilla.cuerpo === 'function' ? plantilla.cuerpo(data, formatearFecha) : plantilla.cuerpo,
      tipo: plantilla.tipo
    };
  }

  /**
   * Obtiene el mensaje específico para email basado en el evento y los datos
   * @param notificacion Notificación que contiene el evento en el título
   * @returns Mensaje específico para email
   */
  private getEmailMessage(notificacion: Notificacion): string {
    // Extraer el evento del título o usar el cuerpo por defecto
    let evento = '';
    if (notificacion.titulo.includes('Nueva reserva creada')) {
      evento = 'reserva_creada';
    } else if (notificacion.titulo.includes('Reserva confirmada')) {
      evento = 'reserva_confirmada';
    } else {
      // Si no se puede determinar el evento, usar el cuerpo original
      return notificacion.cuerpo;
    }

    const plantilla = this.PLANTILLAS_AUTOMATICAS[evento];
    if (!plantilla || !plantilla.cuerpoEmail) {
      return notificacion.cuerpo;
    }

    // Crear función de formateo de fechas
    const formatearFecha = (fecha: any) => this.formatearFechaSimple(fecha);

    // Usar el cuerpoEmail si existe
    return typeof plantilla.cuerpoEmail === 'function' 
      ? plantilla.cuerpoEmail(notificacion.data, formatearFecha) 
      : plantilla.cuerpoEmail;
  }

  /**
   * Obtiene la URL de acción para una notificación
   * @param notificacion Notificación
   * @returns URL de acción
   */
  private getActionUrl(notificacion: Notificacion): string {
    const baseUrl = this.configService.get<string>('FRONTEND_URL') || '';
    switch (notificacion.tipo) {
      case TipoNotificacion.RESERVA:
        return `${baseUrl}/reservas/${notificacion.data?.reservaId}`;
      case TipoNotificacion.PAGO:
        return `${baseUrl}/pagos/${notificacion.data?.pagoId}`;
      default:
        return baseUrl;
    }
  }

  /**
   * Obtiene el texto de acción para una notificación
   * @param notificacion Notificación
   * @returns Texto de acción
   */
  private getActionText(notificacion: Notificacion): string {
    switch (notificacion.tipo) {
      case TipoNotificacion.RESERVA:
        return 'Ver detalles de la reserva';
      case TipoNotificacion.PAGO:
        return 'Ver detalles del pago';
      default:
        return 'Ver más detalles';
    }
  }

  /**
   * Obtiene el texto del botón para una notificación
   * @param notificacion Notificación
   * @returns Texto del botón
   */
  private getButtonText(notificacion: Notificacion): string {
    switch (notificacion.tipo) {
      case TipoNotificacion.RESERVA:
        return 'Ver Reserva';
      case TipoNotificacion.PAGO:
        return 'Ver Pago';
      default:
        return 'Ver Detalles';
    }
  }

  /**
   * Obtiene información adicional para una notificación
   * @param notificacion Notificación
   * @returns Información adicional
   */
  private async getAdditionalInfo(notificacion: Notificacion): Promise<Record<string, any>> {
    try {
      switch (notificacion.tipo) {
        case TipoNotificacion.RESERVA:
          return await this.getReservaAdditionalInfo(notificacion.data);
        case TipoNotificacion.PAGO:
          return await this.getPagoAdditionalInfo(notificacion.data);
        default:
          return { tipo: 'sistema' };
      }
    } catch (error) {
      return { tipo: 'error' };
    }
  }

  /**
   * Obtiene información detallada de una reserva para el email
   */
  private async getReservaAdditionalInfo(data: any): Promise<Record<string, any>> {
    const reservaInfo: Record<string, any> = {};

    // Información básica desde los datos de la notificación
    if (data?.reservaId) {
      reservaInfo.codigoReserva = data.reservaId.substring(0, 8).toUpperCase();
    }

    if (data?.fechaInicio) {
      reservaInfo.fechaCheckIn = this.formatearFechaSinZonaHoraria(data.fechaInicio);
    }

    if (data?.fechaFin) {
      reservaInfo.fechaCheckOut = this.formatearFechaSinZonaHoraria(data.fechaFin);
    }

    if (data?.fechaInicio && data?.fechaFin) {
      const inicio = new Date(data.fechaInicio);
      const fin = new Date(data.fechaFin);
      const diferencia = fin.getTime() - inicio.getTime();
      reservaInfo.cantidadNoches = Math.ceil(diferencia / (1000 * 3600 * 24));
    }

    if (data?.cantidadHuespedes) {
      reservaInfo.huespedes = data.cantidadHuespedes;
    }

    // Información del hospedaje desde los datos o consulta
    if (data?.hospedaje) {
      reservaInfo.nombreHospedaje = data.hospedaje;
    } else if (data?.hospedajeId) {
      try {
        const hospedaje = await this.hospedajeRepository.findOne({
          where: { id: data.hospedajeId }
        });
        if (hospedaje) {
          reservaInfo.nombreHospedaje = hospedaje.nombre;
          reservaInfo.direccionHospedaje = hospedaje.direccion;
        }
      } catch (error) {
        // Error silencioso al consultar hospedaje
      }
    }

    // Información de la habitación
    if (data?.habitacion) {
      reservaInfo.nombreHabitacion = data.habitacion;
    }

    // Código QR para check-in (solo para notificaciones de reserva creada/confirmada)
    if (data?.codigoQrUrl) {
      reservaInfo.codigoQrUrl = data.codigoQrUrl;
      reservaInfo.incluirQr = true;
      reservaInfo.mensajeQr = '📱 Tu código QR para check-in fue enviado por email. Preséntalo en la recepción el día de tu llegada.';
    }

    return reservaInfo;
  }

  /**
   * Obtiene información detallada de un pago para el email
   */
  private async getPagoAdditionalInfo(data: any): Promise<Record<string, any>> {
    const pagoInfo: Record<string, any> = {};

    if (data?.pagoId) {
      pagoInfo.codigoPago = data.pagoId.substring(0, 8).toUpperCase();
    }

    if (data?.monto) {
      pagoInfo.monto = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS'
      }).format(data.monto);
    }

    if (data?.metodo) {
      pagoInfo.metodoPago = data.metodo;
    }

    // Si el pago está asociado a una reserva, incluir información de la reserva
    if (data?.reservaId) {
      const reservaInfo = await this.getReservaAdditionalInfo(data);
      Object.assign(pagoInfo, reservaInfo);
    }

    return pagoInfo;
  }

  /**
   * Obtiene todas las notificaciones de un usuario
   */
  async findAllByUsuario(usuarioId: string): Promise<Notificacion[]> {
    return this.notificacionRepository.find({
      where: { usuario: { id: usuarioId } },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtiene todas las notificaciones específicas de administración de hospedajes para el usuario
   * Solo devuelve notificaciones enviadas al usuario en su rol de administrador/propietario,
   * NO incluye notificaciones que recibió como turista
   */
  async findAllByUserHospedajes(usuarioId: string): Promise<Notificacion[]> {

    // Verificar si es SUPER_ADMIN (puede ver todas las notificaciones)
    try {
      const usuario = await this.usersService.findOne(usuarioId);
      const esSuperAdmin = usuario.roles?.some(role => role.nombre === 'SUPER_ADMIN');
      
      if (esSuperAdmin) {
        return this.notificacionRepository.find({
          relations: ['usuario'],
          order: { createdAt: 'DESC' },
        });
      }
    } catch (error) {
      // Error silencioso verificando SUPER_ADMIN
    }

    const hospedajeIds = new Set<string>();

    // 1. Hospedajes donde es propietario directo (idOwnerHospedaje)
    try {
      const hospedajesPropios = await this.hospedajeRepository.find({
        where: { idOwnerHospedaje: usuarioId },
        select: ['id', 'nombre']
      });

      hospedajesPropios.forEach(h => {
        hospedajeIds.add(h.id);
      });
    } catch (error) {
      // Error silencioso obteniendo hospedajes propios
    }

    // 2. Hospedajes donde es empleado con roles válidos
    try {
      const rolesValidos = ['ADMIN', 'ADMIN_HOTEL', 'RECEPCIONISTA', 'CONSERJE', 'EMPLEADO'];
      
      const empleados = await this.empleadoRepository.find({
        where: { 
          usuario: { id: usuarioId },
          rol: { nombre: In(rolesValidos) }
        },
        relations: ['hospedaje', 'rol'],
      });

      empleados.forEach(emp => {
        hospedajeIds.add(emp.hospedaje.id);
      });
    } catch (error) {
      // Error silencioso obteniendo empleados
    }

    if (hospedajeIds.size === 0) {
      return [];
    }

    // Convertir Set a Array para la consulta
    const hospedajeIdsArray = Array.from(hospedajeIds);

    try {
      // FILTRO MEJORADO: Notificaciones administrativas relacionadas con hospedajes que administra
      // - Que estén relacionadas con hospedajes que administra (hospedajeId en los datos)
      // - Que sean notificaciones específicas para administradores (título contiene "Nueva reserva recibida" o "Pago por revisar")
      // - CAMBIO: Ya no filtra por usuario específico, sino por hospedajes que puede administrar
      const notificaciones = await this.notificacionRepository
        .createQueryBuilder('notificacion')
        .leftJoinAndSelect('notificacion.usuario', 'usuario')
        .where(
          `(
            (notificacion.data::jsonb ? 'hospedajeId' AND notificacion.data ->> 'hospedajeId' IN (:...hospedajeIds)) OR
            (notificacion.data::jsonb ? 'hospedaje' AND notificacion.data ->> 'hospedaje' IN (:...hospedajeIds)) OR
            (notificacion.data::jsonb ? 'hotelId' AND notificacion.data ->> 'hotelId' IN (:...hospedajeIds))
          )`,
          { hospedajeIds: hospedajeIdsArray }
        )
        .andWhere(
          `(
            notificacion.titulo LIKE '%Nueva reserva recibida%' OR
            notificacion.titulo LIKE '%Pago por revisar%' OR
            (notificacion.tipo = 'SISTEMA' AND notificacion.titulo NOT LIKE '%Nueva reserva creada%')
          )`
        )
        .orderBy('notificacion.createdAt', 'DESC')
        .getMany();

      return notificaciones;
    } catch (error) {
      console.error('Error obteniendo notificaciones de hospedajes:', error);
      return [];
    }
  }

  /**
   * Obtiene una notificación específica
   */
  async findOne(id: string): Promise<Notificacion> {
    const notificacion = await this.notificacionRepository.findOne({
      where: { id },
      relations: ['usuario'],
    });

    if (!notificacion) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return notificacion;
  }

  /**
   * Obtiene el contenido detallado de una notificación para mostrar en modales
   * @param id ID de la notificación
   * @returns Contenido detallado de la notificación
   */
  async getDetailedContent(id: string): Promise<{
    titulo: string;
    cuerpoResumen: string;
    cuerpoDetallado: string;
    tipo: string;
    data: any;
    createdAt: Date;
  }> {
    const notificacion = await this.findOne(id);
    
    // Determinar si tiene contenido detallado basado en el título
    let cuerpoDetallado = notificacion.cuerpo; // Por defecto, usar el cuerpo normal

    // Para notificaciones de "Nueva reserva recibida", generar contenido detallado
    if (notificacion.titulo.includes('Nueva reserva recibida')) {
      const plantilla = this.PLANTILLAS_AUTOMATICAS['nueva_reserva_admin'];
      if (plantilla && plantilla.cuerpoDetallado) {
        const formatearFecha = (fecha: any) => this.formatearFechaSimple(fecha);
        cuerpoDetallado = typeof plantilla.cuerpoDetallado === 'function' 
          ? plantilla.cuerpoDetallado(notificacion.data, formatearFecha)
          : plantilla.cuerpoDetallado;
      }
    }

    return {
      titulo: notificacion.titulo,
      cuerpoResumen: notificacion.cuerpo,
      cuerpoDetallado,
      tipo: notificacion.tipo,
      data: notificacion.data,
      createdAt: notificacion.createdAt,
    };
  }

  /**
   * Marca una notificación como leída/no leída
   */
  async markAsRead(id: string, markReadDto: MarkReadDto, usuarioId?: string): Promise<Notificacion> {
    const notificacion = await this.findOne(id);
    
    // Validar que el usuario solo pueda marcar sus propias notificaciones
    if (usuarioId && notificacion.usuario.id !== usuarioId) {
      throw new ForbiddenException('No tienes permisos para marcar esta notificación');
    }
    
    notificacion.leida = markReadDto.leida;
    notificacion.readAt = markReadDto.leida ? new Date() : undefined;

    return this.notificacionRepository.save(notificacion);
  }

  /**
   * Marca todas las notificaciones de un usuario como leídas
   */
  async markAllAsRead(usuarioId: string): Promise<void> {
    await this.notificacionRepository.update(
      { usuario: { id: usuarioId }, leida: false },
      { leida: true, readAt: new Date() }
    );
  }

  /**
   * Elimina una notificación
   */
  async remove(id: string, usuarioId?: string): Promise<void> {
    const notificacion = await this.findOne(id);
    
    // Validar que el usuario solo pueda eliminar sus propias notificaciones
    if (usuarioId && notificacion.usuario.id !== usuarioId) {
      throw new ForbiddenException('No tienes permisos para eliminar esta notificación');
    }
    
    await this.notificacionRepository.softRemove(notificacion);
  }
}
