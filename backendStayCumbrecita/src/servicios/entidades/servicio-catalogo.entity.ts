import { Entity, Column } from 'typeorm';
import { BaseEntityAudit } from '../../common/base.entity';

export enum TipoServicio {
  HOSPEDAJE = 'HOSPEDAJE',
  HABITACION = 'HABITACION'
}

@Entity('servicios_catalogo')
export class ServicioCatalogo extends BaseEntityAudit {
  @Column({ length: 80 })
  nombre: string;

  @Column({ length: 255, nullable: true })
  descripcion?: string;

  @Column({ length: 120, nullable: true })
  iconoUrl?: string;

  @Column({
    type: 'enum',
    enum: TipoServicio
  })
  tipo: TipoServicio;
} 