import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityAudit } from '../../common/base.entity';
import { Hospedaje } from '../../hospedajes/entidades/hospedaje.entity';
import { ServicioCatalogo } from './servicio-catalogo.entity';

@Entity('hospedaje_servicios')
export class HospedajeServicio extends BaseEntityAudit {
  @ManyToOne(() => Hospedaje, (h) => h.servicios)
  @JoinColumn({ name: 'hospedaje_id' })
  hospedaje: Hospedaje;

  @ManyToOne(() => ServicioCatalogo)
  @JoinColumn({ name: 'servicio_catalogo_id' })
  servicio: ServicioCatalogo;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  precioExtra?: number;

  @Column({ length: 255, nullable: true })
  observaciones?: string;
} 