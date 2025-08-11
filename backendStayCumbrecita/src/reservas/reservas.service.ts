import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, In } from "typeorm";
import { Reserva } from "./entidades/reserva.entity";
import { ReservaLinea } from "./entidades/reserva-linea.entity";

import { HuespedReserva } from "./entidades/huesped-reserva.entity";
import { Pago } from "../pagos/entidades/pago.entity";
import { HistorialEstadoPago } from "../pagos/entidades/historial-estado-pago.entity";
import { CrearReservaDto } from "./dto/crear-reserva.dto";
import { ActualizarEstadoReservaDto } from "./dto/actualizar-estado-reserva.dto";
import { CancelarReservaDto } from "./dto/cancelar-reserva.dto";
import { EstadoReserva } from "../common/enums/estado-reserva.enum";
import { HabitacionesService } from "../habitaciones/habitaciones.service";
import { HospedajesService } from "../hospedajes/hospedajes.service";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import { QrCodeService } from "../qr-code/qr-code.service";
import { CotizarReservaDto } from "./dto/cotizar-reserva.dto";

import { CheckoutDto } from "./dto/checkout.dto";
import { ApproveTransferDto } from "./dto/approve-transfer.dto";
import { EstadoPago, MetodoPago } from "../pagos/entidades/pago.entity";
import { VerificarQrDto } from "./dto/checkin/verificar-qr.dto";
import { RealizarCheckinDto } from "./dto/checkin/realizar-checkin.dto";
import { CheckinCompletoDto, HuespedPorHabitacionDto, DatosPagoCheckinDto } from "./dto/checkin/checkin-completo.dto";
import { DatosCheckinResponseDto } from "./dto/checkin/datos-checkin-response.dto";
import { ConfirmarCheckoutDto } from "./dto/checkout/confirmar-checkout.dto";
import { DatosCheckoutResponseDto } from "./dto/checkout/datos-checkout-response.dto";
import { AgregarCargoDto } from "./dto/checkout/agregar-cargo.dto";
import { TarjetaCheckin } from "../tarjetas/entidades/tarjeta-checkin.entity";
import { TarjetasService } from "../tarjetas/tarjetas.service";
import { Usuario } from "../users/users.entity";
import { PagosService } from "../pagos/pagos.service";

/**
 * Servicio que maneja la lógica de negocio relacionada con las reservas
 * Incluye la creación, actualización y gestión de estados de reservas,
 * así como la validación de disponibilidad de habitaciones y notificaciones automáticas
 */
@Injectable()
export class ReservasService {
  constructor(
    @InjectRepository(Reserva)
    private reservaRepository: Repository<Reserva>,
    @InjectRepository(ReservaLinea)
    private reservaLineaRepository: Repository<ReservaLinea>,

    @InjectRepository(HuespedReserva)
    private huespedReservaRepository: Repository<HuespedReserva>,
    @InjectRepository(Pago)
    private pagosRepository: Repository<Pago>,
    @InjectRepository(TarjetaCheckin)
    private tarjetaCheckinRepository: Repository<TarjetaCheckin>,
    private dataSource: DataSource,
    @Inject(forwardRef(() => HabitacionesService))
    private habitacionesService: HabitacionesService,
    @Inject(forwardRef(() => HospedajesService))
    private hospedajesService: HospedajesService,
    private notificacionesService: NotificacionesService,
    private qrCodeService: QrCodeService,
    private tarjetasService: TarjetasService,
    @Inject(forwardRef(() => PagosService))
    private pagosService: PagosService,
  ) {}

  /**
   * Crea una nueva reserva con sus líneas
   * Los huéspedes se registran durante el check-in
   * @param crearReservaDto Datos de la reserva a crear
   * @param turistaId ID del turista que realiza la reserva
   * @returns Reserva creada con sus relaciones
   * @throws NotFoundException si el hospedaje o alguna habitación no existe
   */
  async crear(
    crearReservaDto: CrearReservaDto,
    turistaId: string,
  ): Promise<Reserva> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verificar disponibilidad de habitaciones
      const hospedaje = await this.hospedajesService.findOne(
        crearReservaDto.hospedajeId,
      );
      if (!hospedaje) {
        throw new NotFoundException("Hospedaje no encontrado");
      }

      // Determinar estado inicial basado en el estado real del pago (si existe)
      let estadoInicial = EstadoReserva.CREADA;
      
      if (crearReservaDto.pagoId) {
        // Si hay un pagoId, consultar el estado real del pago
        const pagoReal = await this.pagosRepository.findOne({
          where: { id: crearReservaDto.pagoId }
        });
        
        if (pagoReal) {
          console.log('🔍 Estado real del pago:', pagoReal.estado);
          
          switch (pagoReal.estado) {
            case EstadoPago.APROBADO:
              estadoInicial = EstadoReserva.CONFIRMADA;
              console.log('✅ Reserva será CONFIRMADA porque pago está APROBADO');
              break;
            case EstadoPago.PROCESANDO:
              estadoInicial = EstadoReserva.PENDIENTE_PAGO;
              console.log('⏳ Reserva será PENDIENTE_PAGO porque pago está PROCESANDO');
              break;
            case EstadoPago.PENDIENTE:
              estadoInicial = EstadoReserva.PENDIENTE_PAGO;
              console.log('⏳ Reserva será PENDIENTE_PAGO porque pago está PENDIENTE');
              break;
            default:
              estadoInicial = EstadoReserva.CREADA;
              console.log('🆕 Reserva será CREADA porque pago tiene estado:', pagoReal.estado);
          }
        } else {
          console.log('⚠️ No se encontró el pago con ID:', crearReservaDto.pagoId);
        }
      } else {
        // Fallback: usar el estado del DTO si no hay pagoId
        if (crearReservaDto.estadoPago === 'APROBADO') {
          estadoInicial = EstadoReserva.CONFIRMADA;
        } else if (crearReservaDto.estadoPago === 'PROCESANDO') {
          estadoInicial = EstadoReserva.PENDIENTE_PAGO;
        }
        console.log('📝 Usando estado del DTO:', crearReservaDto.estadoPago, '→', estadoInicial);
      }

      // Debug: Mostrar datos recibidos
      console.log('📋 Datos recibidos para crear reserva:', {
        pagoId: crearReservaDto.pagoId,
        estadoPago: crearReservaDto.estadoPago,
        montoRealPago: crearReservaDto.montoRealPago,
        totalRealPago: crearReservaDto.totalRealPago,
        impuestosRealPago: crearReservaDto.impuestosRealPago,
        estadoFinal: estadoInicial
      });

      // Crear la reserva
      const reserva = this.reservaRepository.create({
        hospedaje: { id: crearReservaDto.hospedajeId },
        turista: { id: turistaId },
        fechaInicio: crearReservaDto.fechaInicio,
        fechaFin: crearReservaDto.fechaFin,
        estado: estadoInicial,
        observacion: crearReservaDto.observacion,
        // Usar montos reales del pago si están disponibles, sino calcular
        montoTotal: crearReservaDto.totalRealPago,
        impuestos21: crearReservaDto.impuestosRealPago,
      });

      const reservaGuardada = await queryRunner.manager.save(reserva);
      
      console.log('✅ Reserva creada con estado:', reservaGuardada.estado);

      // Mover la generación del QR después de crear las líneas y calcular montos

      // Crear las líneas de reserva
      let montoTotal = 0;
      for (const linea of crearReservaDto.lineas) {
        const habitacion = await this.habitacionesService.findOne(
          linea.habitacionId,
        );
        if (!habitacion) {
          throw new NotFoundException(
            `Habitación ${linea.habitacionId} no encontrada`,
          );
        }

        const reservaLinea = this.reservaLineaRepository.create({
          reserva: reservaGuardada,
          habitacion,
          precioBase: habitacion.precioBase,
          personas: linea.personas,
          precioFinal: habitacion.precioBase * linea.personas,
        });

        await queryRunner.manager.save(reservaLinea);
        montoTotal += reservaLinea.precioFinal;
      }

      // Nota: Los huéspedes se registrarán durante el check-in

