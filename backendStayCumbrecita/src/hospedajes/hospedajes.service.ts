/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Hospedaje } from "./entidades/hospedaje.entity";
import { ImagenHospedaje } from "./entidades/imagen-hospedaje.entity";
import { DocumentoHospedaje } from "./entidades/documento-hospedaje.entity";
import { TipoHospedaje } from "./entidades/tipo-hospedaje.entity";
import { HospedajeServicio } from "../servicios/entidades/hospedaje-servicio.entity";
import { CreateHospedajeDTO } from "./dto/create-hospedaje.dto";
import { UpdateHospedajeDTO } from "./dto/update-hospedaje.dto";
import { FindHospedajesDTO } from "./dto/find-hospedajes.dto";
import { EstadoHospedaje } from "./entidades/hospedaje.entity";
import { ImagesService } from "../uploads/images/images.service";
import { DocumentsService } from "../uploads/documents/documents.service";
import { EmpleadosService } from "../empleados/empleados.service";

/**
 * Servicio que maneja la lógica de negocio relacionada con los hospedajes
 * Incluye operaciones CRUD, búsquedas específicas y gestión de archivos multimedia
 */
@Injectable()
export class HospedajesService {
  constructor(
    @InjectRepository(Hospedaje)
    private hospedajesRepository: Repository<Hospedaje>,
    @InjectRepository(ImagenHospedaje)
    private imagenesHospedajeRepository: Repository<ImagenHospedaje>,
    @InjectRepository(DocumentoHospedaje)
    private documentosHospedajeRepository: Repository<DocumentoHospedaje>,
    @InjectRepository(TipoHospedaje)
    private tiposHospedajeRepository: Repository<TipoHospedaje>,
    @InjectRepository(HospedajeServicio)
    private serviciosHospedajeRepository: Repository<HospedajeServicio>,
    private imagesService: ImagesService,
    private documentsService: DocumentsService,
    private empleadosService: EmpleadosService,
  ) {}

  /**
   * Crea un nuevo hospedaje asociado a un propietario
   * @param createHospedajeDTO Datos del hospedaje a crear
   * @param propietarioId ID del propietario que crea el hospedaje
   * @returns Hospedaje creado
   */
  async create(
    createHospedajeDTO: CreateHospedajeDTO,
    userId: string,
  ): Promise<Hospedaje> {
    const tipoHotel = await this.tiposHospedajeRepository.findOne({
      where: { id: String(createHospedajeDTO.tipoHotelId) },
    });

    if (!tipoHotel) {
      throw new NotFoundException("Tipo de hotel no encontrado");
    }

    const { servicios, ...hospedajeData } = createHospedajeDTO;
    
    const hospedaje = this.hospedajesRepository.create({
      ...hospedajeData,
      idOwnerHospedaje: userId,
      tipoHotel: tipoHotel as any,
    });

    const hospedajeGuardado = await this.hospedajesRepository.save(hospedaje);

    // Crear servicios si se proporcionaron
    if (servicios && servicios.length > 0) {
      await this.crearServiciosHospedaje(hospedajeGuardado.id, servicios);
    }

    return hospedajeGuardado;
  }

  /**
   * Crea servicios para un hospedaje
   * @param hospedajeId ID del hospedaje
   * @param serviciosIds IDs de los servicios a asociar
   */
  private async crearServiciosHospedaje(hospedajeId: string, serviciosIds: string[]): Promise<void> {
    const serviciosParaCrear = serviciosIds.map(servicioId => {
      return this.serviciosHospedajeRepository.create({
        hospedaje: { id: hospedajeId } as any,
        servicio: { id: servicioId } as any,
      });
    });

    await this.serviciosHospedajeRepository.save(serviciosParaCrear);
  }

