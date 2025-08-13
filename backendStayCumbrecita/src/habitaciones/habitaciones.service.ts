import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, DataSource, In } from 'typeorm';
import { HabitacionEntity } from './entidades/habitacion.entity';
import { TipoHabitacionEntity } from './entidades/tipo-habitacion.entity';
import { ImagenHabitacionEntity } from './entidades/imagen-habitacion.entity';
import { HistorialPrecioEntity, AccionPrecio } from './entidades/historial-precio.entity';
import { HabitacionServicio } from '../servicios/entidades/habitacion-servicio.entity';
import { CreateHabitacionDto } from './dto/create-habitacion.dto';
import { UpdateHabitacionDto } from './dto/update-habitacion.dto';
import { FindHabitacionesDto } from './dto/find-habitaciones.dto';
import { QueryDisponibilidadDto } from './dto/query-disponibilidad.dto';
import { QueryDisponibilidadMesDto } from './dto/query-disponibilidad-mes.dto';
import { QueryDisponibilidadMesesDto } from './dto/query-disponibilidad-meses.dto';
import { DisponibilidadMensualResponseDto, DisponibilidadMultipleMesesResponseDto, HabitacionDisponibilidadMensualDto } from './dto/disponibilidad-mensual-response.dto';
import { CreateMultipleHabitacionesDto } from './dto/create-multiple-habitaciones.dto';
import { HabitacionAgrupadaDto, HabitacionesAgrupadasResponseDto } from './dto/habitacion-agrupada-response.dto';
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
    @InjectRepository(HistorialPrecioEntity)
    private historialPreciosRepository: Repository<HistorialPrecioEntity>,
    @InjectRepository(HabitacionServicio)
    private habitacionServicioRepository: Repository<HabitacionServicio>,
    @Inject(forwardRef(() => HospedajesService))
    private hospedajesService: HospedajesService,
    private empleadosService: EmpleadosService,
    private imagesService: ImagesService,
    @Inject(forwardRef(() => ReservasService))
    private reservasService: ReservasService,
    private dataSource: DataSource,
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

    // Extraer servicios del DTO (siguiendo patrón de hospedajes)
    const { servicios, ...habitacionData } = createHabitacionDto;

    // Crear la habitación
    const habitacion = this.habitacionesRepository.create({
      ...habitacionData,
      hospedaje: { id: hospedajeId } as any,
      tipoHabitacion: tipoHabitacion as any,
    });

    // Guardar la habitación
    const habitacionGuardada = await this.habitacionesRepository.save(habitacion);

    // Guardar las imágenes si existen
    if (habitacionData.imagenes && habitacionData.imagenes.length > 0) {
      const imagenes = habitacionData.imagenes.map(img => 
        this.imagenesHabitacionRepository.create({
          ...img,
          habitacion: habitacionGuardada as any,
        })
      );
      await this.imagenesHabitacionRepository.save(imagenes);
    }

    // Crear servicios si se proporcionaron (siguiendo patrón de hospedajes)
    if (servicios && servicios.length > 0) {
      await this.crearServiciosHabitacion(habitacionGuardada.id, servicios);
    }

    // 📊 AUDITORÍA: Registrar creación de habitación con precios
    await this.registrarHistorialPrecios(
      habitacionGuardada,
      AccionPrecio.CREAR,
      {
        precioBase: habitacionGuardada.precioBase,
        ajustesPrecio: habitacionGuardada.ajustesPrecio || [],
        hospedajeId: hospedajeId,
        nombre: habitacionGuardada.nombre,
      },
      String(userId)
    );

    return this.findOne(habitacionGuardada.id);
  }

  /**
   * Crea servicios para una habitación (siguiendo patrón de hospedajes)
   * @param habitacionId ID de la habitación
   * @param serviciosIds IDs de los servicios a asociar
   */
  private async crearServiciosHabitacion(habitacionId: string, serviciosIds: string[]): Promise<void> {
    console.log('🔧 [HabitacionesService] Creando servicios para habitación:', {
      habitacionId,
      servicios: serviciosIds.length
    });

    const serviciosParaCrear = serviciosIds.map(servicioId => {
      return this.habitacionServicioRepository.create({
        habitacion: { id: habitacionId } as any,
        servicio: { id: servicioId } as any,
      });
    });

    await this.habitacionServicioRepository.save(serviciosParaCrear);
    
    console.log('✅ [HabitacionesService] Servicios creados exitosamente:', {
      habitacionId,
      serviciosCreados: serviciosParaCrear.length
    });
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

    console.log(`🏠 [HabitacionesService] findAllByHospedaje - habitaciones con ajustesPrecio:`, {
      hospedajeId,
      total,
      habitacionesConAjustes: habitaciones.filter(h => h.ajustesPrecio && h.ajustesPrecio.length > 0).length
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

    // NOTA: Removido filtro de capacidad individual para permitir selección múltiple
    // if (capacidad) {
    //   queryBuilder.andWhere('habitacion.capacidad >= :capacidad', { capacidad });
    // }

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

    // 📊 AUDITORÍA: Guardar datos anteriores para comparación
    const datosAnteriores = {
      precioBase: habitacion.precioBase,
      ajustesPrecio: habitacion.ajustesPrecio || [],
      nombre: habitacion.nombre,
    };

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
    const habitacionActualizada = await this.habitacionesRepository.save(habitacion);

    // 📊 AUDITORÍA: Registrar actualización solo si hay cambios en precios
    const huboCambiosPrecios = 
      datosAnteriores.precioBase !== habitacionActualizada.precioBase ||
      JSON.stringify(datosAnteriores.ajustesPrecio) !== JSON.stringify(habitacionActualizada.ajustesPrecio || []);

    if (huboCambiosPrecios) {
      await this.registrarHistorialPrecios(
        habitacionActualizada,
        AccionPrecio.ACTUALIZAR,
        {
          anterior: datosAnteriores,
          nuevo: {
            precioBase: habitacionActualizada.precioBase,
            ajustesPrecio: habitacionActualizada.ajustesPrecio || [],
            nombre: habitacionActualizada.nombre,
          },
          hospedajeId: habitacion.hospedaje.id,
        },
        String(userId)
      );
    }

    return habitacionActualizada;
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

    // Función auxiliar para verificar si es día de semana (lunes a jueves)
    const esDiaDeSemana = (fecha: Date) => {
      const dia = fecha.getDay();
      return dia >= 1 && dia <= 4; // 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves
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

    // Aplicar ajuste de días de semana (lunes a jueves) - Puede ser descuento
    if (esDiaDeSemana(fecha)) {
      const ajusteDiasSemana = habitacion.ajustesPrecio.find((ajuste: any) => 
        ajuste.active && 
        ajuste.tipo === 'DIAS_SEMANA'
      );

      if (ajusteDiasSemana && ajusteDiasSemana.incrementoPct !== undefined) {
        precioFinal *= (1 + ajusteDiasSemana.incrementoPct / 100);
        // Asegurar que el precio no sea negativo (mínimo $1)
        precioFinal = Math.max(precioFinal, 1);
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
    console.log('🚀 [HabitacionesService] findDisponibles llamado con:', JSON.stringify(query, null, 2));
    
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

    console.log('📅 [HabitacionesService] Fechas extraídas:', { fechaInicio, fechaFin });



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

    // NOTA: Removido filtro de capacidad individual para permitir selección múltiple
    // El frontend validará que la suma de capacidades >= huéspedes solicitados
    // if (personas) {
    //   queryBuilder.andWhere('habitacion.capacidad >= :personas', { personas });
    // }

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

    // Calcular precios con ajustes si hay fechas
    if (fechaInicio && fechaFin) {
      const fechaInicioDate = new Date(fechaInicio);
      const fechaFinDate = new Date(fechaFin);
      
      console.log('🔄 [HabitacionesService] Calculando precios con ajustes para fechas:', {
        fechaInicio,
        fechaFin,
        habitacionesDisponibles: habitacionesDisponibles.length
      });

      // Calcular precio mínimo por noche para cada habitación
      for (const habitacion of habitacionesDisponibles) {
        try {
          const preciosCalculados: number[] = [];
          const fechaActual = new Date(fechaInicioDate);
          
          // Calcular precio para cada día del rango
          while (fechaActual < fechaFinDate) {
            const precioConAjustes = await this.calcularPrecioConAjustes(habitacion, fechaActual);
            preciosCalculados.push(precioConAjustes);
            fechaActual.setDate(fechaActual.getDate() + 1);
          }
          
          // Obtener precio mínimo del rango (precio "desde")
          const precioMinimo = Math.min(...preciosCalculados);
          
          // Agregar precio calculado a la habitación
          (habitacion as any).precioCalculado = precioMinimo;
          
          console.log(`💰 [HabitacionesService] Habitación ${habitacion.nombre}:`, {
            precioBase: habitacion.precioBase,
            precioMinimo,
            descuento: precioMinimo < parseFloat(habitacion.precioBase.toString()) ? 'Sí' : 'No'
          });
          
        } catch (error) {
          console.error(`❌ Error calculando precio para habitación ${habitacion.id}:`, error);
          // En caso de error, usar precio base
          (habitacion as any).precioCalculado = parseFloat(habitacion.precioBase.toString());
        }
      }
    }

    // Aplicar paginación a las habitaciones disponibles
    const total = habitacionesDisponibles.length;
    const habitacionesPaginadas = habitacionesDisponibles.slice(
      (page - 1) * limit,
      page * limit
    );

    console.log('✅ [HabitacionesService] Habitaciones disponibles procesadas:', {
      total,
      paginadas: habitacionesPaginadas.length,
      conPreciosCalculados: habitacionesPaginadas.filter(h => (h as any).precioCalculado).length
    });

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

    // Función auxiliar para verificar si es día de semana (lunes a jueves)
    const esDiaDeSemana = (fecha: Date) => {
      const dia = fecha.getDay();
      return dia >= 1 && dia <= 4; // 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves
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

    // Aplicar ajuste de días de semana (lunes a jueves) - Puede ser descuento
    if (esDiaDeSemana(fecha)) {
      const ajusteDiasSemana = habitacion.ajustesPrecio?.find(ajuste => 
        ajuste.active && 
        (ajuste.tipo as string === 'DIAS_SEMANA' || ajuste.tipo === TipoAjustePrecio.DIAS_SEMANA)
      );

      if (ajusteDiasSemana && ajusteDiasSemana.incrementoPct !== undefined) {
        precioFinal *= (1 + ajusteDiasSemana.incrementoPct / 100);
        // Asegurar que el precio no sea negativo (mínimo $1)
        precioFinal = Math.max(precioFinal, 1);
      }
    }

    // Aplicar 13% de impuestos y cargos al precio final
    precioFinal *= 1.13;

    return Math.round(precioFinal * 100) / 100; // Redondear a 2 decimales
  }

  /**
   * Registra cambios en el historial de precios para auditoría
   * @param habitacion Habitación relacionada al cambio
   * @param accion Tipo de acción realizada (CREAR, ACTUALIZAR, etc.)
   * @param payload Datos del cambio (precios anteriores y nuevos)
   * @param usuarioId ID del usuario que realiza el cambio
   */
  private async registrarHistorialPrecios(
    habitacion: HabitacionEntity,
    accion: AccionPrecio,
    payload: Record<string, any>,
    usuarioId: string
  ): Promise<void> {
    try {
      const historialEntry = this.historialPreciosRepository.create({
        habitacion,
        usuarioId,
        accion,
        payload,
      });
      
      await this.historialPreciosRepository.save(historialEntry);
      console.log(`✅ Registro de auditoría creado: ${accion} para habitación ${habitacion.id}`);
    } catch (error) {
      console.error('❌ Error al registrar historial de precios:', error);
      // No lanzar error para no interrumpir el flujo principal
    }
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
   * Agrega las mismas imágenes a múltiples habitaciones (optimización para creación múltiple)
   * @param hospedajeId ID del hospedaje (para verificar permisos)
   * @param habitacionIds Array de IDs de habitaciones
   * @param files Archivos de imagen a subir
   * @param descripciones JSON string con descripciones (opcional)
   * @param ordenes JSON string con órdenes (opcional)
   * @param userId ID del usuario que realiza la acción
   * @param userRole Rol del usuario que realiza la acción
   * @returns Resultado de la operación con estadísticas
   */
  async addImagenesToMultipleHabitaciones(
    hospedajeId: string,
    habitacionIds: string[],
    files: Express.Multer.File[],
    descripciones?: string,
    ordenes?: string,
    userId?: number,
    userRole?: string
  ): Promise<any> {
    console.log('🏠📸 [HabitacionesService] Agregando imágenes a múltiples habitaciones:', {
      hospedajeId,
      habitaciones: habitacionIds.length,
      imagenes: files.length
    });

    // Verificar permisos para el hospedaje
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(
      hospedajeId,
      String(userId),
      userRole
    );

    if (!tienePermisos) {
      throw new ForbiddenException('No tienes permiso para agregar imágenes a habitaciones de este hospedaje');
    }

    // Verificar que todas las habitaciones existen y pertenecen al hospedaje
    const habitaciones = await this.habitacionesRepository.find({
      where: { 
        id: In(habitacionIds),
        hospedaje: { id: hospedajeId }
      },
      relations: ['hospedaje']
    });

    if (habitaciones.length !== habitacionIds.length) {
      throw new NotFoundException('Una o más habitaciones no encontradas o no pertenecen al hospedaje');
    }

    // Parsear descripciones y órdenes
    let descripcionesArray: string[] = [];
    let ordenesArray: number[] = [];

    try {
      if (descripciones) {
        descripcionesArray = JSON.parse(descripciones);
      }
    } catch (error) {
      console.warn('Error parsing descripciones, usando array vacío');
      descripcionesArray = [];
    }

    try {
      if (ordenes) {
        ordenesArray = JSON.parse(ordenes);
      }
    } catch (error) {
      console.warn('Error parsing ordenes, usando array vacío');
      ordenesArray = [];
    }

    console.log('🎯 [HabitacionesService] OPTIMIZACIÓN: Subiendo imágenes UNA SOLA VEZ a Cloudinary...');

    // 🎯 OPTIMIZACIÓN: Subir cada imagen UNA SOLA VEZ a Cloudinary
    const imagenesCloudinary: any[] = [];
    
    for (const [index, file] of files.entries()) {
      try {
        console.log(`📤 Subiendo imagen ${index + 1}/${files.length}: ${file.originalname}`);
        
        // Subir imagen a Cloudinary UNA SOLA VEZ
        const cloudinaryResponse = await this.imagesService.uploadFile(
          file,
          'habitaciones'
        );

        const imagenData = {
          url: cloudinaryResponse.secure_url,
          publicId: cloudinaryResponse.public_id,
          descripcion: descripcionesArray[index] || undefined,
          orden: ordenesArray[index] || undefined,
          formato: cloudinaryResponse.format,
          tamaño: cloudinaryResponse.bytes,
        } as any;

        imagenesCloudinary.push(imagenData);
        console.log(`✅ Imagen ${index + 1} subida a Cloudinary: ${file.originalname}`);
      } catch (error) {
        console.error(`❌ Error subiendo imagen ${index + 1} (${file.originalname}):`, error.message);
        throw new Error(`Error subiendo imagen ${file.originalname}: ${error.message}`);
      }
    }

    console.log('🔄 [HabitacionesService] Asociando imágenes a todas las habitaciones...');

    // 🔄 Crear relaciones para TODAS las habitaciones usando las mismas URLs
    const relacionesImagenes: ImagenHabitacionEntity[] = [];
    
    for (const habitacion of habitaciones) {
      for (const imagenData of imagenesCloudinary) {
        const imagenHabitacion = this.imagenesHabitacionRepository.create({
          ...imagenData,
          habitacion: habitacion as any,
        });
        relacionesImagenes.push(imagenHabitacion as any);
      }
    }

    // Guardar todas las relaciones en una sola operación
    const relacionesGuardadas = await this.imagenesHabitacionRepository.save(relacionesImagenes as any);

    console.log('✅ [HabitacionesService] Proceso completado exitosamente:', {
      imagenesSubidas: imagenesCloudinary.length,
      relacionesCreadas: relacionesGuardadas.length,
      habitaciones: habitaciones.length,
      optimizacion: `${imagenesCloudinary.length} uploads vs ${imagenesCloudinary.length * habitaciones.length} sin optimización`
    });

    return {
      success: true,
      message: `${imagenesCloudinary.length} imágenes agregadas exitosamente a ${habitaciones.length} habitaciones`,
      estadisticas: {
        imagenesSubidas: imagenesCloudinary.length,
        habitacionesAfectadas: habitaciones.length,
        relacionesCreadas: relacionesGuardadas.length,
        optimizacion: {
          uploadsRealizados: imagenesCloudinary.length,
          uploadsSinOptimizacion: imagenesCloudinary.length * habitaciones.length,
          ahorro: `${((imagenesCloudinary.length * habitaciones.length) - imagenesCloudinary.length)} uploads evitados`
        }
      },
      imagenes: imagenesCloudinary,
      habitaciones: habitaciones.map(h => ({ id: h.id, nombre: h.nombre }))
    };
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

  /**
   * Procesa las tempImages subiendo los archivos a Cloudinary una sola vez
   * @param tempImages Archivos temporales a subir
   * @returns Array de ImagenHabitacionDto con URLs de Cloudinary
   */
  private async procesarImagenesTemporales(tempImages: any[]): Promise<any[]> {
    if (!tempImages || tempImages.length === 0) {
      return [];
    }

    console.log('📸 [HabitacionesService] Procesando imágenes temporales:', {
      cantidad: tempImages.length
    });

    const imagenesCloudinary: any[] = [];

    for (const tempImage of tempImages) {
      try {
        // Subir imagen a Cloudinary usando el servicio existente
        const cloudinaryResponse = await this.imagesService.uploadFile(
          tempImage.file, 
          'habitaciones'
        );

        // Crear objeto con formato compatible con ImagenHabitacionDto
        const imagenDto = {
          url: cloudinaryResponse.secure_url,
          descripcion: tempImage.descripcion || '',
          orden: tempImage.orden || 0,
          publicId: cloudinaryResponse.public_id,
          formato: cloudinaryResponse.format,
          tamaño: cloudinaryResponse.bytes
        };

        imagenesCloudinary.push(imagenDto);
        
        console.log('✅ [HabitacionesService] Imagen subida a Cloudinary:', {
          originalId: tempImage.id,
          url: cloudinaryResponse.secure_url
        });
      } catch (error) {
        console.error('❌ [HabitacionesService] Error subiendo imagen temporal:', {
          imagenId: tempImage.id,
          error: error.message
        });
        throw new Error(`Error subiendo imagen ${tempImage.id}: ${error.message}`);
      }
    }

    console.log('✅ [HabitacionesService] Todas las imágenes procesadas:', {
      procesadas: imagenesCloudinary.length,
      total: tempImages.length
    });

    return imagenesCloudinary;
  }

  /**
   * Crea múltiples habitaciones idénticas con optimización de imágenes
   * @param createMultipleDto Datos para crear múltiples habitaciones
   * @param userId ID del usuario que crea las habitaciones
   * @param userRole Rol del usuario que crea las habitaciones
   * @returns Array de habitaciones creadas
   */
  async createMultiple(
    createMultipleDto: CreateMultipleHabitacionesDto, 
    userId: number, 
    userRole: string
  ): Promise<HabitacionEntity[]> {
    const { cantidad, datosHabitacion } = createMultipleDto;
    const habitacionesCreadas: HabitacionEntity[] = [];

    console.log('🏠 [HabitacionesService] Creando múltiples habitaciones:', {
      cantidad,
      nombre: datosHabitacion.nombre,
      hospedajeId: (datosHabitacion as any).hospedajeId,
      tieneImagenesTemporales: !!(datosHabitacion as any).tempImages?.length,
      tieneServicios: !!(datosHabitacion.servicios?.length),
      servicios: datosHabitacion.servicios?.length || 0
    });

    // Crear cada habitación individualmente en una transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 🎯 OPTIMIZACIÓN: Procesar imágenes temporales UNA SOLA VEZ
      let imagenesCompartidas: any[] = [];
      const tempImages = (datosHabitacion as any).tempImages;
      
      if (tempImages && tempImages.length > 0) {
        console.log('📸 [HabitacionesService] Optimización activada: procesando imágenes una sola vez...');
        imagenesCompartidas = await this.procesarImagenesTemporales(tempImages);
      }

      // Crear cada habitación con las imágenes ya procesadas
      for (let i = 1; i <= cantidad; i++) {
        // Agregar número secuencial al nombre para diferenciar habitaciones
        const nombreConNumero = `${datosHabitacion.nombre} - ${i}`;

        // Preparar datos de habitación con imágenes optimizadas
        const habitacionData = {
          ...datosHabitacion,
          nombre: nombreConNumero,
          imagenes: imagenesCompartidas, // URLs ya subidas a Cloudinary
          tempImages: undefined // Remover tempImages para evitar procesamiento duplicado
        };

        console.log(`🏠 [HabitacionesService] Creando habitación ${i}/${cantidad}:`, {
          nombre: nombreConNumero,
          imagenes: imagenesCompartidas.length
        });

        // Reutilizar el método create existente (ahora usa imagenes en lugar de tempImages)
        const hospedajeId = (datosHabitacion as any).hospedajeId;
        const habitacion = await this.create(hospedajeId, habitacionData, userId, userRole);
        
        habitacionesCreadas.push(habitacion);
      }

      await queryRunner.commitTransaction();
      
      console.log('✅ [HabitacionesService] Habitaciones múltiples creadas exitosamente:', {
        cantidad: habitacionesCreadas.length,
        nombres: habitacionesCreadas.map(h => h.nombre),
        imagenesCompartidas: imagenesCompartidas.length,
        optimizacionAplicada: imagenesCompartidas.length > 0,
        serviciosAsignados: datosHabitacion.servicios?.length || 0,
        relacionesServiciosCreadas: (datosHabitacion.servicios?.length || 0) * habitacionesCreadas.length
      });

      return habitacionesCreadas;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ [HabitacionesService] Error creando habitaciones múltiples:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Procesa FormData para crear múltiples habitaciones con archivos
   * @param body Datos del formulario
   * @param files Archivos subidos
   * @returns DTO procesado para crear múltiples habitaciones
   */
  private processFormDataForMultipleRooms(body: any, files: Express.Multer.File[]): CreateMultipleHabitacionesDto {
    console.log('📸 [HabitacionesService] Procesando FormData con archivos...');
    
    try {
      // Parsear los datos JSON del body
      const datosHabitacion = JSON.parse(body.datosHabitacion);
      const cantidad = parseInt(body.cantidad);

      // Procesar archivos de imágenes temporales
      const tempImages: any[] = [];
      const filesByIndex: { [key: string]: any } = {};
      
      // Agrupar archivos por índice
      files.forEach(file => {
        const fieldName = file.fieldname; // Ej: "tempImages[0][file]"
        const match = fieldName.match(/tempImages\[(\d+)\]\[file\]/);
        if (match) {
          const index = match[1];
          if (!filesByIndex[index]) {
            filesByIndex[index] = {};
          }
          filesByIndex[index].file = file;
        }
      });

      // Crear objetos tempImages combinando archivos con metadatos
      Object.keys(filesByIndex).forEach(index => {
        const tempImage = {
          id: body[`tempImages[${index}][id]`],
          file: filesByIndex[index].file,
          descripcion: body[`tempImages[${index}][descripcion]`] || '',
          orden: body[`tempImages[${index}][orden]`] ? parseInt(body[`tempImages[${index}][orden]`]) : 0
        };
        tempImages.push(tempImage);
      });

      // Agregar tempImages a los datos de habitación
      datosHabitacion.tempImages = tempImages;

      const createMultipleDto = {
        cantidad,
        datosHabitacion
      };

      console.log('✅ [HabitacionesService] FormData procesado:', {
        cantidad,
        tempImages: tempImages.length
      });

      return createMultipleDto;
    } catch (error) {
      console.error('❌ [HabitacionesService] Error procesando FormData:', error);
      throw new Error('Error procesando datos del formulario con archivos');
    }
  }

  /**
   * Crea múltiples habitaciones en un hospedaje con soporte para FormData y JSON
   * @param hospedajeId ID del hospedaje donde crear las habitaciones
   * @param body Datos del formulario (puede ser FormData o JSON)
   * @param files Archivos subidos (opcional)
   * @param userId ID del usuario que crea las habitaciones
   * @param userRole Rol del usuario que crea las habitaciones
   * @returns Array de habitaciones creadas
   */
  async createMultipleInHospedajeWithFiles(
    hospedajeId: string,
    body: any,
    files: Express.Multer.File[],
    userId: number,
    userRole: string
  ): Promise<HabitacionEntity[]> {
    console.log('🏠 [HabitacionesService] Recibida petición múltiple:', {
      hospedajeId,
      tieneArchivos: !!(files?.length),
      cantidadArchivos: files?.length || 0,
      bodyKeys: Object.keys(body || {})
    });

    let createMultipleDto: CreateMultipleHabitacionesDto;

    // Determinar si la petición viene como FormData (con archivos) o JSON
    if (files && files.length > 0) {
      // Procesar FormData
      createMultipleDto = this.processFormDataForMultipleRooms(body, files);
    } else {
      console.log('📄 [HabitacionesService] Procesando JSON (sin archivos)...');
      // Procesar JSON normal (sin archivos)
      createMultipleDto = body as CreateMultipleHabitacionesDto;
    }

    return this.createMultipleInHospedaje(hospedajeId, createMultipleDto, userId, userRole);
  }

  /**
   * Crea múltiples habitaciones en un hospedaje específico
   * @param hospedajeId ID del hospedaje donde crear las habitaciones
   * @param createMultipleDto Datos para crear múltiples habitaciones
   * @param userId ID del usuario que crea las habitaciones
   * @param userRole Rol del usuario que crea las habitaciones
   * @returns Array de habitaciones creadas
   */
  async createMultipleInHospedaje(
    hospedajeId: string,
    createMultipleDto: CreateMultipleHabitacionesDto,
    userId: number,
    userRole: string
  ): Promise<HabitacionEntity[]> {
    console.log('🏠 [HabitacionesService] Creando múltiples habitaciones en hospedaje:', {
      hospedajeId,
      cantidad: createMultipleDto.cantidad
    });

    // Agregar hospedajeId a los datos de habitación
    const datosConHospedaje = {
      ...createMultipleDto,
      datosHabitacion: {
        ...createMultipleDto.datosHabitacion,
        hospedajeId
      }
    };

    return this.createMultiple(datosConHospedaje, userId, userRole);
  }

  /**
   * Obtiene habitaciones agrupadas por nombre con disponibilidad
   * @param hospedajeId ID del hospedaje
   * @param query Parámetros de consulta (fechas, filtros, paginación)
   * @returns Habitaciones agrupadas con disponibilidad
   */
  async findDisponiblesAgrupadasByHospedaje(
    hospedajeId: string,
    query: QueryDisponibilidadDto
  ): Promise<HabitacionesAgrupadasResponseDto> {
    console.log('📊 [HabitacionesService] Buscando habitaciones agrupadas:', {
      hospedajeId,
      fechaInicio: query.fechaInicio,
      fechaFin: query.fechaFin,
      personas: query.personas
    });

    // 1. Verificar que el hospedaje existe
    await this.hospedajesService.findOne(hospedajeId);
    
    // 2. Obtener todas las habitaciones del hospedaje
    const todasHabitaciones = await this.habitacionesRepository.find({
      where: { 
        hospedaje: { id: hospedajeId },
        active: true
      },
      relations: ['tipoHabitacion', 'imagenes', 'servicios', 'servicios.servicio', 'hospedaje']
    });

    console.log('🏠 [HabitacionesService] Habitaciones encontradas:', {
      total: todasHabitaciones.length,
      nombres: todasHabitaciones.map(h => h.nombre)
    });

    // 3. Verificar disponibilidad si hay fechas
    let mapaDisponibilidad = new Map<string, boolean>();
    if (query.fechaInicio && query.fechaFin) {
      const habitacionIds = todasHabitaciones.map(h => h.id);
      mapaDisponibilidad = await this.reservasService.verificarDisponibilidadMultiplesHabitaciones(
        habitacionIds,
        query.fechaInicio,
        query.fechaFin
      );
    } else {
      // Sin fechas, todas están disponibles por fechas
      todasHabitaciones.forEach(h => mapaDisponibilidad.set(h.id, true));
    }

    // 4. Agrupar por nombre base (sin numeración)
    const gruposHabitaciones = new Map<string, {
      habitaciones: HabitacionEntity[];
      disponibles: HabitacionEntity[];
    }>();

    todasHabitaciones.forEach(habitacion => {
      // Extraer nombre base (remover " - 1", " - 2", etc.)
      const nombreBase = habitacion.nombre.replace(/ - \d+$/, '');
      
      if (!gruposHabitaciones.has(nombreBase)) {
        gruposHabitaciones.set(nombreBase, { habitaciones: [], disponibles: [] });
      }

      const grupo = gruposHabitaciones.get(nombreBase)!;
      grupo.habitaciones.push(habitacion);

      // Si está disponible por fechas, agregarla a disponibles
      if (mapaDisponibilidad.get(habitacion.id)) {
        grupo.disponibles.push(habitacion);
      }
    });

    console.log('📊 [HabitacionesService] Grupos formados:', {
      totalGrupos: gruposHabitaciones.size,
      grupos: Array.from(gruposHabitaciones.entries()).map(([nombre, grupo]) => ({
        nombre,
        total: grupo.habitaciones.length,
        disponibles: grupo.disponibles.length
      }))
    });

    // 5. Convertir grupos a DTO
    const habitacionesAgrupadas: HabitacionAgrupadaDto[] = [];

    gruposHabitaciones.forEach((grupo, nombreBase) => {
      const habitacionRepresentativa = grupo.habitaciones[0]; // Usar primera para datos base

      habitacionesAgrupadas.push({
        id: habitacionRepresentativa.id, // ID representativo
        nombre: nombreBase, // Nombre sin numeración
        descripcionCorta: habitacionRepresentativa.descripcionCorta,
        descripcionLarga: habitacionRepresentativa.descripcionLarga,
        capacidad: habitacionRepresentativa.capacidad,
        precioBase: habitacionRepresentativa.precioBase,
        ajustesPrecio: habitacionRepresentativa.ajustesPrecio || [], // ✅ AGREGADO
        cantidadTotal: grupo.habitaciones.length,
        cantidadDisponible: grupo.disponibles.length,
        habitacionesDisponiblesIds: grupo.disponibles.map(h => h.id),
        tipoHabitacion: habitacionRepresentativa.tipoHabitacion,
        imagenes: habitacionRepresentativa.imagenes,
        servicios: habitacionRepresentativa.servicios,
        hospedaje: habitacionRepresentativa.hospedaje
      });
    });

    // 6. Aplicar filtros adicionales
    let habitacionesFiltradas = habitacionesAgrupadas;

    // NOTA: Removido filtro de capacidad individual para permitir selección múltiple
    // El frontend validará que la suma de capacidades >= huéspedes solicitados
    // if (query.personas && query.personas > 0) {
    //   habitacionesFiltradas = habitacionesFiltradas.filter(h => h.capacidad >= query.personas!);
    // }

    if (query.precioMin !== undefined) {
      habitacionesFiltradas = habitacionesFiltradas.filter(h => h.precioBase >= query.precioMin!);
    }

    if (query.precioMax !== undefined) {
      habitacionesFiltradas = habitacionesFiltradas.filter(h => h.precioBase <= query.precioMax!);
    }

    if (query.tipoHabitacionId) {
      habitacionesFiltradas = habitacionesFiltradas.filter(h => h.tipoHabitacion?.id === query.tipoHabitacionId);
    }

    console.log('🔍 [HabitacionesService] Habitaciones filtradas:', {
      antesDelFiltro: habitacionesAgrupadas.length,
      despuesDelFiltro: habitacionesFiltradas.length
    });

    // 7. Aplicar paginación
    const { page = 1, limit = 10 } = query;
    const total = habitacionesFiltradas.length;
    const habitacionesPaginadas = habitacionesFiltradas.slice(
      (page - 1) * limit,
      page * limit
    );

    const response = {
      data: habitacionesPaginadas,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };

    console.log('✅ [HabitacionesService] Respuesta agrupada generada:', {
      totalGrupos: response.meta.total,
      gruposPaginados: response.data.length,
      pagina: response.meta.page
    });

    return response;
  }
}
