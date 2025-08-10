import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityAudit } from '../../common/base.entity';
import { Reserva } from '../../reservas/entidades/reserva.entity';
import { EncryptionTransformer } from '../../common/transformers/encryption.transformer';
import { TipoTarjeta } from './tarjeta.entity';

/**
 * Entidad temporal para tarjetas usadas en check-in
 * Se elimina automáticamente al hacer checkout
 * Es el ÚNICO caso donde se permite DELETE en el sistema
 */
@Entity('tarjetas_checkin')
export class TarjetaCheckin extends BaseEntityAudit {
  @ManyToOne(() => Reserva, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reserva_id' })
  reserva: Reserva;

  @Column({ length: 100 })
  titular: string;

  @Column({
    type: 'varchar',
    length: 64,
    transformer: new EncryptionTransformer()
  })
  numero: string;

  @Column({ length: 50 })
  entidad: string;

  @Column({
    type: 'varchar',
    length: 32,
    transformer: new EncryptionTransformer()
  })
  vencimiento: string;

  @Column({
    type: 'varchar',
    length: 32,
    transformer: new EncryptionTransformer()
  })
  cve: string;

  @Column({
    type: 'enum',
    enum: TipoTarjeta
  })
  tipo: TipoTarjeta;
}