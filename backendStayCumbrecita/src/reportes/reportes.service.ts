/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import * as json2csv from "json2csv";
import * as ExcelJS from "exceljs";

import { Reserva } from "../reservas/entidades/reserva.entity";
import { Pago } from "../pagos/entidades/pago.entity";
import { Hospedaje } from "../hospedajes/entidades/hospedaje.entity";
import { HabitacionEntity } from "../habitaciones/entidades/habitacion.entity";
import { Usuario } from "../users/users.entity";
import { TipoHabitacionEntity } from "../habitaciones/entidades/tipo-habitacion.entity";
import { Empleado } from "../empleados/entidades/empleado.entity";

import { FiltrosKpiDto } from "./dto/filtros-kpi.dto";
import { ExportDto } from "./dto/export.dto";

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Reserva)
    private reservasRepository: Repository<Reserva>,
    @InjectRepository(Pago)
    private pagosRepository: Repository<Pago>,
    @InjectRepository(Hospedaje)
    private hospedajesRepository: Repository<Hospedaje>,
    @InjectRepository(HabitacionEntity)
    private habitacionesRepository: Repository<HabitacionEntity>,
    @InjectRepository(Usuario)
    private usuariosRepository: Repository<Usuario>,
    @InjectRepository(TipoHabitacionEntity)
    private tiposHabitacionRepository: Repository<TipoHabitacionEntity>,
    @InjectRepository(Empleado)
    private empleadosRepository: Repository<Empleado>,
    private dataSource: DataSource,
  ) {}

  /**
   * Resuelve qué hoteles puede ver el usuario según su rol
   */
  async resolveHotelFilter(
    user: any,
    hotelIdQuery?: string,
  ): Promise<string[]> {
    const userRole = user.role || user.roles?.[0];

    switch (userRole) {
      case "SUPER_ADMIN":
        // Super admin puede ver todo
        if (hotelIdQuery) {
          return [hotelIdQuery];
        }
        // Si no especifica hotel, devolver todos
        const allHotels = await this.hospedajesRepository.find({
          select: ["id"],
          where: { active: true },
        });
        return allHotels.map((h) => h.id);

      case "PROPIETARIO":
        // Propietario solo ve sus hoteles
        const ownedHotels = await this.hospedajesRepository.find({
          select: ["id"],
          where: {
            idOwnerHospedaje: user.id,
            active: true,
          },
        });
        const ownedIds = ownedHotels.map((h) => h.id);

        if (hotelIdQuery && !ownedIds.includes(hotelIdQuery)) {
          throw new ForbiddenException("No tienes acceso a este hospedaje");
        }

        return hotelIdQuery ? [hotelIdQuery] : ownedIds;

      case "ADMIN_HOTEL":
      case "EMPLEADO":
        // Empleado solo ve hoteles donde trabaja
        const empleado = await this.empleadosRepository.findOne({
          where: { usuario: { id: user.id } },
          relations: ["hospedaje"],
        });

        if (!empleado) {
          throw new ForbiddenException("No eres empleado de ningún hospedaje");
        }

        const employeeHotelId = empleado.hospedaje.id;

        if (hotelIdQuery && hotelIdQuery !== employeeHotelId) {
          throw new ForbiddenException("No tienes acceso a este hospedaje");
        }

        return [employeeHotelId];

      default:
        throw new ForbiddenException("No tienes acceso a los reportes");
    }
  }

  /**
   * Obtiene KPIs principales del dashboard
   */
  async getKPIs(filtros: FiltrosKpiDto, user: any) {
    const allowedHotels = await this.resolveHotelFilter(user, filtros.hotelId);

    const dateFilter = this.buildDateFilter(filtros.from, filtros.to);

    const kpis = await this.dataSource.query(
      `
      WITH stats AS (
        SELECT
          COUNT(DISTINCT r.id) as total_reservas,
          COUNT(DISTINCT r.turista_id) as clientes_unicos,
          COALESCE(SUM(CASE WHEN p.estado = 'APROBADO' THEN p.monto_total ELSE 0 END), 0) as ingresos_totales,
          COALESCE(AVG(CASE WHEN p.estado = 'APROBADO' THEN p.monto_total ELSE NULL END), 0) as ticket_promedio,
          COUNT(DISTINCT h.id) as hoteles_activos,
          COUNT(DISTINCT hab.id) as habitaciones_totales
        FROM reservas r
        LEFT JOIN pagos p ON p.reserva_id = r.id
        LEFT JOIN hospedajes h ON r.hospedaje_id = h.id
        LEFT JOIN habitaciones hab ON hab.hospedaje_id = h.id
        WHERE h.id = ANY($1)
          ${dateFilter.condition}
          AND r.deleted_at IS NULL
          AND h.active = true
      ),
      ocupacion AS (
        SELECT 
          COALESCE(
            COUNT(DISTINCT r.id) * 100.0 / NULLIF(COUNT(DISTINCT hab.id), 0), 
            0
          ) as tasa_ocupacion
        FROM habitaciones hab
        LEFT JOIN hospedajes h ON hab.hospedaje_id = h.id
        LEFT JOIN reservas r ON r.hospedaje_id = h.id 
          AND r.estado IN ('CHECK_IN', 'CHECK_OUT', 'CERRADA')
          ${dateFilter.condition ? "AND" + dateFilter.condition.replace("WHERE", "") : ""}
        WHERE h.id = ANY($1) AND h.active = true
      )
      SELECT 
        s.*,
        o.tasa_ocupacion
      FROM stats s, ocupacion o
    `,
      [allowedHotels, ...dateFilter.params],
    );

    return (
      kpis[0] || {
        total_reservas: 0,
        clientes_unicos: 0,
        ingresos_totales: 0,
        ticket_promedio: 0,
        hoteles_activos: 0,
        habitaciones_totales: 0,
        tasa_ocupacion: 0,
      }
    );
  }

  /**
   * Reservas agrupadas por mes
   */
  async reservasByMonth(filtros: FiltrosKpiDto, user: any) {
    const allowedHotels = await this.resolveHotelFilter(user, filtros.hotelId);
    const dateFilter = this.buildDateFilter(filtros.from, filtros.to);

    return this.dataSource.query(
      `
      SELECT 
        DATE_TRUNC('month', r."fechaInicio") as mes,
        COUNT(r.id) as total_reservas,
        COUNT(CASE WHEN r.estado = 'CERRADA' THEN 1 END) as reservas_completadas,
        COUNT(CASE WHEN r.estado = 'CANCELADA' THEN 1 END) as reservas_canceladas,
        COALESCE(AVG(p.monto_total), 0) as valor_promedio
      FROM reservas r
      LEFT JOIN pagos p ON p.reserva_id = r.id AND p.estado = 'APROBADO'
      LEFT JOIN hospedajes h ON r.hospedaje_id = h.id
      WHERE h.id = ANY($1)
        ${dateFilter.condition}
        AND r.deleted_at IS NULL
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT ${filtros.limit || 12}
    `,
      [allowedHotels, ...dateFilter.params],
    );
  }

  /**
   * Reservas agrupadas por estado
   */
  async reservasByStatus(filtros: FiltrosKpiDto, user: any) {
    const allowedHotels = await this.resolveHotelFilter(user, filtros.hotelId);
    const dateFilter = this.buildDateFilter(filtros.from, filtros.to);

    return this.dataSource.query(
      `
      SELECT 
        r.estado,
        COUNT(r.id) as cantidad,
        ROUND(COUNT(r.id) * 100.0 / SUM(COUNT(r.id)) OVER (), 2) as porcentaje,
        COALESCE(SUM(p.monto_total), 0) as valor_total
      FROM reservas r
      LEFT JOIN pagos p ON p.reserva_id = r.id AND p.estado = 'APROBADO'
      LEFT JOIN hospedajes h ON r.hospedaje_id = h.id
      WHERE h.id = ANY($1)
        ${dateFilter.condition}
        AND r.deleted_at IS NULL
      GROUP BY r.estado
      ORDER BY cantidad DESC
    `,
      [allowedHotels, ...dateFilter.params],
    );
  }

  /**
   * Ingresos agrupados por mes
   */
  async revenueByMonth(filtros: FiltrosKpiDto, user: any) {
    const allowedHotels = await this.resolveHotelFilter(user, filtros.hotelId);
    const dateFilter = this.buildDateFilter(filtros.from, filtros.to);

    return this.dataSource.query(
      `
      SELECT 
        DATE_TRUNC('month', p.fecha_pago) as mes,
        COUNT(DISTINCT p.reserva_id) as reservas_pagadas,
        SUM(p.monto_total) as ingresos_brutos,
        SUM(p.monto_reserva) as ingresos_netos,
        SUM(p.monto_impuestos) as impuestos,
        AVG(p.monto_total) as ticket_promedio,
        COUNT(DISTINCT r.turista_id) as clientes_unicos
      FROM pagos p
      INNER JOIN reservas r ON p.reserva_id = r.id
      INNER JOIN hospedajes h ON r.hospedaje_id = h.id
      WHERE h.id = ANY($1)
        AND p.estado = 'APROBADO'
        ${dateFilter.condition ? dateFilter.condition.replace("r.fechaInicio", "p.fecha_pago") : ""}
        AND p.deleted_at IS NULL
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT ${filtros.limit || 12}
    `,
      [allowedHotels, ...dateFilter.params],
    );
  }

  /**
   * Ingresos por tipo de habitación
   */
  async revenueByRoomType(filtros: FiltrosKpiDto, user: any) {
    const allowedHotels = await this.resolveHotelFilter(user, filtros.hotelId);
    const dateFilter = this.buildDateFilter(filtros.from, filtros.to);

    return this.dataSource.query(
      `
      SELECT 
        th.nombre as tipo_habitacion,
        COUNT(DISTINCT r.id) as reservas,
        SUM(p.monto_total) as ingresos_totales,
        AVG(p.monto_total) as ingreso_promedio,
        SUM(p.monto_total) * 100.0 / SUM(SUM(p.monto_total)) OVER () as porcentaje_ingresos
      FROM reservas r
      INNER JOIN pagos p ON p.reserva_id = r.id AND p.estado = 'APROBADO'
      INNER JOIN reserva_lineas rl ON rl.reserva_id = r.id
      INNER JOIN habitaciones hab ON rl.habitacion_id = hab.id
      INNER JOIN tipos_habitacion th ON hab.tipo_habitacion_id = th.id
      INNER JOIN hospedajes h ON r.hospedaje_id = h.id
      WHERE h.id = ANY($1)
        ${dateFilter.condition}
        ${filtros.roomTypeId ? "AND th.id = $" + (dateFilter.params.length + 2) : ""}
        AND p.deleted_at IS NULL
      GROUP BY th.id, th.nombre
      ORDER BY ingresos_totales DESC
      LIMIT ${filtros.limit || 10}
    `,
      [
        allowedHotels,
        ...dateFilter.params,
        ...(filtros.roomTypeId ? [filtros.roomTypeId] : []),
      ],
    );
  }

  /**
   * Ocupación por hotel
   */
  async occupancyByHotel(filtros: FiltrosKpiDto, user: any) {
    const allowedHotels = await this.resolveHotelFilter(user, filtros.hotelId);
    const dateFilter = this.buildDateFilter(filtros.from, filtros.to);

    return this.dataSource.query(
      `
      SELECT 
        h.nombre as hotel,
        COUNT(DISTINCT hab.id) as habitaciones_totales,
        COUNT(DISTINCT CASE 
          WHEN r.estado IN ('CHECK_IN', 'CHECK_OUT', 'CERRADA') 
          THEN rl.habitacion_id 
        END) as habitaciones_ocupadas,
        ROUND(
          COUNT(DISTINCT CASE 
            WHEN r.estado IN ('CHECK_IN', 'CHECK_OUT', 'CERRADA') 
            THEN rl.habitacion_id 
          END) * 100.0 / NULLIF(COUNT(DISTINCT hab.id), 0), 
          2
        ) as tasa_ocupacion,
        COUNT(DISTINCT r.id) as total_reservas
      FROM hospedajes h
      LEFT JOIN habitaciones hab ON hab.hospedaje_id = h.id
      LEFT JOIN reserva_lineas rl ON rl.habitacion_id = hab.id
      LEFT JOIN reservas r ON rl.reserva_id = r.id 
        ${dateFilter.condition ? "AND" + dateFilter.condition.replace("WHERE", "") : ""}
      WHERE h.id = ANY($1) AND h.active = true
      GROUP BY h.id, h.nombre
      ORDER BY tasa_ocupacion DESC
    `,
      [allowedHotels, ...dateFilter.params],
    );
  }

  /**
   * Ocupación por tipo de habitación
   */
  async occupancyByRoomType(filtros: FiltrosKpiDto, user: any) {
    const allowedHotels = await this.resolveHotelFilter(user, filtros.hotelId);
    const dateFilter = this.buildDateFilter(filtros.from, filtros.to);

    return this.dataSource.query(
      `
      SELECT 
        th.nombre as tipo_habitacion,
        COUNT(DISTINCT hab.id) as habitaciones_totales,
        COUNT(DISTINCT CASE 
          WHEN r.estado IN ('CHECK_IN', 'CHECK_OUT', 'CERRADA') 
          THEN hab.id 
        END) as habitaciones_ocupadas,
        ROUND(
          COUNT(DISTINCT CASE 
            WHEN r.estado IN ('CHECK_IN', 'CHECK_OUT', 'CERRADA') 
            THEN hab.id 
          END) * 100.0 / NULLIF(COUNT(DISTINCT hab.id), 0), 
          2
        ) as tasa_ocupacion
      FROM tipos_habitacion th
      LEFT JOIN habitaciones hab ON hab.tipo_habitacion_id = th.id
      LEFT JOIN hospedajes h ON hab.hospedaje_id = h.id
      LEFT JOIN reserva_lineas rl ON rl.habitacion_id = hab.id
      LEFT JOIN reservas r ON rl.reserva_id = r.id 
        ${dateFilter.condition ? "AND" + dateFilter.condition.replace("WHERE", "") : ""}
      WHERE h.id = ANY($1) AND h.active = true
      GROUP BY th.id, th.nombre
      ORDER BY tasa_ocupacion DESC
    `,
      [allowedHotels, ...dateFilter.params],
    );
  }

  /**
   * Turistas por origen/procedencia
   */
  async touristsByOrigin(filtros: FiltrosKpiDto, user: any) {
    const allowedHotels = await this.resolveHotelFilter(user, filtros.hotelId);
    const dateFilter = this.buildDateFilter(filtros.from, filtros.to);

    return this.dataSource.query(
      `
      SELECT 
        COALESCE(u.direccion, 'No especificado') as origen,
        COUNT(DISTINCT u.id) as turistas_unicos,
        COUNT(r.id) as total_reservas,
        AVG(p.monto_total) as gasto_promedio,
        SUM(p.monto_total) as gasto_total
      FROM usuarios u
      INNER JOIN reservas r ON r.turista_id = u.id
      LEFT JOIN pagos p ON p.reserva_id = r.id AND p.estado = 'APROBADO'
      INNER JOIN hospedajes h ON r.hospedaje_id = h.id
      WHERE h.id = ANY($1)
        ${dateFilter.condition}
        AND r.deleted_at IS NULL
      GROUP BY u.direccion
      ORDER BY turistas_unicos DESC
      LIMIT ${filtros.limit || 10}
    `,
      [allowedHotels, ...dateFilter.params],
    );
  }

  /**
   * Top habitaciones más reservadas
   */
  async topRooms(filtros: FiltrosKpiDto, user: any) {
    const allowedHotels = await this.resolveHotelFilter(user, filtros.hotelId);
    const dateFilter = this.buildDateFilter(filtros.from, filtros.to);

    return this.dataSource.query(
      `
      SELECT 
        hab.nombre as habitacion,
        h.nombre as hotel,
        th.nombre as tipo,
        COUNT(r.id) as total_reservas,
        SUM(p.monto_total) as ingresos_generados,
        AVG(p.monto_total) as precio_promedio,
        ROUND(
          COUNT(r.id) * 100.0 / SUM(COUNT(r.id)) OVER (), 
          2
        ) as porcentaje_reservas
      FROM habitaciones hab
      INNER JOIN hospedajes h ON hab.hospedaje_id = h.id
      INNER JOIN tipos_habitacion th ON hab.tipo_habitacion_id = th.id
      LEFT JOIN reserva_lineas rl ON rl.habitacion_id = hab.id
      LEFT JOIN reservas r ON rl.reserva_id = r.id 
        ${dateFilter.condition ? "AND" + dateFilter.condition.replace("WHERE", "") : ""}
      LEFT JOIN pagos p ON p.reserva_id = r.id AND p.estado = 'APROBADO'
      WHERE h.id = ANY($1) AND h.active = true
      GROUP BY hab.id, hab.nombre, h.nombre, th.nombre
      ORDER BY total_reservas DESC
      LIMIT ${filtros.limit || 10}
    `,
      [allowedHotels, ...dateFilter.params],
    );
  }

  /**
   * Mejor mes del año
   */
  async bestMonth(filtros: FiltrosKpiDto, user: any) {
    const allowedHotels = await this.resolveHotelFilter(user, filtros.hotelId);
    const dateFilter = this.buildDateFilter(filtros.from, filtros.to);

    return this.dataSource.query(
      `
      SELECT 
        EXTRACT(MONTH FROM r."fechaInicio") as mes_numero,
        TO_CHAR(DATE_TRUNC('month', r."fechaInicio"), 'Month') as mes_nombre,
        COUNT(r.id) as total_reservas,
        SUM(p.monto_total) as ingresos_totales,
        COUNT(DISTINCT r.turista_id) as clientes_unicos,
        AVG(p.monto_total) as ticket_promedio
      FROM reservas r
      LEFT JOIN pagos p ON p.reserva_id = r.id AND p.estado = 'APROBADO'
      INNER JOIN hospedajes h ON r.hospedaje_id = h.id
      WHERE h.id = ANY($1)
        ${dateFilter.condition}
        AND r.deleted_at IS NULL
      GROUP BY mes_numero, mes_nombre
      ORDER BY ingresos_totales DESC, total_reservas DESC
      LIMIT 1
    `,
      [allowedHotels, ...dateFilter.params],
    );
  }

  /**
   * Exportar reportes a CSV o XLSX
   */
  async export(exportDto: ExportDto, user: any): Promise<Buffer> {
    let data: any[];

    const filtros: FiltrosKpiDto = {
      hotelId: exportDto.hotelId,
      from: exportDto.from,
      to: exportDto.to,
    };

    // Obtener datos según el tipo de reporte
    switch (exportDto.report) {
      case "kpis":
        data = [await this.getKPIs(filtros, user)];
        break;
      case "reservations_by_month":
        data = await this.reservasByMonth(filtros, user);
        break;
      case "reservations_by_status":
        data = await this.reservasByStatus(filtros, user);
        break;
      case "revenue_by_month":
        data = await this.revenueByMonth(filtros, user);
        break;
      case "revenue_by_room_type":
        data = await this.revenueByRoomType(filtros, user);
        break;
      case "occupancy_by_hotel":
        data = await this.occupancyByHotel(filtros, user);
        break;
      case "occupancy_by_room_type":
        data = await this.occupancyByRoomType(filtros, user);
        break;
      case "tourists_by_origin":
        data = await this.touristsByOrigin(filtros, user);
        break;
      case "top_rooms":
        data = await this.topRooms(filtros, user);
        break;
      case "best_month":
        data = await this.bestMonth(filtros, user);
        break;
      default:
        throw new BadRequestException("Tipo de reporte no válido");
    }

    if (!data || data.length === 0) {
      throw new BadRequestException("No hay datos para exportar");
    }

    // Generar archivo según formato
    if (exportDto.format === "csv") {
      return this.generateCSV(data);
    } else {
      return this.generateXLSX(data, exportDto.report);
    }
  }

  /**
   * Genera CSV
   */
  private generateCSV(data: any[]): Buffer {
    const csv = json2csv.parse(data);
    return Buffer.from(csv, "utf8");
  }

  /**
   * Genera XLSX
   */
  private async generateXLSX(data: any[], reportType: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Reporte");

    if (data.length > 0) {
      // Headers
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);

      // Data
      data.forEach((row) => {
        worksheet.addRow(Object.values(row));
      });

      // Styling
      worksheet.getRow(1).font = { bold: true };
      worksheet.columns.forEach((column) => {
        column.width = 15;
      });
    }

    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  /**
   * Construye filtro de fechas para SQL
   */
  private buildDateFilter(from?: string, to?: string) {
    const params: any[] = [];
    let condition = "";

    if (from && to) {
      condition =
        "AND r.fechaInicio BETWEEN $" +
        (params.length + 2) +
        " AND $" +
        (params.length + 3);
      params.push(from, to);
    } else if (from) {
      condition = "AND r.fechaInicio >= $" + (params.length + 2);
      params.push(from);
    } else if (to) {
      condition = "AND r.fechaInicio <= $" + (params.length + 2);
      params.push(to);
    }

    return { condition, params };
  }
}
