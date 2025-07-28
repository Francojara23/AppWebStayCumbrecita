import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { HabitacionEntity } from './entidades/habitacion.entity';
import { TipoHabitacionEntity } from './entidades/tipo-habitacion.entity';
import { ImagenHabitacionEntity } from './entidades/imagen-habitacion.entity';
import { CreateHabitacionDto } from './dto/create-habitacion.dto';
import { UpdateHabitacionDto } from './dto/update-habitacion.dto';
import { FindHabitacionesDto } from './dto/find-habitaciones.dto';
import { QueryDisponibilidadDto } from './dto/query-disponibilidad.dto';
import { QueryDisponibilidadMesDto } from './dto/query-disponibilidad-mes.dto';
import { QueryDisponibilidadMesesDto } from './dto/query-disponibilidad-meses.dto';
import { DisponibilidadMensualResponseDto, DisponibilidadMultipleMesesResponseDto, HabitacionDisponibilidadMensualDto } from './dto/disponibilidad-mensual-response.dto';
import { PrecioBaseDto } from './dto/precio-base.dto';
import { AjustePrecioDto } from './dto/ajuste-precio.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';
import { HospedajesService } from '../hospedajes/hospedajes.service';
import { EmpleadosService } from '../empleados/empleados.service';
import { TipoAjustePrecio } from '../common/enums/tipo-ajuste-precio.enum';
import { ImagesService } from '../uploads/images/images.service';
import { ReservasService } from '../reservas/reservas.service';

/**
 * Servicio que maneja la lógica de negocio relacionada con las habitaciones
 * Incluye operaciones CRUD, búsquedas, gestión de disponibilidad y manejo de imágenes
 */
@Injectable()
export class HabitacionesService {
  constructor(
    @InjectRepository(HabitacionEntity)
    private habitacionesRepository: Repository<HabitacionEntity>,
    @InjectRepository(TipoHabitacionEntity)
    private tiposHabitacionRepository: Repository<TipoHabitacionEntity>,
    @InjectRepository(ImagenHabitacionEntity)
    private imagenesHabitacionRepository: Repository<ImagenHabitacionEntity>,
    private hospedajesService: HospedajesService,
    private empleadosService: EmpleadosService,
    private imagesService: ImagesService,
    @Inject(forwardRef(() => ReservasService))
    private reservasService: ReservasService,
  ) {}

  /**
   * Crea una nueva habitación en un hospedaje específico
   * @param hospedajeId ID del hospedaje donde se creará la habitación
   * @param createHabitacionDto Datos de la habitación a crear
   * @param userId ID del usuario que crea la habitación
   * @param userRole Rol del usuario que crea la habitación
   * @returns Habitación creada con sus relaciones
   */
  async create(hospedajeId: string, createHabitacionDto: CreateHabitacionDto, userId: number, userRole: string): Promise<HabitacionEntity> {
    // Verificar que el hospedaje existe y el usuario tiene permisos
    const hospedaje = await this.hospedajesService.findOne(hospedajeId);
    
    // Verificar permisos usando validación granular
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(
      hospedajeId,
      String(userId),
      userRole
    );

    if (!tienePermisos) {
      throw new ForbiddenException('No tienes permiso para crear habitaciones en este hospedaje');
    }

    // Verificar que el tipo de habitación existe
    const tipoHabitacion = await this.tiposHabitacionRepository.findOne({
      where: { id: createHabitacionDto.tipoHabitacionId }
    });

    if (!tipoHabitacion) {
      throw new NotFoundException('Tipo de habitación no encontrado');
    }

    // Crear la habitación
    const habitacion = this.habitacionesRepository.create({
      ...createHabitacionDto,
      hospedaje: { id: hospedajeId } as any,
      tipoHabitacion: tipoHabitacion as any,
    });

    // Guardar la habitación
    const habitacionGuardada = await this.habitacionesRepository.save(habitacion);

    // Guardar las imágenes si existen
    if (createHabitacionDto.imagenes && createHabitacionDto.imagenes.length > 0) {
      const imagenes = createHabitacionDto.imagenes.map(img => 
        this.imagenesHabitacionRepository.create({
          ...img,
          habitacion: habitacionGuardada as any,
        })
      );
      await this.imagenesHabitacionRepository.save(imagenes);
    }

    return this.findOne(habitacionGuardada.id);
  }