      // Solo actualizar montos si no se pasaron datos reales del pago
      if (!crearReservaDto.totalRealPago) {
        reservaGuardada.montoTotal = montoTotal;
        reservaGuardada.impuestos21 = montoTotal * 0.21;
        await queryRunner.manager.save(reservaGuardada);
      }

      // Generar QR optimizado para la reserva
      try {
        const { qrCloudinaryUrl } = await this.qrCodeService.generarQrReserva(reservaGuardada.id);
        
        // Guardar la URL del QR en la reserva
        reservaGuardada.codigoQrUrl = qrCloudinaryUrl;
        await queryRunner.manager.save(reservaGuardada);
        
        console.log('✅ QR optimizado generado y guardado para reserva:', reservaGuardada.id);
      } catch (qrError) {
        console.error('❌ Error generando QR optimizado para reserva:', qrError);
        // No fallar la transacción por errores de QR
      }

      // Asegurar que el estado se persiste correctamente antes del commit
      console.log('🔄 Verificando estado antes del commit:', reservaGuardada.estado);
      
      await queryRunner.commitTransaction();
      
      console.log('✅ Transacción committada. Estado final de la reserva:', reservaGuardada.estado);

      // Enviar notificación de reserva creada en tiempo real
      try {
        // Calcular cantidad total de huéspedes
        const cantidadHuespedes = crearReservaDto.lineas.reduce((total, linea) => total + linea.personas, 0);
        
                  // Obtener nombres de habitaciones
          const habitaciones = await Promise.all(
            crearReservaDto.lineas.map(async (linea) => {
              const habitacion = await this.habitacionesService.findOne(linea.habitacionId);
              return habitacion.nombre || habitacion.tipoHabitacion?.nombre || 'Habitación';
            })
          );
          const nombreHabitacion = habitaciones.join(', ');

        const dataNotificacion = {
          reservaId: reservaGuardada.id,
          hospedaje: hospedaje.nombre,
          hospedajeId: hospedaje.id,
          fechaInicio: crearReservaDto.fechaInicio,
          fechaFin: crearReservaDto.fechaFin,
          monto: reservaGuardada.montoTotal || montoTotal, // Usar monto real o fallback
          cantidadHuespedes,
          habitacion: nombreHabitacion,
          codigoQrUrl: reservaGuardada.codigoQrUrl, // Incluir QR para el email
        };

        console.log('📅 Datos de fechas para notificación:', {
          fechaInicio: crearReservaDto.fechaInicio,
          fechaFin: crearReservaDto.fechaFin,
          tipoFechaInicio: typeof crearReservaDto.fechaInicio,
          tipoFechaFin: typeof crearReservaDto.fechaFin
        });

        // 1. NOTIFICACIÓN AL TURISTA (sin cambios)
        await this.notificacionesService.crearNotificacionAutomatica(
          "reserva_creada",
          turistaId,
          dataNotificacion,
          ["IN_APP", "EMAIL"],
        );

        // 2. NOTIFICACIÓN AL PROPIETARIO DEL HOSPEDAJE (nueva plantilla específica)
        if (hospedaje.idOwnerHospedaje) {
          // Obtener información completa del turista
          const turista = await this.dataSource.getRepository('Usuario').findOne({
            where: { id: turistaId },
            select: ['id', 'nombre', 'apellido', 'email', 'telefono']
          });

          // Obtener información del pago si existe
          let metodoPago = 'No especificado';
          let estadoPago = 'Pendiente';
          let fechaPago: Date | null = null;

          if (crearReservaDto.pagoId) {
            // Consultar el pago real usando el pagoId del DTO
            const pagoReal = await this.pagosRepository.findOne({
              where: { id: crearReservaDto.pagoId },
              relations: ['tarjeta']
            });

            if (pagoReal) {
              metodoPago = this.getMetodoPagoTexto(pagoReal.metodo);
              estadoPago = this.getEstadoPagoTexto(pagoReal.estado);
              fechaPago = pagoReal.fechaPago || pagoReal.createdAt;
            }
          }

          // Calcular cantidad de noches
          const fechaInicio = new Date(crearReservaDto.fechaInicio);
          const fechaFin = new Date(crearReservaDto.fechaFin);
          const cantidadNoches = Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 3600 * 24));

          const dataNotificacionAdmin = {
            reservaId: reservaGuardada.id,
            codigoReserva: reservaGuardada.id.substring(0, 8).toUpperCase(),
            hospedaje: hospedaje.nombre,
            hospedajeId: hospedaje.id,
            habitacion: nombreHabitacion,
            fechaInicio: crearReservaDto.fechaInicio,
            fechaFin: crearReservaDto.fechaFin,
            cantidadNoches,
            monto: reservaGuardada.montoTotal || montoTotal,
            cantidadHuespedes,
            // Información del huésped
            nombreHuesped: turista ? `${turista.nombre} ${turista.apellido}` : 'Huésped',
            emailHuesped: turista?.email || 'No especificado',
            telefonoHuesped: turista?.telefono || null,
            // Información del pago
            metodoPago,
            estadoPago,
            fechaPago,
          };

