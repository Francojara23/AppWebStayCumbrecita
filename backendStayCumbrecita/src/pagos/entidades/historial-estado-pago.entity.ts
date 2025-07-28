import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityAudit } from '../../common/base.entity';
import { Pago, EstadoPago } from './pago.entity';
import { Usuario } from '../../users/users.entity';

@Entity('historial_estado_pago')
export class HistorialEstadoPago extends BaseEntityAudit {
  @ManyToOne(() => Pago)
  @JoinColumn({ name: 'pago_id' })
  pago: Pago;

  @Column({
    type: 'enum',
    enum: EstadoPago,
    nullable: true,
    name: 'estado_anterior'
  })
  estadoAnterior: EstadoPago | null;

  @Column({
    type: 'enum',
    enum: EstadoPago,
    name: 'estado_nuevo'
  })
  estadoNuevo: EstadoPago;

  @Column({ type: 'text', nullable: true })
  motivo?: string;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Usuario;

  @Column({ type: 'jsonb', nullable: true })
  metadatos?: any;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;
} 