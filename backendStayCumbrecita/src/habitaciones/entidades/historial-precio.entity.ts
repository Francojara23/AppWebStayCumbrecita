import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityAudit } from '../../common/base.entity';
import { HabitacionEntity } from './habitacion.entity';

export enum AccionPrecio {
  CREAR = 'CREAR',
  ACTUALIZAR = 'ACTUALIZAR',
  ELIMINAR = 'ELIMINAR',
  RESTAURAR = 'RESTAURAR'
}

@Entity('historial_precios')
export class HistorialPrecioEntity extends BaseEntityAudit {
  @ManyToOne(() => HabitacionEntity)
  @JoinColumn({ name: 'habitacion_id' })
  habitacion: HabitacionEntity;

  @Column({ name: 'usuario_id' })
  usuarioId: string;

  @Column({
    type: 'enum',
    enum: AccionPrecio
  })
  accion: AccionPrecio;

  @Column('jsonb')
  payload: Record<string, any>;
} 