  /**
   * Busca todas las habitaciones de un hospedaje específico
   * @param hospedajeId ID del hospedaje
   * @param page Número de página
   * @param limit Límite de resultados por página
   * @returns Lista paginada de habitaciones del hospedaje
   */
  async findAllByHospedaje(hospedajeId: string, page = 1, limit = 10) {
    const [habitaciones, total] = await this.habitacionesRepository.findAndCount({
      where: { hospedaje: { id: hospedajeId } },
      relations: ['tipoHabitacion', 'imagenes'],
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: habitaciones,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca habitaciones con filtros específicos
   * @param filters Filtros de búsqueda (fechas, precios, capacidad, tipo)
   * @returns Lista paginada de habitaciones que coinciden con los filtros
   */
  async findAll(filters: FindHabitacionesDto) {
    const { 
      page = 1, 
      limit = 10, 
      fechaInicio, 
      fechaFin, 
      precioMin, 
      precioMax, 
      capacidad,
      tipoHabitacionId 
    } = filters;

    const queryBuilder = this.habitacionesRepository.createQueryBuilder('habitacion')
      .leftJoinAndSelect('habitacion.hospedaje', 'hospedaje')
      .leftJoinAndSelect('habitacion.tipoHabitacion', 'tipoHabitacion')
      .leftJoinAndSelect('habitacion.imagenes', 'imagenes')
      .leftJoinAndSelect('habitacion.servicios', 'servicios')
      .leftJoinAndSelect('servicios.servicio', 'servicioCatalogo')
      .where('habitacion.active = :active', { active: true });

    if (fechaInicio && fechaFin) {
      // Filtro por fechas - se verifica disponibilidad más abajo
    }

    if (precioMin && precioMax) {
      queryBuilder.andWhere('habitacion.precioBase BETWEEN :precioMin AND :precioMax', 
        { precioMin, precioMax });
    }

    if (capacidad) {
      queryBuilder.andWhere('habitacion.capacidad >= :capacidad', { capacidad });
    }

    if (tipoHabitacionId) {
      queryBuilder.andWhere('habitacion.tipoHabitacion.id = :tipoHabitacionId', { tipoHabitacionId });
    }

    const [habitaciones, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: habitaciones,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca una habitación por su ID
   * @param id ID de la habitación
   * @returns Habitación encontrada con sus relaciones y ajustes de precio
   */
  async findOne(id: string): Promise<HabitacionEntity> {
    const habitacion = await this.habitacionesRepository
      .createQueryBuilder('habitacion')
      .leftJoinAndSelect('habitacion.hospedaje', 'hospedaje')
      .leftJoinAndSelect('habitacion.tipoHabitacion', 'tipoHabitacion')
      .leftJoinAndSelect('habitacion.imagenes', 'imagenes')
      .leftJoinAndSelect('habitacion.servicios', 'servicios')
      .leftJoinAndSelect('servicios.servicio', 'servicio')
      .where('habitacion.id = :id', { id })
      .getOne();

    if (!habitacion) {
      throw new NotFoundException('Habitación no encontrada');
    }

    return habitacion;
  }

  /**
   * Actualiza una habitación existente
   * @param id ID de la habitación a actualizar
   * @param updateHabitacionDto Datos a actualizar
   * @param userId ID del usuario que realiza la actualización
   * @param userRole Rol del usuario que realiza la actualización
   * @returns Habitación actualizada
   */
  async update(id: string, updateHabitacionDto: UpdateHabitacionDto, userId: number, userRole: string): Promise<HabitacionEntity> {
    const habitacion = await this.findOne(id);

    // Verificar permisos usando validación granular
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(
      habitacion.hospedaje.id,
      String(userId),
      userRole
    );

    if (!tienePermisos) {
      throw new ForbiddenException('No tienes permiso para actualizar esta habitación');
    }

    // Actualizar tipo de habitación si se proporciona
    if (updateHabitacionDto.tipoHabitacionId) {
      const tipoHabitacion = await this.tiposHabitacionRepository.findOne({
        where: { id: updateHabitacionDto.tipoHabitacionId }
      });
      if (!tipoHabitacion) {
        throw new NotFoundException('Tipo de habitación no encontrado');
      }
      habitacion.tipoHabitacion = tipoHabitacion;
    }

    // Actualizar datos básicos
    Object.assign(habitacion, updateHabitacionDto);
    return this.habitacionesRepository.save(habitacion);
  }

  /**
   * Elimina lógicamente una habitación (soft delete)
   * @param id ID de la habitación a eliminar
   * @param userId ID del usuario que realiza la eliminación
   * @param userRole Rol del usuario que realiza la eliminación
   */
  async remove(id: string, userId: number, userRole: string): Promise<void> {
    const habitacion = await this.findOne(id);

    // Verificar permisos usando validación granular
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(
      habitacion.hospedaje.id,
      String(userId),
      userRole
    );

    if (!tienePermisos) {
      throw new ForbiddenException('No tienes permiso para eliminar esta habitación');
    }

    await this.habitacionesRepository.softDelete(id);
  }

  /**
   * Obtiene todos los tipos de habitación disponibles
   * @returns Lista de tipos de habitación
   */
  async findAllTipos(): Promise<TipoHabitacionEntity[]> {
    return this.tiposHabitacionRepository.find();
  }

  /**
   * Obtiene los rangos de precio mínimo y máximo de todas las habitaciones
   * @param fechaInicio Fecha de inicio para calcular precios con ajustes (opcional)
   * @param fechaFin Fecha de fin para calcular precios con ajustes (opcional)
   * @returns Objeto con precioMinimo y precioMaximo
   */
  async getRangosPrecio(fechaInicio?: Date, fechaFin?: Date): Promise<{ precioMinimo: number; precioMaximo: number }> {
    try {
      const habitaciones = await this.habitacionesRepository.find({
        where: { active: true }
      });

      // Si no hay habitaciones, devolver valores por defecto
      if (!habitaciones || habitaciones.length === 0) {
        return {
          precioMinimo: 5000,
          precioMaximo: 50000
        };
      }

      let precios: number[] = [];

      // Si no se proporcionan fechas, usar solo precios base
      if (!fechaInicio || !fechaFin) {
        precios = habitaciones.map(h => parseFloat(h.precioBase.toString()));
      } else {
        // Calcular precios con ajustes para cada habitación en el rango de fechas
        for (const habitacion of habitaciones) {
          let fechaActual = new Date(fechaInicio);
          const fechaFinal = new Date(fechaFin);
          
          // 🔧 CORREGIDO: Excluir fecha de checkout (< en lugar de <=)
          // Ejemplo: del 23/07 al 24/07 → solo calcular precio del 23/07 (1 noche)
          while (fechaActual < fechaFinal) {
            const precioConAjustes = await this.calcularPrecioConAjustes(habitacion, fechaActual);
            precios.push(precioConAjustes);
            fechaActual.setDate(fechaActual.getDate() + 1);
          }
        }
      }

      const precioMinimo = Math.min(...precios);
      const precioMaximo = Math.max(...precios);

      return {
        precioMinimo: precioMinimo || 5000,
        precioMaximo: precioMaximo || 50000
      };
    } catch (error) {
      console.error('Error al obtener rangos de precio:', error);
      // Devolver valores por defecto en caso de error
      return {
        precioMinimo: 5000,
        precioMaximo: 50000
      };
    }
  }

  /**
   * Calcula el precio de una habitación con ajustes aplicados para una fecha específica
   * @param habitacion La habitación con sus ajustes
   * @param fecha La fecha para calcular el precio
   * @returns El precio con ajustes aplicados
   */
  private async calcularPrecioConAjustes(habitacion: any, fecha: Date): Promise<number> {
    const precioBase = parseFloat(habitacion.precioBase.toString());
    let precioFinal = precioBase;

    if (!habitacion.ajustesPrecio || habitacion.ajustesPrecio.length === 0) {
      return precioFinal;
    }

    // Función auxiliar para verificar si una fecha está en un rango
    const estaEnRango = (desde: string, hasta: string) => {
      const fechaDesde = new Date(desde);
      const fechaHasta = new Date(hasta);
      return fecha >= fechaDesde && fecha <= fechaHasta;
    };

    // Función auxiliar para verificar si es fin de semana
    const esFinDeSemana = (fecha: Date) => {
      const dia = fecha.getDay();
      return dia === 5 || dia === 6 || dia === 0; // 5 = Viernes, 6 = Sábado, 0 = Domingo
    };

    // Aplicar ajuste de temporada
    const ajusteTemporada = habitacion.ajustesPrecio.find((ajuste: any) => 
      ajuste.active && 
      ajuste.tipo === 'TEMPORADA' &&
      ajuste.desde && ajuste.hasta &&
      estaEnRango(ajuste.desde, ajuste.hasta)
    );

    if (ajusteTemporada && ajusteTemporada.incrementoPct !== undefined) {
      precioFinal *= (1 + ajusteTemporada.incrementoPct / 100);
    }

    // Aplicar ajuste de fin de semana
    if (esFinDeSemana(fecha)) {
      const ajusteFinSemana = habitacion.ajustesPrecio.find((ajuste: any) => 
        ajuste.active && 
        ajuste.tipo === 'FINDE'
      );

      if (ajusteFinSemana && ajusteFinSemana.incrementoPct !== undefined) {
        precioFinal *= (1 + ajusteFinSemana.incrementoPct / 100);
      }
    }

    return Math.round(precioFinal * 100) / 100; // Redondear a 2 decimales
  }

  /**
   * Obtiene las imágenes de una habitación específica
   * @param habitacionId ID de la habitación
   * @returns Lista de imágenes de la habitación
   */
  async findImagenesByHabitacion(habitacionId: string): Promise<ImagenHabitacionEntity[]> {
    const habitacion = await this.findOne(habitacionId);
    return habitacion.imagenes;
  }

  /**
   * Busca habitaciones disponibles según los criterios especificados
   * NUEVA LÓGICA: Consulta directamente las reservas en lugar de disponibilidad_habitacion
   * @param query Criterios de búsqueda
   * @returns Lista paginada de habitaciones disponibles
   */
  async findDisponibles(query: QueryDisponibilidadDto) {
    const {
      fechaInicio,
      fechaFin,
      hospedajeId,
      tipoHabitacionId,
      personas,
      precioMin,
      precioMax,
      page = 1,
      limit = 10,
    } = query;



    const queryBuilder = this.habitacionesRepository
      .createQueryBuilder('habitacion')
      .leftJoinAndSelect('habitacion.hospedaje', 'hospedaje')
      .leftJoinAndSelect('habitacion.tipoHabitacion', 'tipoHabitacion')
      .leftJoinAndSelect('habitacion.imagenes', 'imagenes')
      .leftJoinAndSelect('habitacion.servicios', 'servicios')
      .leftJoinAndSelect('servicios.servicio', 'servicioCatalogo')
      .where('habitacion.active = :active', { active: true });

    // Filtrar por hospedaje si se especifica
    if (hospedajeId) {
      queryBuilder.andWhere('habitacion.hospedaje.id = :hospedajeId', { hospedajeId });
    }

    // Filtrar por tipo de habitación si se especifica
    if (tipoHabitacionId) {
      queryBuilder.andWhere('habitacion.tipoHabitacion.id = :tipoHabitacionId', { tipoHabitacionId });
    }

    // Filtrar por capacidad si se especifica
    if (personas) {
      queryBuilder.andWhere('habitacion.capacidad >= :personas', { personas });
    }

    // Filtrar por precio base si se especifica
    if (precioMin !== undefined) {
      queryBuilder.andWhere('habitacion.precioBase >= :precioMin', { precioMin });
    }
    if (precioMax !== undefined) {
      queryBuilder.andWhere('habitacion.precioBase <= :precioMax', { precioMax });
    }

    // Obtener todas las habitaciones que cumplen los criterios básicos (sin filtrar por fechas)
    const [todasHabitaciones] = await queryBuilder
      .getManyAndCount();



    let habitacionesDisponibles = todasHabitaciones;

    // NUEVA LÓGICA: Usar ReservasService para verificar disponibilidad
    if (fechaInicio && fechaFin) {
      // Obtener IDs de todas las habitaciones
      const habitacionIds = todasHabitaciones.map(h => h.id);
      
      // Verificar disponibilidad usando ReservasService
      const mapaDisponibilidad = await this.reservasService.verificarDisponibilidadMultiplesHabitaciones(
        habitacionIds,
        fechaInicio,
        fechaFin
      );

      // Filtrar solo las habitaciones disponibles
      habitacionesDisponibles = todasHabitaciones.filter(habitacion => 
        mapaDisponibilidad.get(habitacion.id) === true
      );
    }

    // Aplicar paginación a las habitaciones disponibles
    const total = habitacionesDisponibles.length;
    const habitacionesPaginadas = habitacionesDisponibles.slice(
      (page - 1) * limit,
      page * limit
    );



    return {
      data: habitacionesPaginadas,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca habitaciones disponibles en un hospedaje específico
   * @param hospedajeId ID del hospedaje
   * @param query Criterios de búsqueda
   * @returns Lista paginada de habitaciones disponibles
   */
  async findDisponiblesByHospedaje(hospedajeId: string, query: QueryDisponibilidadDto) {
    // Verificar que el hospedaje existe
    await this.hospedajesService.findOne(hospedajeId);

    // Agregar el ID del hospedaje a la query
    const queryWithHospedaje = {
      ...query,
      hospedajeId,
    };

    return this.findDisponibles(queryWithHospedaje);
  }



  async setPrecioBase(id: string, dto: PrecioBaseDto, userId: number, userRole: string): Promise<HabitacionEntity> {
    const habitacion = await this.findOne(id);
    
    // Verificar permisos usando validación granular
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(
      habitacion.hospedaje.id,
      String(userId),
      userRole
    );

    if (!tienePermisos) {
      throw new ForbiddenException('No tienes permiso para actualizar esta habitación');
    }

    habitacion.precioBase = dto.precioBase;
    return this.habitacionesRepository.save(habitacion);
  }

  async addAjuste(id: string, dto: AjustePrecioDto, userId: number, userRole: string): Promise<HabitacionEntity> {
    const habitacion = await this.findOne(id);
    
    // Verificar permisos usando validación granular
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(
      habitacion.hospedaje.id,
      String(userId),
      userRole
    );

    if (!tienePermisos) {
      throw new ForbiddenException('No tienes permiso para actualizar esta habitación');
    }

    const ajuste = {
      tipo: dto.tipoRegla,
      desde: dto.fechaDesde,
      hasta: dto.fechaHasta,
      incrementoPct: dto.incrementoPct,
      active: true
    };

    habitacion.ajustesPrecio = [...(habitacion.ajustesPrecio || []), ajuste];
    return this.habitacionesRepository.save(habitacion);
  }

  async updateAjuste(id: string, idx: number, dto: AjustePrecioDto, userId: number, userRole: string): Promise<HabitacionEntity> {
    const habitacion = await this.findOne(id);
    
    // Verificar permisos usando validación granular
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(
      habitacion.hospedaje.id,
      String(userId),
      userRole
    );

    if (!tienePermisos) {
      throw new ForbiddenException('No tienes permiso para actualizar esta habitación');
    }

    if (!habitacion.ajustesPrecio || idx >= habitacion.ajustesPrecio.length) {
      throw new NotFoundException('Ajuste no encontrado');
    }

    habitacion.ajustesPrecio[idx] = {
      tipo: dto.tipoRegla,
      desde: dto.fechaDesde,
      hasta: dto.fechaHasta,
      incrementoPct: dto.incrementoPct,
      active: true
    };

    return this.habitacionesRepository.save(habitacion);
  }

  async deleteAjuste(id: string, idx: number, userId: number, userRole: string): Promise<HabitacionEntity> {
    const habitacion = await this.findOne(id);
    
    // Verificar permisos usando validación granular
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(
      habitacion.hospedaje.id,
      String(userId),
      userRole
    );

    if (!tienePermisos) {
      throw new ForbiddenException('No tienes permiso para actualizar esta habitación');
    }

    if (!habitacion.ajustesPrecio || idx >= habitacion.ajustesPrecio.length) {
      throw new NotFoundException('Ajuste no encontrado');
    }

    habitacion.ajustesPrecio.splice(idx, 1);
    return this.habitacionesRepository.save(habitacion);
  }

  async getPrecioPorFecha(id: string, fecha: Date): Promise<number> {
    const habitacion = await this.findOne(id);
    const precioBase = habitacion.precioBase;
    let precioFinal = precioBase;

    // Función auxiliar para verificar si una fecha está en un rango
    const estaEnRango = (desde: Date, hasta: Date) => {
      return fecha >= desde && fecha <= hasta;
    };

    // Función auxiliar para verificar si es fin de semana
    const esFinDeSemana = (fecha: Date) => {
      const dia = fecha.getDay();
      return dia === 5 || dia === 6 || dia === 0; // 5 = Viernes, 6 = Sábado, 0 = Domingo
    };

    // Función auxiliar para verificar si es fin de semana largo
    const esFinDeSemanaLargo = async (fecha: Date) => {
      // Aquí deberías implementar la lógica para detectar fines de semana largos
      // Por ejemplo, consultando una tabla de feriados o fechas especiales
      return false; // Por ahora retornamos false
    };

    // Aplicar ajuste de temporada (manejar tanto TEMPORADA como TEMPORADA_ALTA/BAJA)
    const ajusteTemporada = habitacion.ajustesPrecio?.find(ajuste => 
      ajuste.active && 
      (ajuste.tipo as string === 'TEMPORADA' ||
       ajuste.tipo === TipoAjustePrecio.TEMPORADA_ALTA || 
       ajuste.tipo === TipoAjustePrecio.TEMPORADA_BAJA) &&
      ajuste.desde && ajuste.hasta &&
      estaEnRango(new Date(ajuste.desde), new Date(ajuste.hasta))
    );

    if (ajusteTemporada && ajusteTemporada.incrementoPct !== undefined) {
      precioFinal *= (1 + ajusteTemporada.incrementoPct / 100);
    }

    // Aplicar ajuste de fin de semana (manejar tanto FINDE como FIN_DE_SEMANA)
    if (esFinDeSemana(fecha)) {
      const ajusteFinSemana = habitacion.ajustesPrecio?.find(ajuste => 
        ajuste.active && 
        (ajuste.tipo as string === 'FINDE' || 
         ajuste.tipo === TipoAjustePrecio.FIN_DE_SEMANA ||
         ajuste.tipo === TipoAjustePrecio.FIN_DE_SEMANA_LARGO)
      );

      if (ajusteFinSemana) {
        precioFinal *= (1 + (ajusteFinSemana.incrementoPct || 0) / 100);
      }
    }

    // Aplicar ajuste de evento
    const ajusteEvento = habitacion.ajustesPrecio?.find(ajuste => 
      ajuste.active && 
      ajuste.tipo === TipoAjustePrecio.EVENTO &&
      estaEnRango(ajuste.desde || new Date(), ajuste.hasta || new Date())
    );

    if (ajusteEvento) {
      precioFinal *= (1 + (ajusteEvento.incrementoPct || 0) / 100);
    }

    // Aplicar 21% de impuestos y cargos al precio final
    precioFinal *= 1.21;

    return Math.round(precioFinal * 100) / 100; // Redondear a 2 decimales
  }

  async getCalendarioPrecios(id: string, from: Date, to: Date): Promise<Array<{ fecha: Date; precio: number }>> {
    const habitacion = await this.findOne(id);
    const fechas: Array<{ fecha: Date; precio: number }> = [];
    let fechaActual = new Date(from);

    // 🔧 CORREGIDO: Excluir fecha de checkout (< en lugar de <=)
    // Check-in: 23/07, Check-out: 24/07 → Solo calcular precio del 23/07 (1 noche)
    while (fechaActual < to) {
      const precio = await this.getPrecioPorFecha(id, fechaActual);
      fechas.push({
        fecha: new Date(fechaActual),
        precio
      });
      fechaActual.setDate(fechaActual.getDate() + 1);
    }

    return fechas;
  }

  /**
   * Busca habitaciones con disponibilidad en un mes específico
   * @param hospedajeId ID del hospedaje
   * @param query Parámetros de consulta (mes, año, paginación)
   * @returns Habitaciones con días disponibles en el mes
   */
  async findDisponibilidadMensual(
    hospedajeId: string, 
    query: QueryDisponibilidadMesDto
  ): Promise<DisponibilidadMensualResponseDto> {
    console.log('🗓️ [HabitacionesService] Buscando disponibilidad mensual:', {
      hospedajeId,
      mes: query.mes,
      anio: query.anio
    });

    // Verificar que el hospedaje existe
    await this.hospedajesService.findOne(hospedajeId);

    // Obtener todas las habitaciones del hospedaje
    const habitaciones = await this.habitacionesRepository.find({
      where: { 
        hospedaje: { id: hospedajeId },
        active: true 
      },
      relations: ['tipoHabitacion']
    });

    // Calcular fechas del mes
    const fechaInicio = new Date(query.anio, query.mes - 1, 1);
    const fechaFin = new Date(query.anio, query.mes, 0); // Último día del mes
    const diasEnMes = fechaFin.getDate();

    console.log('📅 Rango de fechas del mes:', {
      fechaInicio: fechaInicio.toISOString().split('T')[0],
      fechaFin: fechaFin.toISOString().split('T')[0],
      diasEnMes
    });

    const habitacionesConDisponibilidad: HabitacionDisponibilidadMensualDto[] = [];

    // Verificar disponibilidad para cada habitación día por día
    for (const habitacion of habitaciones) {
      const diasDisponibles: string[] = [];

              // Verificar cada día del mes
        for (let dia = 1; dia <= diasEnMes; dia++) {
          const fechaConsulta = new Date(query.anio, query.mes - 1, dia);
          const fechaConsultaStr = fechaConsulta.toISOString().split('T')[0];
        
        // Verificar disponibilidad para un solo día (check-in y check-out el mismo día)
        const disponible = await this.reservasService.verificarDisponibilidadHabitacion(
          habitacion.id,
          fechaConsultaStr,
          fechaConsultaStr
        );

        if (disponible) {
          diasDisponibles.push(fechaConsultaStr);
        }
      }

      // Solo incluir habitaciones que tienen al menos un día disponible
      if (diasDisponibles.length > 0) {
        habitacionesConDisponibilidad.push({
          habitacion_id: habitacion.id,
          nombre: habitacion.nombre || habitacion.tipoHabitacion?.nombre || 'Habitación',
          tipo_habitacion: habitacion.tipoHabitacion?.nombre || 'Sin tipo',
          dias_disponibles: diasDisponibles,
          total_dias_disponibles: diasDisponibles.length
        });
      }
    }

    const response: DisponibilidadMensualResponseDto = {
      mes: `${query.anio}-${query.mes.toString().padStart(2, '0')}`,
      año: query.anio,
      mes_numero: query.mes,
      dias_en_mes: diasEnMes,
      habitaciones_disponibles: habitacionesConDisponibilidad,
      total_habitaciones_disponibles: habitacionesConDisponibilidad.length
    };

    console.log('✅ [HabitacionesService] Disponibilidad mensual encontrada:', {
      habitacionesConDisponibilidad: habitacionesConDisponibilidad.length,
      totalHabitaciones: habitaciones.length
    });

    return response;
  }

  /**
   * Busca habitaciones con disponibilidad en múltiples meses
   * @param hospedajeId ID del hospedaje
   * @param query Parámetros de consulta (meses, paginación)
   * @returns Habitaciones con días disponibles en los meses consultados
   */
  async findDisponibilidadMultiplesMeses(
    hospedajeId: string,
    query: QueryDisponibilidadMesesDto
  ): Promise<DisponibilidadMultipleMesesResponseDto> {
    console.log('🗓️📅 [HabitacionesService] Buscando disponibilidad múltiples meses:', {
      hospedajeId,
      meses: query.meses
    });

    // Verificar que el hospedaje existe
    await this.hospedajesService.findOne(hospedajeId);

    // Parsear el string de meses manualmente
    const mesesArray = query.meses.split(',').map(mesStr => {
      const [año, mes] = mesStr.trim().split('-');
      return {
        año: parseInt(año),
        mes: parseInt(mes)
      };
    });

    const resultadosMeses: DisponibilidadMensualResponseDto[] = [];
    const habitacionesConDisponibilidadGlobal = new Set<string>();

    // Procesar cada mes individualmente
    for (const { año, mes } of mesesArray) {
      const queryMes: QueryDisponibilidadMesDto = {
        mes,
        anio: año,
        page: 1,
        limit: 100 // Sin paginación para este método
      };

      const disponibilidadMes = await this.findDisponibilidadMensual(hospedajeId, queryMes);
      resultadosMeses.push(disponibilidadMes);

      // Agregar habitaciones al conjunto global
      disponibilidadMes.habitaciones_disponibles.forEach(hab => {
        habitacionesConDisponibilidadGlobal.add(hab.habitacion_id);
      });
    }

    // Calcular resumen
    const mesesConDisponibilidad = resultadosMeses.filter(
      mes => mes.habitaciones_disponibles.length > 0
    ).length;

    const response: DisponibilidadMultipleMesesResponseDto = {
      meses: resultadosMeses,
      total_meses: mesesArray.length,
      resumen: {
        meses_con_disponibilidad: mesesConDisponibilidad,
        habitaciones_con_disponibilidad: Array.from(habitacionesConDisponibilidadGlobal)
      }
    };

    console.log('✅ [HabitacionesService] Disponibilidad múltiples meses encontrada:', {
      totalMeses: mesesArray.length,
      mesesConDisponibilidad,
      habitacionesUnicasConDisponibilidad: habitacionesConDisponibilidadGlobal.size
    });

    return response;
  }



  async updateServicio(catalogoId: string, dto: UpdateServicioDto, userId: number, userRole: string): Promise<void> {
    const habitacion = await this.habitacionesRepository
      .createQueryBuilder('habitacion')
      .leftJoinAndSelect('habitacion.hospedaje', 'hospedaje')
      .innerJoin('habitacion.servicios', 'servicio')
      .where('servicio.id = :catalogoId', { catalogoId })
      .getOne();

    if (!habitacion) {
      throw new NotFoundException('Servicio no encontrado');
    }

    // Verificar permisos usando validación granular
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(
      habitacion.hospedaje.id,
      String(userId),
      userRole
    );

    if (!tienePermisos) {
      throw new ForbiddenException('No tienes permiso para actualizar este servicio');
    }

    await this.habitacionesRepository
      .createQueryBuilder()
      .update('habitacion_servicio')
      .set(dto)
      .where('id = :catalogoId', { catalogoId })
      .execute();
  }

  /* ------------------------------------------------------------------ */
  /*  Gestión de Imágenes                                                */
  /* ------------------------------------------------------------------ */

  /**
   * Agrega una imagen a una habitación
   * @param habitacionId ID de la habitación
   * @param file Archivo de imagen
   * @param descripcion Descripción de la imagen (opcional)
   * @param orden Orden de la imagen (opcional)
   * @param userId ID del usuario que realiza la acción
   * @param userRole Rol del usuario que realiza la acción
   * @returns Imagen de la habitación creada
   */
  async addImagen(
    habitacionId: string,
    file: Express.Multer.File,
    descripcion?: string,
    orden?: number,
    userId?: number,
    userRole?: string
  ): Promise<ImagenHabitacionEntity> {
    const habitacion = await this.findOne(habitacionId);

    // Verificar permisos usando validación granular
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(
      habitacion.hospedaje.id,
      String(userId),
      userRole
    );

    if (!tienePermisos) {
      throw new ForbiddenException('No tienes permiso para agregar imágenes a esta habitación');
    }

    // Subir imagen a Cloudinary
    const cloudinaryResponse = await this.imagesService.uploadFile(file, 'habitaciones');

    // Crear relación en la base de datos
    const imagenHabitacion = this.imagenesHabitacionRepository.create({
      habitacion,
      url: cloudinaryResponse.secure_url,
      publicId: cloudinaryResponse.public_id,
      descripcion,
      orden,
      formato: cloudinaryResponse.format,
      tamaño: cloudinaryResponse.bytes,
    });

    return this.imagenesHabitacionRepository.save(imagenHabitacion);
  }

  /**
   * Obtiene las imágenes de una habitación
   * @param habitacionId ID de la habitación
   * @returns Lista de imágenes de la habitación
   */
  async getImagenes(habitacionId: string): Promise<ImagenHabitacionEntity[]> {
    return this.imagenesHabitacionRepository.find({
      where: { habitacion: { id: habitacionId }, active: true },
      order: { orden: 'ASC' }
    });
  }

  /**
   * Elimina una imagen de una habitación
   * @param habitacionId ID de la habitación
   * @param imagenId ID de la imagen
   * @param userId ID del usuario que realiza la acción
   * @param userRole Rol del usuario que realiza la acción
   */
  async removeImagen(
    habitacionId: string,
    imagenId: string,
    userId?: number,
    userRole?: string
  ): Promise<void> {
    const habitacion = await this.findOne(habitacionId);

    // Verificar permisos usando validación granular
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(
      habitacion.hospedaje.id,
      String(userId),
      userRole
    );

    if (!tienePermisos) {
      throw new ForbiddenException('No tienes permiso para eliminar imágenes de esta habitación');
    }

    const imagenHabitacion = await this.imagenesHabitacionRepository.findOne({
      where: { id: imagenId, habitacion: { id: habitacionId }, active: true }
    });

    if (!imagenHabitacion) {
      throw new NotFoundException('Imagen no encontrada');
    }

    // Eliminar de Cloudinary
    if (imagenHabitacion.publicId) {
      await this.imagesService.deleteByPublicId(imagenHabitacion.publicId);
    } else {
      await this.imagesService.deleteFromCloudinary(imagenHabitacion.url);
    }

    // Soft delete de la relación
    imagenHabitacion.active = false;
    await this.imagenesHabitacionRepository.save(imagenHabitacion);
  }
}
