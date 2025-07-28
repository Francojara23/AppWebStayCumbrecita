import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityAudit } from '../../common/base.entity';
import { Usuario } from '../../users/users.entity';
import { TipoNotificacion } from '../../common/enums/tipo-notificacion.enum';

@Entity('notificaciones')
export class Notificacion extends BaseEntityAudit {
  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ length: 120 })
  titulo: string;

  @Column('text')
  cuerpo: string;

  @Column({ type: 'enum', enum: TipoNotificacion })
  tipo: TipoNotificacion;

  @Column({ type: 'jsonb', nullable: true })
  data?: any;

  @Column({ default: false })
  leida: boolean;

  @Column({ default: false })
  canalEmail: boolean;

  @Column({ default: false })
  canalPush: boolean;

  @Column({ default: false })
  canalInApp: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date;
}
