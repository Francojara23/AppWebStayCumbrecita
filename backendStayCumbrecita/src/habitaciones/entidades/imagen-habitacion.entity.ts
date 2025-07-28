import { Entity, Column, ManyToOne } from 'typeorm';
import { HabitacionEntity } from './habitacion.entity';
import { BaseEntityAudit } from '../../common/base.entity';

@Entity('imagenes_habitacion')
export class ImagenHabitacionEntity extends BaseEntityAudit {
  @Column({ length: 500 })
  url: string;

  @Column({ length: 255, nullable: true })
  descripcion?: string;

  @Column({ nullable: true })
  orden?: number;

  @Column({ length: 255, nullable: true, name: "public_id" })
  publicId?: string;

  @Column({ length: 100, nullable: true })
  formato?: string;

  @Column({ nullable: true })
  tamaño?: number;

  @ManyToOne(() => HabitacionEntity, habitacion => habitacion.imagenes)
  habitacion: HabitacionEntity;
}
