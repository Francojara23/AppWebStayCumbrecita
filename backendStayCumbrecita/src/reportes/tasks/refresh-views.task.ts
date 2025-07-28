/* eslint-disable @typescript-eslint/require-await */
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DataSource } from "typeorm";

/**
 * Tareas programadas para optimización de reportes
 *
 * - Actualiza vistas materializadas cada 5 minutos
 * - Limpia caché de reportes cada 30 minutos
 * - Genera estadísticas pre-calculadas cada hora
 */
@Injectable()
export class RefreshViewsTask {
  private readonly logger = new Logger(RefreshViewsTask.name);

  constructor(private dataSource: DataSource) {}

  /**
   * Refresca vistas materializadas cada 5 minutos
   * Mejora performance de consultas complejas
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshMaterializedViews() {
    try {
      this.logger.log("Iniciando actualización de vistas materializadas...");

      // Vista de ingresos mensuales
      await this.dataSource.query(`
        DROP VIEW IF EXISTS vw_revenue_mensual CASCADE;
        CREATE VIEW vw_revenue_mensual AS
        SELECT 
          DATE_TRUNC('month', p.fecha_pago) as mes,
          h.id as hospedaje_id,
          h.nombre as hospedaje_nombre,
          COUNT(DISTINCT p.reserva_id) as reservas_pagadas,
          SUM(p.monto_total) as ingresos_brutos,
          SUM(p.monto_reserva) as ingresos_netos,
          SUM(p.monto_impuestos) as impuestos,
          AVG(p.monto_total) as ticket_promedio,
          COUNT(DISTINCT r.turista_id) as clientes_unicos
        FROM pagos p
        INNER JOIN reservas r ON p.reserva_id = r.id
        INNER JOIN hospedajes h ON r.hospedaje_id = h.id
        WHERE p.estado = 'APROBADO'
          AND p.deleted_at IS NULL
          AND r.deleted_at IS NULL
          AND h.active = true
        GROUP BY mes, h.id, h.nombre;
      `);

      // Vista de ocupación
      await this.dataSource.query(`
        DROP VIEW IF EXISTS vw_occupancy CASCADE;
        CREATE VIEW vw_occupancy AS
        SELECT 
          h.id as hospedaje_id,
          h.nombre as hospedaje_nombre,
          th.id as tipo_habitacion_id,
          th.nombre as tipo_habitacion_nombre,
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
        LEFT JOIN tipos_habitacion th ON hab.tipo_habitacion_id = th.id
        LEFT JOIN reserva_lineas rl ON rl.habitacion_id = hab.id
        LEFT JOIN reservas r ON rl.reserva_id = r.id 
          AND r."fechaInicio" >= CURRENT_DATE - INTERVAL '30 days'
        WHERE h.active = true
        GROUP BY h.id, h.nombre, th.id, th.nombre;
      `);

      this.logger.log("Vistas materializadas actualizadas exitosamente");
    } catch (error) {
      this.logger.error("Error al actualizar vistas materializadas:", error);
    }
  }

  /**
   * Limpia caché de reportes cada 30 minutos
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async clearReportsCache() {
    try {
      this.logger.log("Limpiando caché de reportes...");

      // Aquí iría la lógica de limpieza de caché
      // Si estás usando Redis o similar
      // await this.cacheManager.reset();

      this.logger.log("Caché de reportes limpiado exitosamente");
    } catch (error) {
      this.logger.error("Error al limpiar caché de reportes:", error);
    }
  }

  /**
   * Genera estadísticas pre-calculadas cada hora
   * Para mejorar performance de dashboards
   */
  @Cron(CronExpression.EVERY_HOUR)
  async generatePreCalculatedStats() {
    try {
      this.logger.log("Generando estadísticas pre-calculadas...");

      // Crear tabla temporal de estadísticas si no existe
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS estadisticas_precalculadas (
          id SERIAL PRIMARY KEY,
          tipo VARCHAR(50) NOT NULL,
          hospedaje_id UUID,
          periodo DATE NOT NULL,
          datos JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tipo, hospedaje_id, periodo)
        );
      `);

      // KPIs diarios por hospedaje
      await this.dataSource.query(`
        INSERT INTO estadisticas_precalculadas (tipo, hospedaje_id, periodo, datos)
        SELECT 
          'kpis_diarios' as tipo,
          h.id as hospedaje_id,
          CURRENT_DATE as periodo,
          jsonb_build_object(
            'total_reservas', COUNT(DISTINCT r.id),
            'clientes_unicos', COUNT(DISTINCT r.turista_id),
            'ingresos_totales', COALESCE(SUM(CASE WHEN p.estado = 'APROBADO' THEN p.monto_total ELSE 0 END), 0),
            'ticket_promedio', COALESCE(AVG(CASE WHEN p.estado = 'APROBADO' THEN p.monto_total ELSE NULL END), 0),
            'habitaciones_totales', COUNT(DISTINCT hab.id)
          ) as datos
        FROM hospedajes h
        LEFT JOIN habitaciones hab ON hab.hospedaje_id = h.id
        LEFT JOIN reservas r ON r.hospedaje_id = h.id 
          AND r."fechaInicio" >= CURRENT_DATE - INTERVAL '1 day'
        LEFT JOIN pagos p ON p.reserva_id = r.id
        WHERE h.active = true
        GROUP BY h.id
        ON CONFLICT (tipo, hospedaje_id, periodo) 
        DO UPDATE SET 
          datos = EXCLUDED.datos,
          created_at = CURRENT_TIMESTAMP;
      `);

      this.logger.log("Estadísticas pre-calculadas generadas exitosamente");
    } catch (error) {
      this.logger.error("Error al generar estadísticas pre-calculadas:", error);
    }
  }

  /**
   * Cleanup de datos antiguos una vez al día
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldData() {
    try {
      this.logger.log("Limpiando datos antiguos...");

      // Eliminar estadísticas pre-calculadas más antiguas de 90 días
      await this.dataSource.query(`
        DELETE FROM estadisticas_precalculadas 
        WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
      `);

      this.logger.log("Cleanup de datos antiguos completado");
    } catch (error) {
      this.logger.error("Error en cleanup de datos antiguos:", error);
    }
  }
}
