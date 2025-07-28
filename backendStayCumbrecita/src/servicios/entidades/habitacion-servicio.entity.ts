import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityAudit } from '../../common/base.entity';
import { HabitacionEntity } from '../../habitaciones/entidades/habitacion.entity';
import { ServicioCatalogo } from './servicio-catalogo.entity';

@Entity('habitacion_servicios')
export class HabitacionServicio extends BaseEntityAudit {
  @ManyToOne(() => HabitacionEntity, (h) => h.servicios)
  @JoinColumn({ name: 'habitacion_id' })
  habitacion: HabitacionEntity;

  @ManyToOne(() => ServicioCatalogo)
  @JoinColumn({ name: 'servicio_catalogo_id' })
  servicio: ServicioCatalogo;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  precioExtra?: number;

  @Column({ length: 255, nullable: true })
  observaciones?: string;

  @Column({ type: 'int', default: 0 })
  incrementoCapacidad: number;
} 