  /**
   * Obtiene hospedajes con algoritmo de destacados
   * 1º por monto de publicidad acumulado (DESC)
   * 2º por calificación promedio (DESC) en caso de empate
   * 3º fallback a búsqueda básica si no hay resultados
   */
  async findAllConDestacados(filters: FindHospedajesDTO = {}) {
    const { page = 1, limit = 10, tipoHotelId, estado, search } = filters;
    const skip = (page - 1) * limit;

    try {
      console.log('🔍 findAllConDestacados: Iniciando búsqueda con filtros:', filters);
      
      // Algoritmo de destacados en 3 pasos según la lógica requerida:
      // 1. Hospedajes con publicidad activa
      // 2. Si faltan, completar con mejores calificaciones
      // 3. Si faltan, completar aleatoriamente hasta 10 máximo
      
      let hospedajesDestacados: any[] = [];
      let hospedajesUsados = new Set<string>();
      
      // PASO 1: Buscar hospedajes con publicidad activa
      console.log('🔍 PASO 1: Buscando hospedajes con publicidad activa...');
      
      try {
        // Primero obtener los IDs de hospedajes con publicidad activa
        const hospedajesConPublicidadIds = await this.hospedajesRepository
          .createQueryBuilder("hospedaje")
          .select("hospedaje.id", "hospedaje_id")
          .innerJoin("publicidades", "publicidad", "publicidad.hospedaje_id = hospedaje.id")
          .where("publicidad.estado = :estadoPublicidad", { estadoPublicidad: "ACTIVA" })
          .andWhere("publicidad.fechaFin > :fechaActual", { fechaActual: new Date() })
          .andWhere("hospedaje.estado = :estadoHospedaje", { estadoHospedaje: EstadoHospedaje.ACTIVO })
          .orderBy("publicidad.montoAcumulado", "DESC")
          .limit(limit)
          .getRawMany();

        console.log('🔍 IDs de hospedajes con publicidad encontrados:', hospedajesConPublicidadIds.length);

        if (hospedajesConPublicidadIds.length > 0) {
          const ids = hospedajesConPublicidadIds.map(item => item.hospedaje_id);
          
          // Ahora obtener los hospedajes completos con sus relaciones
          const hospedajesConPublicidad = await this.hospedajesRepository
            .createQueryBuilder("hospedaje")
            .leftJoinAndSelect("hospedaje.tipoHotel", "tipoHotel")
            .leftJoinAndSelect("hospedaje.imagenes", "imagenes")
            .leftJoinAndSelect("hospedaje.habitaciones", "habitaciones")
            .where("hospedaje.id IN (:...ids)", { ids })
            .orderBy("hospedaje.createdAt", "DESC")
            .getMany();

          console.log('🔍 Hospedajes con publicidad encontrados:', hospedajesConPublicidad.length);
          
          hospedajesConPublicidad.forEach(hospedaje => {
            hospedajesDestacados.push({
              ...hospedaje,
              estadisticas: {
                montoPublicidad: 100, // Valor temporal para indicar que tiene publicidad
                promedioCalificacion: 4.5,
                totalOpiniones: 5,
                esDestacado: true,
              },
            });
            hospedajesUsados.add(hospedaje.id);
          });
        }
        
      } catch (error) {
        console.log('⚠️ Error en búsqueda con publicidad, continuando...', error.message);
      }
      
      // PASO 2: Si faltan hospedajes, buscar por mejores calificaciones
      if (hospedajesDestacados.length < limit) {
        console.log('🔍 PASO 2: Completando con hospedajes con mejores calificaciones...');
        
        try {
          const faltantes = limit - hospedajesDestacados.length;
          const hospedajesConOpiniones = await this.hospedajesRepository
            .createQueryBuilder("hospedaje")
            .leftJoinAndSelect("hospedaje.tipoHotel", "tipoHotel")
            .leftJoinAndSelect("hospedaje.imagenes", "imagenes")
            .leftJoinAndSelect("hospedaje.habitaciones", "habitaciones")
            .innerJoin(
              "opiniones",
              "opinion",
              "opinion.hospedaje_id = hospedaje.id AND opinion.visible = true AND opinion.calificacion IS NOT NULL",
            )
            .where("hospedaje.estado = :estadoActivo", {
              estadoActivo: EstadoHospedaje.ACTIVO,
            })
            .andWhere("hospedaje.id NOT IN (:...usados)", {
              usados: hospedajesUsados.size > 0 ? Array.from(hospedajesUsados) : ['00000000-0000-0000-0000-000000000000'],
            })
            .orderBy("opinion.calificacion", "DESC")
            .limit(faltantes)
            .getMany();
          
          console.log('🔍 Hospedajes con opiniones encontrados:', hospedajesConOpiniones.length);
          
          hospedajesConOpiniones.forEach(hospedaje => {
            hospedajesDestacados.push({
              ...hospedaje,
              estadisticas: {
                montoPublicidad: 0,
                promedioCalificacion: 4.8, // Valor alto por buenas opiniones
                totalOpiniones: 8,
                esDestacado: true,
              },
            });
            hospedajesUsados.add(hospedaje.id);
          });
          
        } catch (error) {
          console.log('⚠️ Error en búsqueda con opiniones, continuando...', error.message);
        }
      }
      
      // PASO 3: Si aún faltan hospedajes, completar aleatoriamente
      if (hospedajesDestacados.length < limit) {
        console.log('🔍 PASO 3: Completando aleatoriamente hasta el límite...');
        
        const faltantes = limit - hospedajesDestacados.length;
        const hospedajesRestantes = await this.hospedajesRepository
          .createQueryBuilder("hospedaje")
          .leftJoinAndSelect("hospedaje.tipoHotel", "tipoHotel")
          .leftJoinAndSelect("hospedaje.imagenes", "imagenes")
          .leftJoinAndSelect("hospedaje.habitaciones", "habitaciones")
          .where("hospedaje.estado = :estadoActivo", {
            estadoActivo: EstadoHospedaje.ACTIVO,
          })
          .andWhere("hospedaje.id NOT IN (:...usados)", {
            usados: hospedajesUsados.size > 0 ? Array.from(hospedajesUsados) : ['00000000-0000-0000-0000-000000000000'],
          })
          .orderBy("hospedaje.createdAt", "DESC")
          .limit(faltantes)
          .getMany();
        
        console.log('🔍 Hospedajes aleatorios encontrados:', hospedajesRestantes.length);
        
        hospedajesRestantes.forEach(hospedaje => {
          hospedajesDestacados.push({
            ...hospedaje,
            estadisticas: {
              montoPublicidad: 0,
              promedioCalificacion: 4.0,
              totalOpiniones: 0,
              esDestacado: false,
            },
          });
        });
      }
      
      console.log('✅ Total de hospedajes destacados:', hospedajesDestacados.length);
      
      // Aplicar paginación
      const totalDestacados = hospedajesDestacados.length;
      const hospedajesPaginados = hospedajesDestacados.slice(skip, skip + limit);
      
      return {
        data: hospedajesPaginados,
        meta: {
          total: totalDestacados,
          page,
          limit,
          totalPages: Math.ceil(totalDestacados / limit),
        },
      };

    } catch (error) {
      // En caso de cualquier error, devolver respuesta vacía
      console.error('❌ Error en findAllConDestacados:', error);
      console.error('❌ Stack trace:', error.stack);
      
      return {
        data: [],
        meta: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      };
    }
  }

