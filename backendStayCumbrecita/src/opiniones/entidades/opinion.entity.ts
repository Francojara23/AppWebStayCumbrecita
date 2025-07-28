import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityAudit } from '../../common/base.entity';
import { Hospedaje } from '../../hospedajes/entidades/hospedaje.entity';
import { Usuario } from '../../users/users.entity';
import { Reserva } from '../../reservas/entidades/reserva.entity';

@Entity('opiniones')
export class Opinion extends BaseEntityAudit {
  @ManyToOne(() => Hospedaje, { eager: true })
  @JoinColumn({ name: 'hospedaje_id' })
  hospedaje: Hospedaje;

  @ManyToOne(() => Usuario, { eager: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @ManyToOne(() => Reserva, { eager: true })
  @JoinColumn({ name: 'reserva_id' })
  reserva: Reserva;

  @Column({ 
    type: 'int', 
    nullable: true,
    comment: 'Calificación de 1 a 5 estrellas (opcional)' 
  })
  calificacion: number | null;

  @Column({ 
    type: 'text', 
    nullable: true,
    comment: 'Opinión textual del usuario (opcional)' 
  })
  comentario: string | null;

  @Column({ 
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Fecha en que se creó la opinión'
  })
  fechaOpinion: Date;

  @Column({ 
    type: 'boolean',
    default: true,
    comment: 'Si la opinión está visible públicamente' 
  })
  visible: boolean;

  @Column({ 
    type: 'text',
    nullable: true,
    comment: 'Respuesta del propietario a la opinión (opcional)' 
  })
  respuestaPropietario: string | null;

  @Column({ 
    type: 'timestamp',
    nullable: true,
    comment: 'Fecha de respuesta del propietario' 
  })
  fechaRespuesta: Date | null;
}
