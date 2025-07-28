import { 
  Controller, 
  Get, 
  Query, 
  UseGuards, 
  Request, 
  BadRequestException,
  ForbiddenException,
  Res,
  Header
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiQuery 
} from '@nestjs/swagger';
import { Response } from 'express';

import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { FiltrosKpiDto } from './dto/filtros-kpi.dto';
import { ExportDto } from './dto/export.dto';

/**
 * Controlador de reportes y análitica de negocio
 * 
 * Seguridad por roles:
 * - SUPER_ADMIN: puede consultar cualquier hotel
 * - PROPIETARIO: solo hoteles que le pertenecen  
 * - EMPLEADO/ADMIN_HOTEL: hoteles de su establecimiento
 * - TURISTA: acceso denegado (403)
 */
@ApiTags('Reports')
@Controller('api/reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('kpis')
  @Roles(Role.SUPER_ADMIN, Role.PROPIETARIO, Role.ADMIN, Role.EMPLEADO)
  @ApiOperation({ 
    summary: 'Obtener KPIs principales del dashboard',
    description: 'Retorna métricas clave: reservas, ingresos, ocupación, clientes únicos'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'KPIs obtenidos exitosamente',
    schema: {
      type: 'object',
      properties: {
        total_reservas: { type: 'number' },
        clientes_unicos: { type: 'number' },
        ingresos_totales: { type: 'number' },
        ticket_promedio: { type: 'number' },
        hoteles_activos: { type: 'number' },
        habitaciones_totales: { type: 'number' },
        tasa_ocupacion: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Sin permisos para acceder' })
  async getKPIs(@Query() filtros: FiltrosKpiDto, @Request() req) {
    return this.reportesService.getKPIs(filtros, req.user);
  }

  @Get('reservations/by-month')
  @Roles(Role.SUPER_ADMIN, Role.PROPIETARIO, Role.ADMIN, Role.EMPLEADO)
  @ApiOperation({ 
    summary: 'Reservas agrupadas por mes',
    description: 'Histórico mensual de reservas con estados y valores promedio'
  })
  @ApiResponse({ status: 200, description: 'Datos mensuales de reservas' })
  async getReservationsByMonth(@Query() filtros: FiltrosKpiDto, @Request() req) {
    return this.reportesService.reservasByMonth(filtros, req.user);
  }

  @Get('reservations/by-status')
  @Roles(Role.SUPER_ADMIN, Role.PROPIETARIO, Role.ADMIN, Role.EMPLEADO)
  @ApiOperation({ 
    summary: 'Reservas agrupadas por estado',
    description: 'Distribución de reservas según su estado actual'
  })
  @ApiResponse({ status: 200, description: 'Distribución por estados' })
  async getReservationsByStatus(@Query() filtros: FiltrosKpiDto, @Request() req) {
    return this.reportesService.reservasByStatus(filtros, req.user);
  }

  @Get('revenue/by-month')
  @Roles(Role.SUPER_ADMIN, Role.PROPIETARIO, Role.ADMIN, Role.EMPLEADO)
  @ApiOperation({ 
    summary: 'Ingresos agrupados por mes',
    description: 'Evolución mensual de ingresos, impuestos y tickets promedio'
  })
  @ApiResponse({ status: 200, description: 'Ingresos mensuales' })
  async getRevenueByMonth(@Query() filtros: FiltrosKpiDto, @Request() req) {
    return this.reportesService.revenueByMonth(filtros, req.user);
  }

  @Get('revenue/by-room-type')
  @Roles(Role.SUPER_ADMIN, Role.PROPIETARIO, Role.ADMIN, Role.EMPLEADO)
  @ApiOperation({ 
    summary: 'Ingresos por tipo de habitación',
    description: 'Ranking de ingresos generados por cada tipo de habitación'
  })
  @ApiResponse({ status: 200, description: 'Ingresos por tipo de habitación' })
  async getRevenueByRoomType(@Query() filtros: FiltrosKpiDto, @Request() req) {
    return this.reportesService.revenueByRoomType(filtros, req.user);
  }

  @Get('occupancy/by-hotel')
  @Roles(Role.SUPER_ADMIN, Role.PROPIETARIO, Role.ADMIN, Role.EMPLEADO)
  @ApiOperation({ 
    summary: 'Ocupación por hotel',
    description: 'Tasas de ocupación de cada hospedaje'
  })
  @ApiResponse({ status: 200, description: 'Ocupación por hotel' })
  async getOccupancyByHotel(@Query() filtros: FiltrosKpiDto, @Request() req) {
    return this.reportesService.occupancyByHotel(filtros, req.user);
  }

  @Get('occupancy/by-room-type')
  @Roles(Role.SUPER_ADMIN, Role.PROPIETARIO, Role.ADMIN, Role.EMPLEADO)
  @ApiOperation({ 
    summary: 'Ocupación por tipo de habitación',
    description: 'Tasas de ocupación por tipo de habitación'
  })
  @ApiResponse({ status: 200, description: 'Ocupación por tipo' })
  async getOccupancyByRoomType(@Query() filtros: FiltrosKpiDto, @Request() req) {
    return this.reportesService.occupancyByRoomType(filtros, req.user);
  }

  @Get('tourists/by-origin')
  @Roles(Role.SUPER_ADMIN, Role.PROPIETARIO, Role.ADMIN, Role.EMPLEADO)
  @ApiOperation({ 
    summary: 'Turistas por origen/procedencia',
    description: 'Análisis demográfico de turistas por ubicación'
  })
  @ApiResponse({ status: 200, description: 'Turistas por origen' })
  async getTouristsByOrigin(@Query() filtros: FiltrosKpiDto, @Request() req) {
    return this.reportesService.touristsByOrigin(filtros, req.user);
  }

  @Get('top-rooms')
  @Roles(Role.SUPER_ADMIN, Role.PROPIETARIO, Role.ADMIN, Role.EMPLEADO)
  @ApiOperation({ 
    summary: 'Top habitaciones más reservadas',
    description: 'Ranking de habitaciones por número de reservas e ingresos'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number, 
    description: 'Límite de resultados (default: 10)' 
  })
  @ApiResponse({ status: 200, description: 'Top habitaciones' })
  async getTopRooms(@Query() filtros: FiltrosKpiDto, @Request() req) {
    return this.reportesService.topRooms(filtros, req.user);
  }

  @Get('best-month')
  @Roles(Role.SUPER_ADMIN, Role.PROPIETARIO, Role.ADMIN, Role.EMPLEADO)
  @ApiOperation({ 
    summary: 'Mejor mes del año',
    description: 'Mes con mayor rendimiento en ingresos y reservas'
  })
  @ApiResponse({ status: 200, description: 'Mejor mes identificado' })
  async getBestMonth(@Query() filtros: FiltrosKpiDto, @Request() req) {
    return this.reportesService.bestMonth(filtros, req.user);
  }

  @Get('export')
  @Roles(Role.SUPER_ADMIN, Role.PROPIETARIO, Role.ADMIN, Role.EMPLEADO)
  @ApiOperation({ 
    summary: 'Exportar reportes a CSV/XLSX',
    description: 'Descarga cualquier reporte en formato CSV o Excel'
  })
  @ApiQuery({ 
    name: 'report', 
    required: true, 
    enum: [
      'kpis',
      'reservations_by_month',
      'reservations_by_status',
      'revenue_by_month',
      'revenue_by_room_type',
      'occupancy_by_hotel',
      'occupancy_by_room_type',
      'tourists_by_origin',
      'top_rooms',
      'best_month'
    ],
    description: 'Tipo de reporte a exportar'
  })
  @ApiQuery({ 
    name: 'format', 
    required: true, 
    enum: ['csv', 'xlsx'],
    description: 'Formato de exportación'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Archivo generado exitosamente',
    headers: {
      'Content-Disposition': {
        description: 'Attachment filename',
        schema: { type: 'string' }
      },
      'Content-Type': {
        description: 'MIME type',
        schema: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos o sin datos' })
  async exportReport(@Query() exportDto: ExportDto, @Request() req, @Res() res: Response) {
    try {
      const buffer = await this.reportesService.export(exportDto, req.user);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${exportDto.report}_${timestamp}.${exportDto.format}`;
      
      // Headers para descarga
      res.set({
        'Content-Type': exportDto.format === 'csv' 
          ? 'text/csv; charset=utf-8' 
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      });

      res.send(buffer);
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al generar el reporte');
    }
  }
}
