-- Vista materializada para reportes de ingresos mensuales
-- Optimiza consultas frecuentes de revenue by month

CREATE OR REPLACE VIEW vw_revenue_mensual AS
SELECT 
  DATE_TRUNC('month', p.fecha_pago) as mes,
  h.id as hospedaje_id,
  h.nombre as hospedaje_nombre,
  COUNT(DISTINCT p.reserva_id) as reservas_pagadas,
  SUM(p.monto_total) as ingresos_brutos,
  SUM(p.monto_reserva) as ingresos_netos,
  SUM(p.monto_impuestos) as impuestos,
  AVG(p.monto_total) as ticket_promedio,
  COUNT(DISTINCT r.turista_id) as clientes_unicos,
  EXTRACT(YEAR FROM p.fecha_pago) as año,
  EXTRACT(MONTH FROM p.fecha_pago) as mes_numero
FROM pagos p
INNER JOIN reservas r ON p.reserva_id = r.id
INNER JOIN hospedajes h ON r.hospedaje_id = h.id
WHERE p.estado = 'APROBADO'
  AND p.deleted_at IS NULL
  AND r.deleted_at IS NULL
  AND h.active = true
GROUP BY 
  DATE_TRUNC('month', p.fecha_pago),
  h.id, 
  h.nombre,
  EXTRACT(YEAR FROM p.fecha_pago),
  EXTRACT(MONTH FROM p.fecha_pago)
ORDER BY mes DESC; 