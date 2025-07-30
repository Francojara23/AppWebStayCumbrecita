import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, UseInterceptors, UploadedFile, UploadedFiles } from "@nestjs/common";
import { HospedajesService } from "./hospedajes.service";
import { CreateHospedajeDTO } from "./dto/create-hospedaje.dto";
import { UpdateHospedajeDTO } from "./dto/update-hospedaje.dto";
import { FindHospedajesDTO } from "./dto/find-hospedajes.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from 'src/common/enums/role.enum';
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";

@ApiTags("hospedajes")
@Controller("hospedajes")
export class HospedajesController {
  constructor(private readonly hospedajesService: HospedajesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Crear un nuevo hospedaje" })
  @ApiResponse({ status: 201, description: "Hospedaje creado exitosamente" })
  create(@Body() createHospedajeDTO: CreateHospedajeDTO, @Request() req) {
    return this.hospedajesService.create(createHospedajeDTO, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: "Obtener lista de hospedajes con filtros" })
  @ApiResponse({ status: 200, description: "Lista de hospedajes obtenida exitosamente" })
  findAll(@Query() filters: FindHospedajesDTO) {
    return this.hospedajesService.findAll(filters);
  }

  @Get("destacados")
  @ApiOperation({ summary: "Obtener lista de hospedajes con algoritmo de destacados" })
  @ApiResponse({ status: 200, description: "Lista de hospedajes destacados obtenida exitosamente" })
  findAllConDestacados(@Query() filters: FindHospedajesDTO) {
    return this.hospedajesService.findAllConDestacados(filters);
  }

  @Get("mis-hospedajes")
  @UseGuards(JwtAuthGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Obtener lista de hospedajes del usuario autenticado (como propietario o empleado)" })
  @ApiResponse({ status: 200, description: "Lista de hospedajes del usuario obtenida exitosamente" })
  findMisHospedajes(@Query() filters: FindHospedajesDTO, @Request() req) {
    return this.hospedajesService.findMisHospedajes(filters, req.user.id);
  }

  @Get("mis-propiedades")
  @UseGuards(JwtAuthGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Obtener lista de hospedajes donde el usuario es PROPIETARIO únicamente" })
  @ApiResponse({ status: 200, description: "Lista de hospedajes propios obtenida exitosamente" })
  findMisPropiedades(@Query() filters: FindHospedajesDTO, @Request() req) {
    return this.hospedajesService.findMisPropiedades(filters, req.user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener detalle de un hospedaje" })
  @ApiResponse({ status: 200, description: "Detalle del hospedaje obtenido exitosamente" })
  @ApiResponse({ status: 404, description: "Hospedaje no encontrado" })
  findOne(@Param("id") id: string) {
    return this.hospedajesService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Actualizar un hospedaje" })
  @ApiResponse({ status: 200, description: "Hospedaje actualizado exitosamente" })
  @ApiResponse({ status: 403, description: "No tienes permiso para actualizar este hospedaje" })
  @ApiResponse({ status: 404, description: "Hospedaje no encontrado" })
  update(
    @Param("id") id: string,
    @Body() updateHospedajeDTO: UpdateHospedajeDTO,
    @Request() req
  ) {
    return this.hospedajesService.update(id, updateHospedajeDTO, req.user.id, req.user.role);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @Roles(Role.SUPER_ADMIN, Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Eliminar un hospedaje" })
  @ApiResponse({ status: 200, description: "Hospedaje eliminado exitosamente" })
  @ApiResponse({ status: 403, description: "No tienes permiso para eliminar este hospedaje" })
  @ApiResponse({ status: 404, description: "Hospedaje no encontrado" })
  remove(@Param("id") id: string, @Request() req) {
    return this.hospedajesService.remove(id, req.user.id, req.user.role);
  }

  @Get("tipos")
  @ApiOperation({ summary: "Obtener lista de tipos de hospedaje" })
  @ApiResponse({ status: 200, description: "Lista de tipos obtenida exitosamente" })
  findAllTipos() {
    return this.hospedajesService.findAllTipos();
  }

  @Get("servicios")
  @ApiOperation({ summary: "Obtener catálogo global de servicios" })
  @ApiResponse({ status: 200, description: "Catálogo de servicios obtenido exitosamente" })
  findAllServicios() {
    return this.hospedajesService.findAllServicios();
  }

  @Get(":hospedajeId/servicios")
  @ApiOperation({ summary: "Obtener servicios de un hospedaje específico" })
  @ApiResponse({ status: 200, description: "Servicios del hospedaje obtenidos exitosamente" })
  @ApiResponse({ status: 404, description: "Hospedaje no encontrado" })
  findServiciosByHospedaje(@Param("hospedajeId") hospedajeId: string) {
    return this.hospedajesService.findServiciosByHospedaje(hospedajeId);
  }

  @Get(":hospedajeId/habitaciones/count")
  @ApiOperation({ summary: "Obtener cantidad de habitaciones de un hospedaje" })
  @ApiResponse({ status: 200, description: "Cantidad de habitaciones obtenida exitosamente" })
  @ApiResponse({ status: 404, description: "Hospedaje no encontrado" })
  getHabitacionesCount(@Param("hospedajeId") hospedajeId: string) {
    return this.hospedajesService.getHabitacionesCount(hospedajeId);
  }

  /* ------------------------------------------------------------------ */
  /*  Endpoints para Imágenes                                            */
  /* ------------------------------------------------------------------ */

  @Post(":id/imagenes")
  @UseGuards(JwtAuthGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Agregar imagen a un hospedaje" })
  @ApiResponse({ status: 201, description: "Imagen agregada exitosamente" })
  @ApiResponse({ status: 403, description: "No tienes permiso para agregar imágenes a este hospedaje" })
  @ApiResponse({ status: 404, description: "Hospedaje no encontrado" })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  addImagen(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('descripcion') descripcion?: string,
    @Body('orden') orden?: number,
    @Request() req?
  ) {
    return this.hospedajesService.addImagen(id, file, descripcion, orden, req?.user?.id, req?.user?.role);
  }

  @Post(":id/imagenes/multiple")
  @UseGuards(JwtAuthGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Agregar múltiples imágenes a un hospedaje" })
  @ApiResponse({ status: 201, description: "Imágenes agregadas exitosamente" })
  @ApiResponse({ status: 403, description: "No tienes permiso para agregar imágenes a este hospedaje" })
  @ApiResponse({ status: 404, description: "Hospedaje no encontrado" })
  @UseInterceptors(FilesInterceptor('files', 20)) // máximo 20 archivos
  @ApiConsumes('multipart/form-data')
  addMultipleImagenes(
    @Param("id") id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('descripciones') descripciones?: string, // JSON string array
    @Body('ordenes') ordenes?: string, // JSON string array
    @Request() req?
  ) {
    return this.hospedajesService.addMultipleImagenes(id, files, descripciones, ordenes, req?.user?.id, req?.user?.role);
  }

  @Get(":id/imagenes")
  @ApiOperation({ summary: "Obtener imágenes de un hospedaje" })
  @ApiResponse({ status: 200, description: "Imágenes obtenidas exitosamente" })
  @ApiResponse({ status: 404, description: "Hospedaje no encontrado" })
  getImagenes(@Param("id") id: string) {
    return this.hospedajesService.getImagenes(id);
  }

  @Delete(":id/imagenes/:imagenId")
  @UseGuards(JwtAuthGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Eliminar imagen de un hospedaje" })
  @ApiResponse({ status: 200, description: "Imagen eliminada exitosamente" })
  @ApiResponse({ status: 403, description: "No tienes permiso para eliminar imágenes de este hospedaje" })
  @ApiResponse({ status: 404, description: "Imagen no encontrada" })
  removeImagen(
    @Param("id") id: string,
    @Param("imagenId") imagenId: string,
    @Request() req?
  ) {
    return this.hospedajesService.removeImagen(id, imagenId, req?.user?.id, req?.user?.role);
  }

  /* ------------------------------------------------------------------ */
  /*  Endpoints para Documentos                                          */
  /* ------------------------------------------------------------------ */

  @Post(":id/documentos")
  @UseGuards(JwtAuthGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Agregar documento a un hospedaje" })
  @ApiResponse({ status: 201, description: "Documento agregado exitosamente" })
  @ApiResponse({ status: 403, description: "No tienes permiso para agregar documentos a este hospedaje" })
  @ApiResponse({ status: 404, description: "Hospedaje no encontrado" })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  addDocumento(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('nombre') nombre: string,
    @Body('descripcion') descripcion?: string,
    @Body('tipoDocumento') tipoDocumento?: string,
    @Request() req?
  ) {
    return this.hospedajesService.addDocumento(id, file, nombre, descripcion, tipoDocumento, req?.user?.id, req?.user?.role);
  }

  @Get(":id/documentos")
  @ApiOperation({ summary: "Obtener documentos de un hospedaje" })
  @ApiResponse({ status: 200, description: "Documentos obtenidos exitosamente" })
  @ApiResponse({ status: 404, description: "Hospedaje no encontrado" })
  getDocumentos(@Param("id") id: string) {
    return this.hospedajesService.getDocumentos(id);
  }

  @Delete(":id/documentos/:documentoId")
  @UseGuards(JwtAuthGuard)
  @Roles(Role.PROPIETARIO, Role.ADMIN)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Eliminar documento de un hospedaje" })
  @ApiResponse({ status: 200, description: "Documento eliminado exitosamente" })
  @ApiResponse({ status: 403, description: "No tienes permiso para eliminar documentos de este hospedaje" })
  @ApiResponse({ status: 404, description: "Documento no encontrado" })
  removeDocumento(
    @Param("id") id: string,
    @Param("documentoId") documentoId: string,
    @Request() req?
  ) {
    return this.hospedajesService.removeDocumento(id, documentoId, req?.user?.id, req?.user?.role);
  }
}
