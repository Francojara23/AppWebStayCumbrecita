-- Vista materializada para reportes de ocupación
-- Calcula tasas de ocupación por hotel y tipo de habitación

CREATE OR REPLACE VIEW vw_occupancy AS
SELECT 
  h.id as hospedaje_id,
  h.nombre as hospedaje_nombre,
  th.id as tipo_habitacion_id,
  th.nombre as tipo_habitacion_nombre,
  COUNT(DISTINCT hab.id) as habitaciones_totales,
  COUNT(DISTINCT CASE 
    WHEN r.estado IN ('CHECK_IN', 'CHECK_OUT', 'CERRADA') 
      AND r.fechaInicio <= CURRENT_DATE 
      AND r.fechaFin >= CURRENT_DATE
    THEN rl.habitacion_id 
  END) as habitaciones_ocupadas_hoy,
  COUNT(DISTINCT CASE 
    WHEN r.estado IN ('CHECK_IN', 'CHECK_OUT', 'CERRADA') 
      AND r.fechaInicio >= CURRENT_DATE - INTERVAL '30 days'
    THEN rl.habitacion_id 
  END) as habitaciones_ocupadas_mes,
  ROUND(
    COUNT(DISTINCT CASE 
      WHEN r.estado IN ('CHECK_IN', 'CHECK_OUT', 'CERRADA') 
        AND r.fechaInicio <= CURRENT_DATE 
        AND r.fechaFin >= CURRENT_DATE
      THEN rl.habitacion_id 
    END) * 100.0 / NULLIF(COUNT(DISTINCT hab.id), 0), 
    2
  ) as tasa_ocupacion_actual,
  ROUND(
    COUNT(DISTINCT CASE 
      WHEN r.estado IN ('CHECK_IN', 'CHECK_OUT', 'CERRADA') 
        AND r.fechaInicio >= CURRENT_DATE - INTERVAL '30 days'
      THEN rl.habitacion_id 
    END) * 100.0 / NULLIF(COUNT(DISTINCT hab.id), 0), 
    2
  ) as tasa_ocupacion_mensual,
  COUNT(DISTINCT r.id) as total_reservas_mes
FROM hospedajes h
LEFT JOIN habitaciones hab ON hab.hospedaje_id = h.id AND hab.active = true
LEFT JOIN tipos_habitacion th ON hab.tipo_habitacion_id = th.id
LEFT JOIN reserva_lineas rl ON rl.habitacion_id = hab.id
LEFT JOIN reservas r ON rl.reserva_id = r.id 
  AND r.deleted_at IS NULL
  AND r.fechaInicio >= CURRENT_DATE - INTERVAL '30 days'
WHERE h.active = true
GROUP BY 
  h.id, 
  h.nombre, 
  th.id, 
  th.nombre
ORDER BY 
  h.nombre, 
  th.nombre; 