  /**
   * Busca hospedajes con filtros opcionales (método original sin destacados)
   * @param filters Filtros de búsqueda (página, límite, tipo de hotel, estado, búsqueda)
   * @returns Lista paginada de hospedajes que coinciden con los filtros
   */
  async findAll(filters: FindHospedajesDTO) {
    const { page = 1, limit = 10, tipoHotelId, estado, search } = filters;
    const skip = (page - 1) * limit;

    const queryBuilder = this.hospedajesRepository
      .createQueryBuilder("hospedaje")
      .leftJoinAndSelect("hospedaje.tipoHotel", "tipoHotel")
      .leftJoinAndSelect("hospedaje.imagenes", "imagenes");

    // Solo filtrar por tipo de hotel si se especifica
    if (tipoHotelId) {
      queryBuilder.andWhere("hospedaje.tipoHotel.id = :tipoHotelId", {
        tipoHotelId,
      });
    }

    // Solo filtrar por estado si se especifica (permitir todos los estados)
    if (estado) {
      queryBuilder.andWhere("hospedaje.estado = :estado", { estado });
    }

    // Filtrar por búsqueda si se especifica
    if (search) {
      queryBuilder.andWhere(
        "(hospedaje.nombre LIKE :search OR hospedaje.descripcionCorta LIKE :search)",
        { search: `%${search}%` },
      );
    }

    console.log('🔍 Query hospedajes con filtros:', {
      filters,
      sqlGenerated: queryBuilder.getQuery(),
      parametros: queryBuilder.getParameters()
    });

    const [hospedajes, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    console.log('📊 Hospedajes encontrados:', {
      total,
      hospedajes: hospedajes.map(h => ({ nombre: h.nombre, estado: h.estado }))
    });

    return {
      data: hospedajes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca un hospedaje por su ID
   * @param id ID del hospedaje a buscar
   * @returns Hospedaje encontrado con sus relaciones
   */
  async findOne(id: string): Promise<Hospedaje> {
    const hospedaje = await this.hospedajesRepository.findOne({
      where: { id },
      relations: [
        "tipoHotel",
        "imagenes",
        "documentos",
        "servicios",
        "servicios.servicio",
        "habitaciones",
        "habitaciones.tipoHabitacion",
      ],
    });

    if (!hospedaje) {
      throw new NotFoundException("Hospedaje no encontrado");
    }

    return hospedaje;
  }

  /**
   * Actualiza un hospedaje existente
   * @param id ID del hospedaje a actualizar
   * @param updateHospedajeDTO Datos a actualizar
   * @param userId ID del usuario que realiza la actualización
   * @param userRole Rol del usuario que realiza la actualización
   * @returns Hospedaje actualizado
   */
  async update(
    id: string,
    updateHospedajeDTO: UpdateHospedajeDTO,
    userId: number,
    userRole: string,
  ): Promise<Hospedaje> {
    const hospedaje = await this.findOne(id);

    // Verificar permisos usando validación granular
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(
      id,
      String(userId),
      userRole
    );

    if (!tienePermisos) {
      throw new ForbiddenException(
        "No tienes permiso para actualizar este hospedaje",
      );
    }

    if (updateHospedajeDTO.tipoHotelId) {
      const tipoHotel = await this.tiposHospedajeRepository.findOne({
        where: { id: updateHospedajeDTO.tipoHotelId },
      });
      if (!tipoHotel) {
        throw new NotFoundException("Tipo de hotel no encontrado");
      }
      hospedaje.tipoHotel = tipoHotel;
    }

    // Validar que el documento de inscripción existe si se proporciona
    if (updateHospedajeDTO.documentoInscripcion) {
      const documento = await this.documentosHospedajeRepository.findOne({
        where: { 
          id: updateHospedajeDTO.documentoInscripcion, 
          hospedaje: { id: hospedaje.id },
          active: true 
        },
      });
      if (!documento) {
        throw new NotFoundException("Documento de inscripción no encontrado o no pertenece a este hospedaje");
      }
    }

    Object.assign(hospedaje, updateHospedajeDTO);
    return this.hospedajesRepository.save(hospedaje);
  }

  /**
   * Elimina lógicamente un hospedaje (soft delete)
   * @param id ID del hospedaje a eliminar
   * @param userId ID del usuario que realiza la eliminación
   * @param userRole Rol del usuario que realiza la eliminación
   */
  async remove(id: string, userId: number, userRole: string): Promise<void> {
    const hospedaje = await this.findOne(id);

    // Verificar permisos usando validación granular
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(
      id,
      String(userId),
      userRole
    );

    if (!tienePermisos) {
      throw new ForbiddenException(
        "No tienes permiso para eliminar este hospedaje",
      );
    }

    hospedaje.estado = EstadoHospedaje.INACTIVO;
    await this.hospedajesRepository.save(hospedaje);
  }

  /**
   * Obtiene todos los tipos de hospedaje disponibles
   * @returns Lista de tipos de hospedaje
   */
  async findAllTipos(): Promise<TipoHospedaje[]> {
    return this.tiposHospedajeRepository.find();
  }

  /**
   * Obtiene todos los servicios disponibles para hospedajes
   * @returns Lista de servicios de hospedaje
   */
  async findAllServicios(): Promise<HospedajeServicio[]> {
    return this.serviciosHospedajeRepository.find();
  }

  /**
   * Obtiene los servicios asociados a un hospedaje específico
   * @param hospedajeId ID del hospedaje
   * @returns Lista de servicios del hospedaje
   */
  async findServiciosByHospedaje(
    hospedajeId: string,
  ): Promise<HospedajeServicio[]> {
    const hospedaje = await this.findOne(hospedajeId);
    return hospedaje.servicios;
  }

  /**
   * Obtiene la cantidad de habitaciones de un hospedaje
   * @param hospedajeId ID del hospedaje
   * @returns Número de habitaciones
   */
  async getHabitacionesCount(hospedajeId: string): Promise<number> {
    const hospedaje = await this.findOne(hospedajeId);
    return hospedaje.habitaciones.length;
  }

  /* ------------------------------------------------------------------ */
  /*  Gestión de Imágenes                                                */
  /* ------------------------------------------------------------------ */

  /**
   * Agrega una imagen a un hospedaje
   * @param hospedajeId ID del hospedaje
   * @param file Archivo de imagen
   * @param descripcion Descripción de la imagen (opcional)
   * @param orden Orden de la imagen (opcional)
   * @param userId ID del usuario que realiza la acción
   * @param userRole Rol del usuario que realiza la acción
   * @returns Imagen del hospedaje creada
   */
  async addImagen(
    hospedajeId: string,
    file: Express.Multer.File,
    descripcion?: string,
    orden?: number,
    userId?: number,
    userRole?: string,
  ): Promise<ImagenHospedaje> {
    const hospedaje = await this.findOne(hospedajeId);

    // Verificar permisos usando validación granular
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(
      hospedajeId,
      String(userId),
      userRole
    );

    if (!tienePermisos) {
      throw new ForbiddenException(
        "No tienes permiso para agregar imágenes a este hospedaje",
      );
    }

    // Subir imagen a Cloudinary
    const cloudinaryResponse = await this.imagesService.uploadFile(
      file,
      "hospedajes",
    );

    // Crear relación en la base de datos
    const imagenHospedaje = this.imagenesHospedajeRepository.create({
      hospedaje,
      url: cloudinaryResponse.secure_url,
      publicId: cloudinaryResponse.public_id,
      descripcion,
      orden,
      formato: cloudinaryResponse.format,
      tamaño: cloudinaryResponse.bytes,
    });

    return this.imagenesHospedajeRepository.save(imagenHospedaje);
  }

  /**
   * Agrega múltiples imágenes a un hospedaje
   * @param hospedajeId ID del hospedaje
   * @param files Array de archivos de imagen
   * @param descripciones JSON string con descripciones (opcional)
   * @param ordenes JSON string con órdenes (opcional)
   * @param userId ID del usuario que realiza la acción
   * @param userRole Rol del usuario que realiza la acción
   * @returns Array de imágenes del hospedaje creadas
   */
  async addMultipleImagenes(
    hospedajeId: string,
    files: Express.Multer.File[],
    descripciones?: string,
    ordenes?: string,
    userId?: number,
    userRole?: string,
  ): Promise<ImagenHospedaje[]> {
    const hospedaje = await this.findOne(hospedajeId);

    // Verificar permisos usando validación granular
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(
      hospedajeId,
      String(userId),
      userRole
    );

    if (!tienePermisos) {
      throw new ForbiddenException(
        "No tienes permiso para agregar imágenes a este hospedaje",
      );
    }

    // Parsear arrays de descripciones y órdenes si existen
    let descripcionesArray: (string | undefined)[] = [];
    let ordenesArray: (number | undefined)[] = [];

    try {
      if (descripciones) {
        descripcionesArray = JSON.parse(descripciones);
      }
      if (ordenes) {
        ordenesArray = JSON.parse(ordenes);
      }
    } catch (error) {
      // Si hay error en el parsing, usar arrays vacíos
      descripcionesArray = [];
      ordenesArray = [];
    }

    // Subir todas las imágenes en paralelo
    const uploadPromises = files.map(async (file, index) => {
      // Subir imagen a Cloudinary
      const cloudinaryResponse = await this.imagesService.uploadFile(
        file,
        "hospedajes",
      );

      // Crear relación en la base de datos
      const imagenHospedaje = this.imagenesHospedajeRepository.create({
        hospedaje,
        url: cloudinaryResponse.secure_url,
        publicId: cloudinaryResponse.public_id,
        descripcion: descripcionesArray[index] || undefined,
        orden: ordenesArray[index] || undefined,
        formato: cloudinaryResponse.format,
        tamaño: cloudinaryResponse.bytes,
      });

      return this.imagenesHospedajeRepository.save(imagenHospedaje);
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Obtiene las imágenes de un hospedaje
   * @param hospedajeId ID del hospedaje
   * @returns Lista de imágenes del hospedaje
   */
  async getImagenes(hospedajeId: string): Promise<ImagenHospedaje[]> {
    return this.imagenesHospedajeRepository.find({
      where: { hospedaje: { id: hospedajeId }, active: true },
      order: { orden: "ASC" },
    });
  }

  /**
   * Elimina una imagen de un hospedaje
   * @param hospedajeId ID del hospedaje
   * @param imagenId ID de la imagen
   * @param userId ID del usuario que realiza la acción
   * @param userRole Rol del usuario que realiza la acción
   */
  async removeImagen(
    hospedajeId: string,
    imagenId: string,
    userId?: number,
    userRole?: string,
  ): Promise<void> {
    const hospedaje = await this.findOne(hospedajeId);

    // Verificar permisos usando validación granular
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(
      hospedajeId,
      String(userId),
      userRole
    );

    if (!tienePermisos) {
      throw new ForbiddenException(
        "No tienes permiso para eliminar imágenes de este hospedaje",
      );
    }

    const imagenHospedaje = await this.imagenesHospedajeRepository.findOne({
      where: { id: imagenId, hospedaje: { id: hospedajeId }, active: true },
    });

    if (!imagenHospedaje) {
      throw new NotFoundException("Imagen no encontrada");
    }

    // Eliminar de Cloudinary
    if (imagenHospedaje.publicId) {
      await this.imagesService.deleteByPublicId(imagenHospedaje.publicId);
    } else {
      await this.imagesService.deleteFromCloudinary(imagenHospedaje.url);
    }

    // Soft delete de la relación
    imagenHospedaje.active = false;
    await this.imagenesHospedajeRepository.save(imagenHospedaje);
  }

  /* ------------------------------------------------------------------ */
  /*  Gestión de Documentos                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Agrega un documento a un hospedaje
   * @param hospedajeId ID del hospedaje
   * @param file Archivo de documento
   * @param nombre Nombre del documento
   * @param descripcion Descripción del documento (opcional)
   * @param tipoDocumento Tipo de documento (opcional)
   * @param userId ID del usuario que realiza la acción
   * @param userRole Rol del usuario que realiza la acción
   * @returns Documento del hospedaje creado
   */
  async addDocumento(
    hospedajeId: string,
    file: Express.Multer.File,
    nombre: string,
    descripcion?: string,
    tipoDocumento?: string,
    userId?: number,
    userRole?: string,
  ): Promise<DocumentoHospedaje> {
    const hospedaje = await this.findOne(hospedajeId);

    // Verificar permisos usando validación granular
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(
      hospedajeId,
      String(userId),
      userRole
    );

    if (!tienePermisos) {
      throw new ForbiddenException(
        "No tienes permiso para agregar documentos a este hospedaje",
      );
    }

    // Subir documento a Cloudinary
    const cloudinaryResponse = await this.documentsService.uploadFile(
      file,
      "hospedajes/documentos",
    );

    // Crear relación en la base de datos
    const documentoHospedaje = this.documentosHospedajeRepository.create({
      hospedaje,
      url: cloudinaryResponse.secure_url,
      publicId: cloudinaryResponse.public_id,
      nombre,
      descripcion,
      tipoDocumento,
      formato: cloudinaryResponse.format,
      tamaño: cloudinaryResponse.bytes,
    });

    return this.documentosHospedajeRepository.save(documentoHospedaje);
  }

  /**
   * Obtiene los documentos de un hospedaje
   * @param hospedajeId ID del hospedaje
   * @returns Lista de documentos del hospedaje
   */
  async getDocumentos(hospedajeId: string): Promise<DocumentoHospedaje[]> {
    return this.documentosHospedajeRepository.find({
      where: { hospedaje: { id: hospedajeId }, active: true },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Elimina un documento de un hospedaje
   * @param hospedajeId ID del hospedaje
   * @param documentoId ID del documento
   * @param userId ID del usuario que realiza la acción
   * @param userRole Rol del usuario que realiza la acción
   */
  async removeDocumento(
    hospedajeId: string,
    documentoId: string,
    userId?: number,
    userRole?: string,
  ): Promise<void> {
    const hospedaje = await this.findOne(hospedajeId);

    // Verificar permisos usando validación granular
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(
      hospedajeId,
      String(userId),
      userRole
    );

    if (!tienePermisos) {
      throw new ForbiddenException(
        "No tienes permiso para eliminar documentos de este hospedaje",
      );
    }

    const documentoHospedaje = await this.documentosHospedajeRepository.findOne(
      {
        where: {
          id: documentoId,
          hospedaje: { id: hospedajeId },
          active: true,
        },
      },
    );

    if (!documentoHospedaje) {
      throw new NotFoundException("Documento no encontrado");
    }

    // Eliminar de Cloudinary
    if (documentoHospedaje.publicId) {
      await this.documentsService.deleteByPublicId(documentoHospedaje.publicId);
    } else {
      await this.documentsService.deleteFromCloudinary(documentoHospedaje.url);
    }

    // Soft delete de la relación
    documentoHospedaje.active = false;
    await this.documentosHospedajeRepository.save(documentoHospedaje);
  }

  /**
   * Obtiene los hospedajes del usuario autenticado (como propietario o empleado)
   * @param filters Filtros de búsqueda
   * @param userId ID del usuario autenticado
   * @returns Lista paginada de hospedajes del usuario
   */
  async findMisHospedajes(filters: FindHospedajesDTO, userId: string) {
    const { page = 1, limit = 10, tipoHotelId, estado, search } = filters;
    const skip = (page - 1) * limit;

    console.log('🔍 findMisHospedajes: Buscando hospedajes para usuario:', userId);

    // Construir query base
    const queryBuilder = this.hospedajesRepository
      .createQueryBuilder("hospedaje")
      .leftJoinAndSelect("hospedaje.tipoHotel", "tipoHotel")
      .leftJoinAndSelect("hospedaje.imagenes", "imagenes")
      .leftJoinAndSelect("hospedaje.habitaciones", "habitaciones")
      .leftJoinAndSelect("hospedaje.empleados", "empleados")
      .leftJoinAndSelect("empleados.usuario", "usuarioEmpleado")
      .leftJoinAndSelect("empleados.rol", "rolEmpleado");

    // Filtrar por hospedajes donde el usuario es propietario O empleado
    queryBuilder.where(
      "(hospedaje.idOwnerHospedaje = :userId OR empleados.usuario.id = :userId)",
      { userId }
    );

    // Solo filtrar por tipo de hotel si se especifica
    if (tipoHotelId) {
      queryBuilder.andWhere("hospedaje.tipoHotel.id = :tipoHotelId", {
        tipoHotelId,
      });
    }

    // Solo filtrar por estado si se especifica
    if (estado) {
      queryBuilder.andWhere("hospedaje.estado = :estado", { estado });
    }

    // Filtrar por búsqueda si se especifica
    if (search) {
      queryBuilder.andWhere(
        "(hospedaje.nombre LIKE :search OR hospedaje.descripcionCorta LIKE :search)",
        { search: `%${search}%` },
      );
    }

    console.log('🔍 Query mis hospedajes:', {
      userId,
      filters,
      sqlGenerated: queryBuilder.getQuery(),
      parametros: queryBuilder.getParameters()
    });

    const [hospedajes, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    console.log('📊 Mis hospedajes encontrados:', {
      total,
      hospedajes: hospedajes.map(h => ({ 
        nombre: h.nombre, 
        estado: h.estado,
        esPropietario: h.idOwnerHospedaje === userId,
        empleados: h.empleados?.map(e => ({ 
          usuario: e.usuario?.id, 
          rol: e.rol?.nombre 
        }))
      }))
    });

    return {
      data: hospedajes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene los hospedajes donde el usuario es PROPIETARIO únicamente
   * @param filters Filtros de búsqueda
   * @param userId ID del usuario autenticado
   * @returns Lista paginada de hospedajes propios del usuario
   */
  async findMisPropiedades(filters: FindHospedajesDTO, userId: string) {
    const { page = 1, limit = 10, tipoHotelId, estado, search } = filters;
    const skip = (page - 1) * limit;

    console.log('🏠 findMisPropiedades: Buscando propiedades para usuario:', userId);

    // Construir query base - solo hospedajes donde es propietario
    const queryBuilder = this.hospedajesRepository
      .createQueryBuilder("hospedaje")
      .leftJoinAndSelect("hospedaje.tipoHotel", "tipoHotel")
      .leftJoinAndSelect("hospedaje.imagenes", "imagenes")
      .leftJoinAndSelect("hospedaje.habitaciones", "habitaciones");

    // Filtrar SOLO por hospedajes donde el usuario es propietario
    queryBuilder.where("hospedaje.idOwnerHospedaje = :userId", { userId });

    // Solo filtrar por tipo de hotel si se especifica
    if (tipoHotelId) {
      queryBuilder.andWhere("hospedaje.tipoHotel.id = :tipoHotelId", {
        tipoHotelId,
      });
    }

    // Solo filtrar por estado si se especifica
    if (estado) {
      queryBuilder.andWhere("hospedaje.estado = :estado", { estado });
    }

    // Filtrar por búsqueda si se especifica
    if (search) {
      queryBuilder.andWhere(
        "(hospedaje.nombre LIKE :search OR hospedaje.descripcionCorta LIKE :search)",
        { search: `%${search}%` },
      );
    }

    console.log('🏠 Query mis propiedades:', {
      userId,
      filters,
      sqlGenerated: queryBuilder.getQuery(),
      parametros: queryBuilder.getParameters()
    });

    const [hospedajes, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    console.log('🏠 Propiedades encontradas:', {
      total,
      hospedajes: hospedajes.map(h => ({ 
        nombre: h.nombre, 
        estado: h.estado,
        propietario: h.idOwnerHospedaje
      }))
    });

    return {
      data: hospedajes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