          await this.notificacionesService.crearNotificacionAutomatica(
            "nueva_reserva_admin",
            hospedaje.idOwnerHospedaje,
            dataNotificacionAdmin,
            ["IN_APP", "PUSH"],
          );
        }
      } catch (notifError) {
        console.error(
          "Error enviando notificaciones de reserva creada:",
          notifError,
        );
        // No fallar la transacción por errores de notificación
      }

      // Cargar la reserva completa con sus relaciones pero manteniendo el estado correcto
      const reservaCompleta = await this.reservaRepository.findOne({
        where: { id: reservaGuardada.id },
        relations: [
          "hospedaje",
          "turista", 
          "lineas",
          "lineas.habitacion",

          "pagos"
        ],
      });

      // Asegurar que el estado sea el correcto (el que asignamos)
      if (reservaCompleta) {
        reservaCompleta.estado = reservaGuardada.estado;
        console.log('🎯 Retornando reserva con estado:', reservaCompleta.estado);
      }

      return reservaCompleta || reservaGuardada;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Obtiene todas las reservas con sus relaciones
   * @returns Lista de reservas con sus detalles
   */
  async findAll(): Promise<Reserva[]> {
    return this.reservaRepository.find({
      relations: [
        "hospedaje",
        "turista",
        "lineas",
        "lineas.habitacion",
        "huespedes",
      ],
    });
  }

  /**
   * Obtiene las reservas de los hospedajes que administra el usuario
   * Aplica filtros granulares de autorización por hospedaje  
   * @param usuarioId ID del usuario administrador
   * @returns Lista de reservas de los hospedajes que puede administrar
   */
  async findReservasByAdministrador(usuarioId: string): Promise<Reserva[]> {
    console.log('🔍 Buscando reservas para administrador:', usuarioId);

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

    // Obtener reservas de estos hospedajes usando el operador In de TypeORM
    const reservas = await this.reservaRepository.find({
      where: {
        hospedaje: {
          id: In(Array.from(hospedajeIds))
        }
      },
      relations: [
        "hospedaje",
        "turista",
        "lineas",
        "lineas.habitacion",
        "lineas.habitacion.tipoHabitacion",
        "huespedes",
        "pagos"
      ],
      order: { createdAt: 'DESC' }
    });

    console.log(`✅ Encontradas ${reservas.length} reservas para administrador ${usuarioId}`);

    return reservas;
  }

  /**
   * Busca una reserva específica por su ID
   * @param id ID de la reserva a buscar
   * @returns Reserva encontrada con sus relaciones
   * @throws NotFoundException si la reserva no existe
   */
  async findOne(id: string): Promise<Reserva> {
    const reserva = await this.reservaRepository.findOne({
      where: { id },
      relations: [
        "hospedaje",
        "turista",
        "lineas",
        "lineas.habitacion",
        "huespedes",
      ],
    });

    if (!reserva) {
      throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    }

    return reserva;
  }

  /**
   * Actualiza el estado de una reserva y envía notificaciones automáticas
   * @param id ID de la reserva a actualizar
   * @param actualizarEstadoDto Nuevo estado de la reserva
   * @returns Reserva actualizada
   * @throws BadRequestException si la transición de estado no es válida
   */
  async actualizarEstado(
    id: string,
    actualizarEstadoDto: ActualizarEstadoReservaDto,
  ): Promise<Reserva> {
    const reserva = await this.findOne(id);

    // Validar transición de estado
    if (!this.esTransicionValida(reserva.estado, actualizarEstadoDto.estado)) {
      throw new BadRequestException("Transición de estado no válida");
    }

    const estadoAnterior = reserva.estado;
    reserva.estado = actualizarEstadoDto.estado;
    const reservaActualizada = await this.reservaRepository.save(reserva);

    // Enviar notificaciones según el cambio de estado
    try {
      await this.enviarNotificacionCambioEstado(
        reservaActualizada,
        estadoAnterior,
      );
    } catch (notifError) {
      console.error(
        "Error enviando notificaciones de cambio de estado:",
        notifError,
      );
      // No fallar la operación por errores de notificación
    }

    return reservaActualizada;
  }

  /**
   * Envía notificaciones automáticas según el cambio de estado de la reserva
   * @param reserva Reserva actualizada
   * @param estadoAnterior Estado anterior de la reserva
   */
  private async enviarNotificacionCambioEstado(
    reserva: Reserva,
    estadoAnterior: EstadoReserva,
  ): Promise<void> {
    const hospedaje = reserva.hospedaje?.nombre || "su reserva";
    const turista = reserva.turista;

    switch (reserva.estado) {
      case EstadoReserva.PAGADA:
        if (estadoAnterior === EstadoReserva.PENDIENTE_PAGO) {
          await this.notificacionesService.crearNotificacionAutomatica(
            "reserva_confirmada",
            turista.id,
            {
              reservaId: reserva.id,
              hospedaje,
              hospedajeId: reserva.hospedaje.id,
              fechaInicio: reserva.fechaInicio,
              fechaFin: reserva.fechaFin,
              codigoQrUrl: reserva.codigoQrUrl, // Incluir QR para el email
            },
            ["IN_APP", "EMAIL"],
          );
        }
        break;

      case EstadoReserva.CANCELADA:
        await this.notificacionesService.crearNotificacionAutomatica(
          "reserva_cancelada",
          turista.id,
          {
            reservaId: reserva.id,
            hospedaje,
            hospedajeId: reserva.hospedaje.id,
            fechaInicio: reserva.fechaInicio,
            fechaFin: reserva.fechaFin,
          },
          ["IN_APP", "EMAIL"],
        );
        break;
    }
  }

  /**
   * Valida si una transición de estado es permitida
   * @param estadoActual Estado actual de la reserva
   * @param nuevoEstado Estado al que se quiere cambiar
   * @returns true si la transición es válida, false en caso contrario
   */
  private esTransicionValida(
    estadoActual: EstadoReserva,
    nuevoEstado: EstadoReserva,
  ): boolean {
    const transicionesValidas: Record<EstadoReserva, EstadoReserva[]> = {
      [EstadoReserva.CREADA]: [
        EstadoReserva.PENDIENTE_PAGO,
        EstadoReserva.CANCELADA,
      ],
      [EstadoReserva.PENDIENTE_PAGO]: [
        EstadoReserva.PAGADA,
        EstadoReserva.CANCELADA,
      ],
      [EstadoReserva.PAGADA]: [EstadoReserva.CHECK_IN, EstadoReserva.CANCELADA],
      [EstadoReserva.CONFIRMADA]: [
        EstadoReserva.CHECK_IN,
        EstadoReserva.CANCELADA,
      ],
      [EstadoReserva.CHECK_IN]: [EstadoReserva.CHECK_OUT],
      [EstadoReserva.CHECK_OUT]: [EstadoReserva.CERRADA],
      [EstadoReserva.CANCELADA]: [],
      [EstadoReserva.CERRADA]: [],
    };

    return transicionesValidas[estadoActual].includes(nuevoEstado);
  }

  async cotizar(dto: CotizarReservaDto) {
    let subtotal = 0;
    const habitacionesDetalle: Array<{
      habitacionId: string;
      cantidad: number;
      precioUnitario: number;
      total: number;
    }> = [];

    for (const habitacion of dto.habitaciones) {
      const precio = await this.habitacionesService.getPrecioPorFecha(
        habitacion.habitacionId,
        dto.desde,
      );
      const totalHabitacion = precio * habitacion.cantidad;
      subtotal += totalHabitacion;

      habitacionesDetalle.push({
        habitacionId: habitacion.habitacionId,
        cantidad: habitacion.cantidad,
        precioUnitario: precio,
        total: totalHabitacion,
      });
    }

    const impuestos21 = subtotal * 0.21;
    const total = subtotal + impuestos21;

    return {
      subtotal,
      impuestos21,
      total,
      habitaciones: habitacionesDetalle,
    };
  }

  // MÉTODO ELIMINADO: registrarCheckIn (usaba acompañantes)

  async registrarCheckOut(id: string, dto: CheckoutDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const reserva = await queryRunner.manager.findOne(Reserva, {
        where: { id },
        relations: ["hospedaje", "turista"],
      });

      if (!reserva) {
        throw new NotFoundException("Reserva no encontrada");
      }

      if (reserva.estado !== EstadoReserva.CHECK_IN) {
        throw new BadRequestException(
          "La reserva debe estar en check-in para realizar el check-out",
        );
      }

      reserva.estado = EstadoReserva.CHECK_OUT;
      if (dto.observaciones) {
        reserva.observacion = dto.observaciones;
      }

      const reservaActualizada = await queryRunner.manager.save(reserva);

      // 🔥 ELIMINAR TARJETAS DE CHECK-IN (ÚNICO DELETE PERMITIDO)
      await this.eliminarTarjetasCheckin(reserva.id, queryRunner);

      await queryRunner.commitTransaction();

      // Enviar notificación de check-out
      try {
        await this.notificacionesService.crearNotificacionAutomatica(
          "check_out",
          reserva.turista.id,
          {
            reservaId: reserva.id,
            hospedaje: reserva.hospedaje.nombre,
            hospedajeId: reserva.hospedaje.id,
            fechaCheckOut: new Date(),
          },
          ["IN_APP", "EMAIL"],
        );
      } catch (notifError) {
        console.error("Error enviando notificación de check-out:", notifError);
      }

      return reservaActualizada;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Elimina las tarjetas de check-in de una reserva
   * ÚNICO MÉTODO DELETE PERMITIDO EN EL SISTEMA
   */
  private async eliminarTarjetasCheckin(reservaId: string, queryRunner: any) {
    try {
      const tarjetasEliminadas = await queryRunner.manager.delete(TarjetaCheckin, {
        reserva: { id: reservaId }
      });

      console.log(`🗑️ SEGURIDAD: Eliminadas ${tarjetasEliminadas.affected || 0} tarjetas de check-in para reserva ${reservaId}`);
      
      return tarjetasEliminadas;
    } catch (error) {
      console.error('❌ Error eliminando tarjetas de check-in:', error);
      throw new BadRequestException('Error eliminando datos de tarjetas temporales');
    }
  }

  async aprobarTransferencia(id: string, dto: ApproveTransferDto) {
    const reserva = await this.reservaRepository.findOne({
      where: { id },
      relations: ["pagos"],
    });

    if (!reserva) {
      throw new NotFoundException("Reserva no encontrada");
    }

    if (reserva.estado !== EstadoReserva.PENDIENTE_PAGO) {
      throw new BadRequestException(
        "La reserva debe estar pendiente de pago para aprobar la transferencia",
      );
    }

    reserva.estado = EstadoReserva.PAGADA;

    // Actualizar el pago asociado
    const pago = reserva.pagos[0];
    if (pago) {
      pago.estado = EstadoPago.APROBADO;
      pago.fechaPago = dto.fechaTransferencia;
      await this.pagosRepository.save(pago);
    }

    return this.reservaRepository.save(reserva);
  }

  async findByHabitacion(habitacionId: string, desde?: Date, hasta?: Date) {
    const query = this.reservaRepository
      .createQueryBuilder("reservas")
      .innerJoin("reservas.lineas", "linea")
      .where("linea.habitacionId = :habitacionId", { habitacionId });

    if (desde && hasta) {
      query.andWhere(
        "(reservas.fechaInicio <= :hasta AND reservas.fechaFin >= :desde)",
        { desde, hasta },
      );
    }

    return query.getMany();
  }

  /**
   * Obtiene todas las reservas de un usuario específico
   * Aplica control de acceso: los turistas solo pueden ver sus propias reservas
   * @param usuarioId ID del usuario cuyas reservas se quieren obtener
   * @param userAuth Usuario autenticado que hace la petición
   * @returns Lista de reservas del usuario
   * @throws NotFoundException si el usuario no existe
   * @throws BadRequestException si un turista intenta ver reservas de otro usuario
   */
  async findByUsuario(usuarioId: string, userAuth: any): Promise<Reserva[]> {
    // Control de acceso: los turistas solo pueden ver sus propias reservas
    if (userAuth.roles.includes('TURISTA') && userAuth.id !== usuarioId) {
      throw new BadRequestException('No tienes permisos para ver las reservas de este usuario');
    }

    const reservas = await this.reservaRepository.find({
      where: { turista: { id: usuarioId } },
      relations: [
        "hospedaje",
        "turista",
        "lineas",
        "lineas.habitacion",
        "lineas.habitacion.tipoHabitacion",
        "huespedes",
        "pagos"
      ],
      order: { createdAt: 'DESC' }
    });

    if (reservas.length === 0) {
      // Verificar si el usuario existe
      const userExists = await this.dataSource.getRepository('Usuario').findOne({
        where: { id: usuarioId }
      });
      
      if (!userExists) {
        throw new NotFoundException('Usuario no encontrado');
      }
    }

    return reservas;
  }

  /**
   * Obtiene las reservas completadas de un usuario específico
   * Filtra por estado CERRADA y pago APROBADO
   * @param usuarioId ID del usuario cuyas reservas completadas se quieren obtener
   * @param userAuth Usuario autenticado que hace la petición
   * @returns Lista de reservas completadas del usuario
   * @throws NotFoundException si el usuario no existe
   * @throws BadRequestException si un turista intenta ver reservas de otro usuario
   */
  async findReservasCompletadasByUsuario(usuarioId: string, userAuth: any): Promise<Reserva[]> {
    // Control de acceso: los turistas solo pueden ver sus propias reservas
    if (userAuth.roles.includes('TURISTA') && userAuth.id !== usuarioId) {
      throw new BadRequestException('No tienes permisos para ver las reservas de este usuario');
    }

    const reservas = await this.reservaRepository
      .createQueryBuilder('reserva')
      .leftJoinAndSelect('reserva.hospedaje', 'hospedaje')
      .leftJoinAndSelect('reserva.turista', 'turista')
      .leftJoinAndSelect('reserva.lineas', 'lineas')
      .leftJoinAndSelect('lineas.habitacion', 'habitacion')
      .leftJoinAndSelect('habitacion.tipoHabitacion', 'tipoHabitacion')
      .leftJoinAndSelect('reserva.acompaniantes', 'acompaniantes')
      .leftJoinAndSelect('reserva.pagos', 'pagos')
      .where('reserva.turista.id = :usuarioId', { usuarioId })
      .andWhere('reserva.estado = :estadoReserva', { estadoReserva: EstadoReserva.CERRADA })
      .andWhere('pagos.estado = :estadoPago', { estadoPago: 'APROBADO' })
      .orderBy('reserva.createdAt', 'DESC')
      .getMany();

    if (reservas.length === 0) {
      // Verificar si el usuario existe
      const userExists = await this.dataSource.getRepository('Usuario').findOne({
        where: { id: usuarioId }
      });
      
      if (!userExists) {
        throw new NotFoundException('Usuario no encontrado');
      }
    }

    return reservas;
  }

  /**
   * Obtiene todas las reservas del usuario autenticado con todas las relaciones necesarias
   * Método optimizado para el frontend que incluye relaciones anidadas completas
   * @param usuarioId ID del usuario autenticado
   * @returns Lista de reservas con todas las relaciones necesarias para el frontend
   */
  async findByUsuarioCompleto(usuarioId: string): Promise<Reserva[]> {
    console.log('🔍 Obteniendo reservas para usuario:', usuarioId);
    
    const reservas = await this.reservaRepository.find({
      where: { turista: { id: usuarioId } },
      relations: [
        "hospedaje",
        "hospedaje.imagenes",
        "turista",
        "lineas",
        "lineas.habitacion",
        "lineas.habitacion.tipoHabitacion",
        "lineas.habitacion.imagenes",
        "huespedes",
        "pagos"
      ],
      order: { createdAt: 'DESC' }
    });

    console.log('📄 Reservas encontradas:', reservas.length);
    return reservas;
  }

  /**
   * Verifica un código QR de reserva y retorna todos los datos necesarios para check-in
   * @param dto Datos del QR a verificar
   * @returns Datos completos verificados del QR para el proceso de check-in
   */
  async verificarQr(dto: VerificarQrDto) {
    try {
      console.log('🔍 Verificando QR optimizado, longitud de datos:', dto.qrData.length);
      
      const qrPayload = await this.qrCodeService.verificarQrReserva(dto.qrData);
      
      if (!qrPayload) {
        throw new BadRequestException('Código QR inválido o expirado');
      }

      console.log('✅ QR optimizado decodificado exitosamente, reservaId:', qrPayload.reservaId);
      console.log('📊 QR contiene solo:', Object.keys(qrPayload));

      // Buscar la reserva completa con todas las relaciones
      const reserva = await this.reservaRepository.findOne({
        where: { id: qrPayload.reservaId },
        relations: [
          'hospedaje',
          'turista', 
          'lineas', 
          'lineas.habitacion', 
          'lineas.habitacion.tipoHabitacion',
          'pagos',
          'pagos.tarjeta',
          'huespedes'
        ]
      });

      if (!reserva) {
        throw new NotFoundException('Reserva no encontrada en la base de datos');
      }

      // Verificar que la reserva está en estado válido para check-in
      if (![EstadoReserva.CONFIRMADA, EstadoReserva.PAGADA].includes(reserva.estado)) {
        throw new BadRequestException(
          `La reserva debe estar confirmada o pagada para realizar check-in. Estado actual: ${reserva.estado}`
        );
      }

      // Verificar si es el día de check-in o posterior
      const hoy = new Date();
      const fechaCheckIn = new Date(reserva.fechaInicio);
      hoy.setHours(0, 0, 0, 0);
      fechaCheckIn.setHours(0, 0, 0, 0);

      if (fechaCheckIn > hoy) {
        throw new BadRequestException('El check-in solo puede realizarse el día de la reserva o posterior');
      }

      // Verificar si ya se realizó check-in
      if (reserva.estado === EstadoReserva.CHECK_IN) {
        throw new BadRequestException('Esta reserva ya tiene check-in realizado');
      }

            // Calcular número de noches
      const fechaInicioDate = new Date(reserva.fechaInicio);
      const fechaFinDate = new Date(reserva.fechaFin);
      const noches = Math.ceil((fechaFinDate.getTime() - fechaInicioDate.getTime()) / (1000 * 60 * 60 * 24));

      // Procesar habitaciones desde la BD
      const habitacionesParaCheckin = reserva.lineas.map(linea => ({
        id: linea.habitacion.id,
        nombre: linea.habitacion.nombre,
        capacidad: linea.habitacion.capacidad,
        personasReservadas: linea.personas,
        huespedes: [] // Se llenarán en el step 2
      }));

      // Procesar datos de pago existente desde la BD
      let pagoExistente: any = null;
      const pagoAprobado = reserva.pagos?.find(p => p.estado === 'APROBADO');
      if (pagoAprobado && pagoAprobado.tarjeta) {
        pagoExistente = {
          id: pagoAprobado.id,
          titular: pagoAprobado.tarjeta.titular || `${reserva.turista.nombre} ${reserva.turista.apellido}`,
          numeroMasked: pagoAprobado.tarjeta.numero ? `****-****-****-${pagoAprobado.tarjeta.numero.slice(-4)}` : '****-****-****-****',
          entidad: pagoAprobado.tarjeta.entidad || 'N/A'
        };
      }

      // Retornar estructura completa esperada por el frontend
      return {
        qrValido: true,
        reservaCompleta: {
          reserva: {
            id: reserva.id,
            codigo: reserva.id.substring(0, 8).toUpperCase(),
            hospedaje: reserva.hospedaje.nombre,
            fechaInicio: reserva.fechaInicio,
            fechaFin: reserva.fechaFin,
            noches,
            montoTotal: reserva.montoTotal,
            estado: reserva.estado
          },
          titular: {
            nombre: reserva.turista.nombre,
            apellido: reserva.turista.apellido,
            dni: reserva.turista.dni?.toString() || '',
            telefono: reserva.turista.telefono?.toString() || '',
            email: reserva.turista.email || ''
          },
          habitaciones: habitacionesParaCheckin,
          pagoExistente
        }
      };
    } catch (error) {
      console.error('❌ Error verificando QR:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error verificando código QR: ' + error.message);
    }
  }

  /**
   * Realiza el check-in de una reserva con todos los huéspedes
   * @param dto Datos del check-in incluido el QR y huéspedes
   * @returns Reserva actualizada con estado CHECK_IN
   */
  async realizarCheckin(dto: RealizarCheckinDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verificar QR nuevamente
      const qrPayload = await this.qrCodeService.verificarQrReserva(dto.qrData);
      if (!qrPayload || qrPayload.reservaId !== dto.reservaId) {
        throw new BadRequestException('Código QR inválido');
      }

      // Obtener la reserva
      const reserva = await queryRunner.manager.findOne(Reserva, {
        where: { id: dto.reservaId },
        relations: ['hospedaje', 'turista', 'lineas', 'huespedes']
      });

      if (!reserva) {
        throw new NotFoundException('Reserva no encontrada');
      }

      // Validaciones finales
      if (![EstadoReserva.CONFIRMADA, EstadoReserva.PAGADA].includes(reserva.estado)) {
        throw new BadRequestException('La reserva debe estar confirmada o pagada');
      }

      if (reserva.estado === EstadoReserva.CHECK_IN) {
        throw new BadRequestException('Esta reserva ya tiene check-in realizado');
      }

      // Verificar fecha de check-in
      const hoy = new Date();
      const fechaCheckIn = new Date(reserva.fechaInicio);
      hoy.setHours(0, 0, 0, 0);
      fechaCheckIn.setHours(0, 0, 0, 0);

      if (fechaCheckIn > hoy) {
        throw new BadRequestException('El check-in solo puede realizarse el día de la reserva o posterior');
      }

      // Registrar huésped principal (quien hizo la reserva)
      const huespedPrincipal = new HuespedReserva();
      huespedPrincipal.reserva = reserva;
      huespedPrincipal.nombre = reserva.turista.nombre;
      huespedPrincipal.apellido = reserva.turista.apellido;
      huespedPrincipal.dni = reserva.turista.dni?.toString() || '';
      huespedPrincipal.telefono = reserva.turista.telefono?.toString();
      huespedPrincipal.email = reserva.turista.email;
      huespedPrincipal.esPrincipal = true;
      huespedPrincipal.fechaCheckin = new Date();
      await queryRunner.manager.save(huespedPrincipal);

      // Registrar huéspedes adicionales
      for (const huespedDto of dto.huespedes) {
        const huesped = new HuespedReserva();
        huesped.reserva = reserva;
        huesped.nombre = huespedDto.nombre;
        huesped.apellido = huespedDto.apellido;
        huesped.dni = huespedDto.dni;
        huesped.telefono = huespedDto.telefono;
        huesped.email = huespedDto.email;
        huesped.esPrincipal = false;
        huesped.fechaCheckin = new Date();
        await queryRunner.manager.save(huesped);
      }

      // Cambiar estado de la reserva a CHECK_IN
      reserva.estado = EstadoReserva.CHECK_IN;
      await queryRunner.manager.save(reserva);

      await queryRunner.commitTransaction();

      console.log(`✅ Check-in realizado para reserva ${reserva.id}`);

      // Enviar notificación de check-in
      try {
        await this.notificacionesService.crearNotificacionAutomatica(
          'check_in',
          reserva.turista.id,
          {
            reservaId: reserva.id,
            hospedaje: reserva.hospedaje.nombre,
            hospedajeId: reserva.hospedaje.id,
            fechaCheckIn: new Date(),
          },
          ['IN_APP', 'EMAIL'],
        );
      } catch (notifError) {
        console.error('Error enviando notificación de check-in:', notifError);
      }

      // Retornar reserva actualizada
      return await this.reservaRepository.findOne({
        where: { id: reserva.id },
        relations: ['hospedaje', 'turista', 'lineas', 'huespedes']
      });

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Verifica si una habitación está disponible en el rango de fechas especificado
   * NUEVA LÓGICA: El día de checkout NO se considera ocupado para nuevas reservas
   * @param habitacionId ID de la habitación a verificar
   * @param fechaInicio Fecha de inicio del periodo a verificar
   * @param fechaFin Fecha de fin del periodo a verificar
   * @returns true si está disponible, false si tiene conflictos
   */
  async verificarDisponibilidadHabitacion(
    habitacionId: string,
    fechaInicio: string | Date,
    fechaFin: string | Date,
  ): Promise<boolean> {

    // NUEVA LÓGICA: Evitar conflictos considerando que checkout libera la habitación
    // Una habitación tiene conflicto solo si:
    // 1. Hay una reserva que INICIA antes o el mismo día que nuestra reserva TERMINA, Y
    // 2. Hay una reserva que TERMINA después del día que nuestra reserva INICIA
    // 
    // Esto permite que si una reserva termina el 14/07, una nueva puede empezar el 14/07
    // porque checkout es a las 11:00 y checkin es a las 15:00
    const conflictos = await this.reservaRepository
      .createQueryBuilder('reserva')
      .innerJoin('reserva.lineas', 'linea')
      .where('linea.habitacion.id = :habitacionId', { habitacionId })
      .andWhere('reserva.estado IN (:...estados)', { 
        estados: ['CREADA', 'CONFIRMADA', 'PAGADA', 'CHECK_IN', 'CHECK_OUT'] 
      })
      // CORRECCIÓN CRÍTICA: El día de checkout (fechaFin de reserva existente) NO bloquea nuevas reservas
      .andWhere('reserva."fechaInicio" < :fechaFin', { fechaFin })  // < en lugar de <=
      .andWhere('reserva."fechaFin" > :fechaInicio', { fechaInicio })  // > en lugar de >=
      .getCount();

    const disponible = conflictos === 0;
    
    console.log('🔍 [ReservasService] Resultado disponibilidad (NUEVA LÓGICA):', {
      habitacionId,
      fechaInicio,
      fechaFin,
      conflictos,
      disponible,
      logica: 'Checkout libera habitación el mismo día'
    });

    return disponible;
  }

  /**
   * Verifica disponibilidad de múltiples habitaciones de forma eficiente
   * NUEVA LÓGICA: El día de checkout NO se considera ocupado para nuevas reservas
   * @param habitacionIds Array de IDs de habitaciones
   * @param fechaInicio Fecha de inicio del periodo
   * @param fechaFin Fecha de fin del periodo
   * @returns Map con habitacionId -> disponible (boolean)
   */
  async verificarDisponibilidadMultiplesHabitaciones(
    habitacionIds: string[],
    fechaInicio: string | Date,
    fechaFin: string | Date,
  ): Promise<Map<string, boolean>> {
    console.log('🔍 [ReservasService] Verificando disponibilidad múltiple (NUEVA LÓGICA):', {
      habitacionIds: habitacionIds.length,
      fechaInicio,
      fechaFin,
      logica: 'Checkout libera habitación el mismo día'
    });

    // Validar que hay habitaciones para verificar
    if (!habitacionIds || habitacionIds.length === 0) {
      console.log('⚠️ [ReservasService] Array de habitaciones vacío, retornando mapa vacío');
      return new Map<string, boolean>();
    }

    // Consulta todas las habitaciones con conflictos en una sola query
    // NUEVA LÓGICA: Aplicar la misma corrección que en verificarDisponibilidadHabitacion
    const habitacionesConConflicto = await this.reservaRepository
      .createQueryBuilder('reserva')
      .innerJoin('reserva.lineas', 'linea')
      .select('DISTINCT linea.habitacion.id', 'habitacionId')
      .where('linea.habitacion.id IN (:...habitacionIds)', { habitacionIds })
      .andWhere('reserva.estado IN (:...estados)', {
        estados: ['CREADA', 'CONFIRMADA', 'PAGADA', 'CHECK_IN', 'CHECK_OUT']
      })
      // CORRECCIÓN CRÍTICA: El día de checkout (fechaFin de reserva existente) NO bloquea nuevas reservas
      .andWhere('reserva."fechaInicio" < :fechaFin', { fechaFin })  // < en lugar de <=
      .andWhere('reserva."fechaFin" > :fechaInicio', { fechaInicio })  // > en lugar de >=
      .getRawMany();

    const habitacionesOcupadas = new Set(
      habitacionesConConflicto.map(h => h.habitacionId)
    );

    // Crear mapa de disponibilidad
    const disponibilidad = new Map<string, boolean>();
    habitacionIds.forEach(habitacionId => {
      disponibilidad.set(habitacionId, !habitacionesOcupadas.has(habitacionId));
    });

    console.log('🔍 [ReservasService] Resultado disponibilidad múltiple (NUEVA LÓGICA):', {
      total: habitacionIds.length,
      ocupadas: habitacionesOcupadas.size,
      disponibles: habitacionIds.length - habitacionesOcupadas.size,
      habitacionesOcupadas: Array.from(habitacionesOcupadas)
    });

    return disponibilidad;
  }

  /**
   * Convierte el enum MetodoPago a texto legible
   * @param metodo Método de pago enum
   * @returns Texto legible del método de pago
   */
  private getMetodoPagoTexto(metodo: any): string {
    switch (metodo) {
      case 'TARJETA':
        return 'Tarjeta de crédito/débito';
      case 'TRANSFERENCIA':
        return 'Transferencia bancaria';
      default:
        return 'No especificado';
    }
  }

  /**
   * Convierte el enum EstadoPago a texto legible
   * @param estado Estado de pago enum
   * @returns Texto legible del estado de pago
   */
  private getEstadoPagoTexto(estado: any): string {
    switch (estado) {
      case 'PENDIENTE':
        return 'Pendiente';
      case 'PROCESANDO':
        return 'Procesando';
      case 'APROBADO':
        return 'Pago completo';
      case 'RECHAZADO':
        return 'Rechazado';
      case 'CANCELADO':
        return 'Cancelado';
      case 'EXPIRADO':
        return 'Expirado';
      case 'FALLIDO':
        return 'Fallido';
      default:
        return 'Pendiente';
    }
  }

  /**
   * Obtiene los datos necesarios para el proceso de check-in
   * @param reservaId ID de la reserva
   * @returns Datos formateados para el wizard de check-in
   */
  async getDatosCheckin(reservaId: string): Promise<DatosCheckinResponseDto> {
    const reserva = await this.reservaRepository.findOne({
      where: { id: reservaId },
      relations: ['hospedaje', 'turista', 'lineas', 'lineas.habitacion', 'lineas.habitacion.tipoHabitacion', 'pagos']
    });

    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }

    // Validar estado
    if (![EstadoReserva.CONFIRMADA, EstadoReserva.PAGADA].includes(reserva.estado)) {
      throw new BadRequestException('La reserva debe estar confirmada o pagada para realizar check-in');
    }

    if (reserva.estado === EstadoReserva.CHECK_IN) {
      throw new BadRequestException('Esta reserva ya tiene check-in realizado');
    }

    // Obtener pago con tarjeta si existe
    const pagoConTarjeta = reserva.pagos.find(p => 
      p.metodo === 'TARJETA' && p.estado === EstadoPago.APROBADO
    );

    // Formatear habitaciones con capacidades
    const habitaciones = reserva.lineas.map(linea => ({
      id: linea.habitacion.id,
      nombre: linea.habitacion.nombre,
      capacidad: linea.habitacion.capacidad,
      personasReservadas: linea.personas,
      huespedes: [] // Se llenan en el frontend
    }));

    // Datos del titular (pre-llenados)
    const titular = {
      nombre: reserva.turista.nombre,
      apellido: reserva.turista.apellido,
      dni: reserva.turista.dni?.toString() || '',
      telefono: reserva.turista.telefono?.toString(),
      email: reserva.turista.email
    };

    return {
      reserva: {
        id: reserva.id,
        codigo: reserva.id.substring(0, 8).toUpperCase(),
        hospedaje: reserva.hospedaje.nombre,
        fechaInicio: reserva.fechaInicio,
        fechaFin: reserva.fechaFin
      },
      titular,
      habitaciones,
      pagoExistente: pagoConTarjeta ? {
        id: pagoConTarjeta.id,
        titular: pagoConTarjeta.titularEncriptado,
        numeroMasked: `****-****-****-${pagoConTarjeta.numeroEncriptado.slice(-4)}`,
        entidad: 'VISA/MASTERCARD' // Simplificado
      } : undefined
    };
  }

  /**
   * Realiza el check-in completo con wizard de 3 pasos
   * @param dto Datos completos del check-in
   * @param user Usuario que realiza el check-in
   * @returns Confirmación de check-in exitoso
   */
  async realizarCheckinCompleto(dto: CheckinCompletoDto, user: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Verificar QR
      const qrPayload = await this.qrCodeService.verificarQrReserva(dto.qrData);
      if (!qrPayload || qrPayload.reservaId !== dto.reservaId) {
        throw new BadRequestException('Código QR inválido');
      }

      // 2. Obtener reserva
      const reserva = await queryRunner.manager.findOne(Reserva, {
        where: { id: dto.reservaId },
        relations: ['hospedaje', 'turista', 'lineas', 'lineas.habitacion', 'pagos']
      });

      if (!reserva) {
        throw new NotFoundException('Reserva no encontrada');
      }

      if (reserva.estado === EstadoReserva.CHECK_IN) {
        throw new BadRequestException('Esta reserva ya tiene check-in realizado');
      }

      if (![EstadoReserva.CONFIRMADA, EstadoReserva.PAGADA].includes(reserva.estado)) {
        throw new BadRequestException('La reserva debe estar confirmada o pagada');
      }

      // 3. Validar huéspedes por habitación
      await this.validarHuespedesPorHabitacion(reserva, dto.huespedesPorHabitacion);

      // 4. Procesar datos de pago
      await this.procesarDatosPagoCheckin(reserva, dto.datosPago, queryRunner);

      // 5. Crear registros HuespedReserva
      await this.crearHuespedesReserva(reserva, dto.huespedesPorHabitacion, queryRunner);

      // 6. Cambiar estado
      reserva.estado = EstadoReserva.CHECK_IN;
      await queryRunner.manager.save(reserva);

      await queryRunner.commitTransaction();
      
      console.log(`✅ Check-in completo realizado para reserva ${reserva.id} por usuario ${user.nombre}`);

      return { 
        success: true, 
        message: 'Check-in realizado exitosamente',
        reservaId: reserva.id,
        codigo: reserva.id.substring(0, 8).toUpperCase()
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ Error en check-in completo:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Valida que los huéspedes asignados coincidan con las habitaciones reservadas
   */
  private async validarHuespedesPorHabitacion(
    reserva: Reserva, 
    huespedesPorHabitacion: HuespedPorHabitacionDto[]
  ) {
    for (const habitacionData of huespedesPorHabitacion) {
      const linea = reserva.lineas.find(l => l.habitacion.id === habitacionData.habitacionId);
      
      if (!linea) {
        throw new BadRequestException(`Habitación ${habitacionData.habitacionId} no pertenece a esta reserva`);
      }

      if (habitacionData.huespedes.length !== linea.personas) {
        throw new BadRequestException(
          `Habitación ${habitacionData.habitacionNombre} requiere ${linea.personas} huéspedes, recibió ${habitacionData.huespedes.length}`
        );
      }
    }

    // Validar total de huéspedes
    const totalHuespedes = huespedesPorHabitacion.reduce((total, h) => total + h.huespedes.length, 0);
    const totalPersonasReservadas = reserva.lineas.reduce((total, l) => total + l.personas, 0);
    
    if (totalHuespedes !== totalPersonasReservadas) {
      throw new BadRequestException('El número total de huéspedes no coincide con la reserva');
    }
  }

  /**
   * Procesa los datos de pago para el check-in
   */
  private async procesarDatosPagoCheckin(
    reserva: Reserva, 
    datosPago: DatosPagoCheckinDto, 
    queryRunner: any
  ) {
    if (datosPago.usarPagoExistente && datosPago.pagoExistenteId) {
      // Copiar datos del pago existente
      const pagoExistente = await queryRunner.manager.findOne(Pago, {
        where: { id: datosPago.pagoExistenteId, reserva: { id: reserva.id } }
      });

      if (!pagoExistente) {
        throw new BadRequestException('Pago no encontrado para esta reserva');
      }

      const tarjetaCheckin = queryRunner.manager.create(TarjetaCheckin, {
        reserva,
        titular: pagoExistente.titularEncriptado,
        numero: pagoExistente.numeroEncriptado,
        entidad: 'VISA', // Simplificado
        vencimiento: pagoExistente.vencimientoEncriptado,
        cve: pagoExistente.cveEncriptado,
        tipo: 'CREDITO'
      });

      await queryRunner.manager.save(tarjetaCheckin);
      console.log(`💳 Tarjeta check-in creada desde pago existente para reserva ${reserva.id}`);

    } else if (datosPago.nuevaTarjeta) {
      // Validar nueva tarjeta
      const tarjetaValida = await this.tarjetasService.findActiveExact({
        numero: datosPago.nuevaTarjeta.numero,
        titular: datosPago.nuevaTarjeta.titular,
        vencimiento: datosPago.nuevaTarjeta.vencimiento,
        cve: datosPago.nuevaTarjeta.cve,
        tipo: datosPago.nuevaTarjeta.tipo,
        entidad: datosPago.nuevaTarjeta.entidad
      });

      if (!tarjetaValida) {
        throw new BadRequestException('Tarjeta no válida o no encontrada en el sistema');
      }

      const tarjetaCheckin = queryRunner.manager.create(TarjetaCheckin, {
        reserva,
        ...datosPago.nuevaTarjeta
      });

      await queryRunner.manager.save(tarjetaCheckin);
      console.log(`💳 Tarjeta check-in creada con nueva tarjeta para reserva ${reserva.id}`);
    } else {
      throw new BadRequestException('Debe proporcionar datos de pago válidos');
    }
  }

  /**
   * Crea los registros de HuespedReserva por habitación
   */
  private async crearHuespedesReserva(
    reserva: Reserva, 
    huespedesPorHabitacion: HuespedPorHabitacionDto[], 
    queryRunner: any
  ) {
    // Crear titular (primer huésped de primera habitación)
    const primeraHabitacion = huespedesPorHabitacion[0];
    const titular = queryRunner.manager.create(HuespedReserva, {
      reserva,
      habitacion: { id: primeraHabitacion.habitacionId },
      nombre: reserva.turista.nombre,
      apellido: reserva.turista.apellido,
      dni: reserva.turista.dni?.toString() || '',
      telefono: reserva.turista.telefono?.toString(),
      email: reserva.turista.email,
      esPrincipal: true,
      fechaCheckin: new Date()
    });
    await queryRunner.manager.save(titular);

    // Crear acompañantes
    for (const habitacionData of huespedesPorHabitacion) {
      for (const [index, huespedDto] of habitacionData.huespedes.entries()) {
        // Saltar el primer huésped de la primera habitación (ya es el titular)
        if (habitacionData === primeraHabitacion && index === 0) continue;

        const huesped = queryRunner.manager.create(HuespedReserva, {
          reserva,
          habitacion: { id: habitacionData.habitacionId },
          nombre: huespedDto.nombre,
          apellido: huespedDto.apellido,
          dni: huespedDto.dni,
          telefono: huespedDto.telefono,
          email: huespedDto.email,
          esPrincipal: false,
          fechaCheckin: new Date()
        });
        await queryRunner.manager.save(huesped);
      }
    }

    console.log(`👥 Huéspedes registrados para reserva ${reserva.id} en ${huespedesPorHabitacion.length} habitaciones`);
  }

  /**
   * Obtiene la lista de check-ins realizados para el usuario administrativo
   * @param user Usuario que hace la petición
   * @returns Lista de reservas con check-in realizado
   */
  async getCheckinsRealizados(user: any) {
    try {
      console.log('🔍 Obteniendo check-ins realizados para usuario:', user.nombre);

      // Obtener reservas con estado CHECK_IN que puede administrar el usuario
      let reservas: Reserva[];

      if (user.roles.includes('ADMIN')) {
        // Admin puede ver todos los check-ins
        reservas = await this.reservaRepository.find({
          where: { estado: EstadoReserva.CHECK_IN },
          relations: [
            'hospedaje',
            'turista',
            'lineas',
            'lineas.habitacion',
            'huespedes'
          ],
          order: { updatedAt: 'DESC' }
        });
      } else {
        // Otros roles solo pueden ver check-ins de sus hospedajes administrados
        reservas = await this.findReservasByAdministrador(user.id);
        reservas = reservas.filter(r => r.estado === EstadoReserva.CHECK_IN);
      }

      // Formatear datos para el frontend
      const checkinsFormateados = reservas.map(reserva => {
        const totalHuespedes = reserva.huespedes?.length || 0;
        const habitaciones = reserva.lineas?.length || 0;

        // Buscar el huésped principal para obtener quién realizó el check-in
        const huespedPrincipal = reserva.huespedes?.find(h => h.esPrincipal);
        const realizadoPor = huespedPrincipal 
          ? `${huespedPrincipal.nombre} ${huespedPrincipal.apellido}`
          : 'Sistema';

        return {
          id: reserva.id,
          reservaId: reserva.id,
          codigo: reserva.id.substring(0, 8).toUpperCase(),
          hospedaje: reserva.hospedaje?.nombre || 'N/A',
          titular: `${reserva.turista?.nombre || ''} ${reserva.turista?.apellido || ''}`.trim(),
          fechaCheckin: huespedPrincipal?.fechaCheckin || reserva.updatedAt,
          habitaciones,
          totalHuespedes,
          realizadoPor: `${realizadoPor} (Check-in)`,
          estado: reserva.estado
        };
      });

      console.log(`✅ ${checkinsFormateados.length} check-ins encontrados`);

      return {
        success: true,
        data: checkinsFormateados,
        message: 'Check-ins obtenidos exitosamente'
      };

    } catch (error) {
      console.error('❌ Error obteniendo check-ins realizados:', error);
      return {
        success: false,
        data: [],
        message: 'Error al obtener check-ins realizados'
      };
    }
  }

  /**
   * Obtiene datos completos de una reserva para el proceso de checkout
   * @param reservaId ID de la reserva
   * @returns Datos completos estructurados para el frontend
   */
  async getDatosCheckout(reservaId: string): Promise<DatosCheckoutResponseDto> {
    const reserva = await this.reservaRepository.findOne({
      where: { id: reservaId },
      relations: [
        'hospedaje',
        'turista', 
        'lineas',
        'lineas.habitacion',
        'lineas.habitacion.tipoHabitacion',
        'pagos',
        'pagos.tarjeta',
        'huespedes',
        'huespedes.habitacion'
      ]
    });

    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (reserva.estado !== EstadoReserva.CHECK_IN) {
      throw new BadRequestException('Solo se puede hacer checkout de reservas con check-in realizado');
    }

    // Calcular noches
    const fechaInicio = new Date(reserva.fechaInicio);
    const fechaFin = new Date(reserva.fechaFin);
    const totalNoches = Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));

    // Organizar huéspedes por habitación
    const habitacionesMap = new Map();
    
    reserva.lineas.forEach(linea => {
      if (!habitacionesMap.has(linea.habitacion.id)) {
        habitacionesMap.set(linea.habitacion.id, {
          id: linea.habitacion.id,
          nombre: linea.habitacion.nombre,
          capacidad: linea.habitacion.capacidad,
          personasRegistradas: 0,
          huespedes: []
        });
      }
    });

    // Agregar huéspedes a sus habitaciones
    reserva.huespedes.forEach(huesped => {
      if (huesped.habitacion) {
        const habitacion = habitacionesMap.get(huesped.habitacion.id);
        if (habitacion) {
          habitacion.huespedes.push({
            nombre: huesped.nombre,
            apellido: huesped.apellido,
            dni: huesped.dni,
            telefono: huesped.telefono,
            email: huesped.email
          });
          habitacion.personasRegistradas++;
        }
      }
    });

    // Formatear pagos
    const pagosFormateados = reserva.pagos.map(pago => ({
      id: pago.id,
      concepto: 'Reserva de hospedaje', // Concepto base
      monto: pago.montoTotal,
      estado: pago.estado,
      fechaPago: pago.fechaPago,
      titularMasked: pago.tarjeta ? pago.tarjeta.titular : undefined,
      numeroMasked: pago.tarjeta ? `****${pago.tarjeta.numero.slice(-4)}` : undefined
    }));

    return {
      reserva: {
        id: reserva.id,
        codigo: reserva.id.substring(0, 8).toUpperCase(),
        hospedaje: reserva.hospedaje.nombre,
        fechaInicio: reserva.fechaInicio,
        fechaFin: reserva.fechaFin,
        fechaCheckin: reserva.updatedAt, // Fecha de última actualización
        estado: reserva.estado,
        observaciones: reserva.observacion
      },
      titular: {
        nombre: reserva.turista.nombre,
        apellido: reserva.turista.apellido,
        dni: reserva.turista.dni?.toString() || '',
        telefono: reserva.turista.telefono?.toString(),
        email: reserva.turista.email
      },
      habitaciones: Array.from(habitacionesMap.values()),
      pagos: pagosFormateados,
      totalNoches,
      totalHuespedes: reserva.huespedes.length
    };
  }

  /**
   * Confirma el checkout con cargos adicionales
   * @param reservaId ID de la reserva
   * @param dto Datos del checkout con cargos adicionales
   * @param user Usuario que realiza el checkout
   * @returns Resultado del checkout
   */
  async confirmarCheckout(reservaId: string, dto: ConfirmarCheckoutDto, user: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Verificar que la reserva existe y está en CHECK_IN
      const reserva = await this.reservaRepository.findOne({
        where: { id: reservaId },
        relations: ['turista', 'hospedaje', 'pagos']
      });

      if (!reserva) {
        throw new NotFoundException('Reserva no encontrada');
      }

      if (reserva.estado !== EstadoReserva.CHECK_IN) {
        throw new BadRequestException('Solo se puede hacer checkout de reservas con check-in realizado');
      }

      // 2. Buscar tarjeta de check-in para reutilizar
      const tarjetaCheckin = await this.tarjetaCheckinRepository.findOne({
        where: { reserva: { id: reservaId } }
      });

      // 3. Procesar cargos adicionales si existen
      if (dto.cargosAdicionales && dto.cargosAdicionales.length > 0) {
        console.log(`💳 Procesando ${dto.cargosAdicionales.length} cargos adicionales para reserva ${reservaId}`);
        
        for (const cargo of dto.cargosAdicionales) {
          if (cargo.monto > 0) { // Solo procesar cargos con monto > 0
            // Crear pago adicional
            await this.pagosService.createPago({
              reservaId: reservaId,
              metodo: MetodoPago.TARJETA,
              montoReserva: cargo.monto,
              montoImpuestos: 0,
              montoTotal: cargo.monto,
              // Reutilizar datos de tarjeta del check-in
              tarjeta: tarjetaCheckin ? {
                numero: tarjetaCheckin.numero,
                titular: tarjetaCheckin.titular,
                vencimiento: tarjetaCheckin.vencimiento,
                cve: tarjetaCheckin.cve,
                entidad: tarjetaCheckin.entidad,
                tipo: tarjetaCheckin.tipo
              } : undefined,
              metadatos: {
                concepto: cargo.concepto,
                descripcion: cargo.descripcion,
                esCargoAdicional: true
              }
            }, user.id);

            console.log(`✅ Cargo adicional creado: ${cargo.concepto} - $${cargo.monto}`);
          }
        }
      }

      // 4. Ejecutar checkout estándar
      const checkoutResult = await this.registrarCheckOut(reservaId, {
        observaciones: dto.observaciones
      });

      await queryRunner.commitTransaction();

      console.log(`✅ Checkout confirmado para reserva ${reservaId} con ${dto.cargosAdicionales?.length || 0} cargos adicionales`);

      return {
        success: true,
        message: 'Checkout realizado exitosamente',
        reservaId: reservaId,
        codigo: reserva.id.substring(0, 8).toUpperCase(),
        cargosAdicionales: dto.cargosAdicionales?.length || 0,
        montoTotal: dto.cargosAdicionales?.reduce((sum, cargo) => sum + cargo.monto, 0) || 0
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ Error en checkout confirmado:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Cancela una reserva desde el panel administrativo
   * Solo administradores, propietarios o empleados pueden cancelar reservas
   */
  async cancelarReservaAdmin(
    reservaId: string,
    dto: CancelarReservaDto,
    adminUserId: string
  ): Promise<any> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Validar que la reserva existe
      const reserva = await manager.findOne(Reserva, {
        where: { id: reservaId },
        relations: ['turista', 'hospedaje', 'pagos']
      });

      if (!reserva) {
        throw new NotFoundException('Reserva no encontrada');
      }

      // 2. Validar que el estado actual permite cancelación
      const estadosPermitidos = [
        EstadoReserva.CREADA,
        EstadoReserva.PENDIENTE_PAGO,
        EstadoReserva.PAGADA,
        EstadoReserva.CONFIRMADA,
        EstadoReserva.CHECK_IN
      ];

      if (!estadosPermitidos.includes(reserva.estado)) {
        throw new BadRequestException(
          `No se puede cancelar una reserva en estado ${reserva.estado}`
        );
      }

      // 3. Procesar cambios de estado de pagos según lógica de negocio
      for (const pago of reserva.pagos) {
        let nuevoEstadoPago: EstadoPago;
        
        if (pago.estado === EstadoPago.APROBADO) {
          // Si está APROBADO = dinero ya cobrado → REINTEGRADO
          nuevoEstadoPago = EstadoPago.REINTEGRADO;
        } else if (pago.estado === EstadoPago.PENDIENTE || pago.estado === EstadoPago.PROCESANDO) {
          // Si está PENDIENTE/PROCESANDO = dinero no cobrado → CANCELADO
          nuevoEstadoPago = EstadoPago.CANCELADO;
        } else {
          // Si ya está CANCELADO, RECHAZADO, etc. → no cambiar
          continue;
        }

        // Actualizar estado del pago
        await manager.update(Pago, pago.id, { estado: nuevoEstadoPago });

        // Crear historial con información del admin
        await manager.save(HistorialEstadoPago, {
          pago: { id: pago.id },
          estadoAnterior: pago.estado,
          estadoNuevo: nuevoEstadoPago,
          motivo: `Cancelado por administrador: ${dto.motivo}`,
          usuario: { id: adminUserId },
          metadatos: {
            canceladoPor: dto.canceladoPor || 'ADMIN',
            adminUserId,
            reservaId
          },
          timestamp: new Date()
        });
      }

      // 4. Actualizar estado de la reserva
      await manager.update(Reserva, reservaId, { estado: EstadoReserva.CANCELADA });

      // 5. Notificación condicional al turista
      if (dto.notificarTurista !== false) {
        try {
          await this.notificacionesService.crearNotificacionAutomatica(
            "reserva_cancelada",
            reserva.turista.id,
            { 
              reservaId, 
              motivo: dto.motivo,
              hospedajeNombre: reserva.hospedaje.nombre,
              adminUserId
            }
          );
        } catch (error) {
          console.error('Error enviando notificación:', error);
          // No fallar la cancelación por error de notificación
        }
      }

      // 6. Retornar reserva actualizada
      return this.findOne(reservaId);
    });
  }
}
