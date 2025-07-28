import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TipoHabitacionEntity } from './tipo-habitacion.entity';
import { ImagenHabitacionEntity } from './imagen-habitacion.entity';
import { Hospedaje } from '../../hospedajes/entidades/hospedaje.entity';
import { BaseEntityAudit } from '../../common/base.entity';
import { TipoAjustePrecio } from '../../common/enums/tipo-ajuste-precio.enum';
import { HabitacionServicio } from '../../servicios/entidades/habitacion-servicio.entity';

interface AjustePrecio {
  tipo: TipoAjustePrecio;
  desde?: Date;
  hasta?: Date;
  suplemento?: number;
  incrementoPct?: number;
  active: boolean;
}

@Entity('habitaciones')
export class HabitacionEntity extends BaseEntityAudit {
  @ManyToOne(() => Hospedaje, hospedaje => hospedaje.habitaciones)
  @JoinColumn({ name: 'hospedaje_id' })
  hospedaje: Hospedaje;

  @Column()
  nombre: string;

  @Column('text')
  descripcionCorta: string;

  @Column('text')
  descripcionLarga: string;

  @Column()
  capacidad: number;

  @OneToMany(() => HabitacionServicio, servicio => servicio.habitacion)
  servicios: HabitacionServicio[];

  @ManyToOne(() => TipoHabitacionEntity)
  @JoinColumn({ name: 'tipo_habitacion_id' })
  tipoHabitacion: TipoHabitacionEntity;

  @OneToMany(() => ImagenHabitacionEntity, imagen => imagen.habitacion)
  imagenes: ImagenHabitacionEntity[];

  @Column({ name: 'precio_base', type: 'numeric', precision: 10, scale: 2, default: 0 })
  precioBase: number;

  @Column({ name: 'ajustes_precio', type: 'jsonb', default: '[]' })
  ajustesPrecio: AjustePrecio[];
}
