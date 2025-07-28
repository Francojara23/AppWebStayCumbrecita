import { Entity, Column, OneToMany } from 'typeorm';
import { HabitacionEntity } from './habitacion.entity';
import { BaseEntityAudit } from '../../common/base.entity';

@Entity('tipos_habitacion')
export class TipoHabitacionEntity extends BaseEntityAudit {
  @Column()
  nombre: string;

  @Column('text')
  descripcion: string;

  @OneToMany(() => HabitacionEntity, habitacion => habitacion.tipoHabitacion)
  habitaciones: HabitacionEntity[];
}
