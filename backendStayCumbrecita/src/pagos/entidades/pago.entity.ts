import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntityAudit } from 'src/common/base.entity';
import { Reserva } from '../../reservas/entidades/reserva.entity';
import { Publicidad } from '../../publicidad/entidades/publicidad.entity';
import { Tarjeta } from '../../tarjetas/entidades/tarjeta.entity';
import { Usuario } from '../../users/users.entity';
import { EncryptionTransformer } from '../../common/transformers/encryption.transformer';

export enum MetodoPago {
  TARJETA = 'TARJETA',
  TRANSFERENCIA = 'TRANSFERENCIA'
}

export enum EstadoPago {
  PENDIENTE = 'PENDIENTE',
  PROCESANDO = 'PROCESANDO',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
  CANCELADO = 'CANCELADO',
  EXPIRADO = 'EXPIRADO',
  FALLIDO = 'FALLIDO'
}

@Entity('pagos')
export class Pago extends BaseEntityAudit {
  @ManyToOne(() => Reserva, { nullable: true })
  @JoinColumn({ name: 'reserva_id' })
  reserva: Reserva | null;

  @ManyToOne(() => Publicidad, { nullable: true })
  @JoinColumn({ name: 'publicidad_id' })
  publicidad: Publicidad | null;

  @ManyToOne(() => Tarjeta, { nullable: true })
  @JoinColumn({ name: 'tarjeta_id' })
  tarjeta: Tarjeta | null;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({
    type: 'enum',
    enum: MetodoPago,
    name: 'metodo'
  })
  metodo: MetodoPago;

  @Column({
    name: 'numero_encriptado',
    nullable: true,
    transformer: new EncryptionTransformer()
  })
  numeroEncriptado: string;

  @Column({
    name: 'titular_encriptado',
    nullable: true,
    transformer: new EncryptionTransformer()
  })
  titularEncriptado: string;

  @Column({
    name: 'cve_encriptado',
    nullable: true,
    transformer: new EncryptionTransformer()
  })
  cveEncriptado: string;

  @Column({
    name: 'vencimiento_encriptado',
    nullable: true,
    transformer: new EncryptionTransformer()
  })
  vencimientoEncriptado: string;

  @Column({
    name: 'monto_reserva',
    type: 'decimal',
    precision: 10,
    scale: 2
  })
  montoReserva: number;

  @Column({
    name: 'monto_impuestos',
    type: 'decimal',
    precision: 10,
    scale: 2
  })
  montoImpuestos: number;

  @Column({
    name: 'monto_total',
    type: 'decimal',
    precision: 10,
    scale: 2
  })
  montoTotal: number;

  @Column({
    name: 'fecha_pago',
    type: 'timestamp'
  })
  fechaPago: Date;

  @Column({
    type: 'enum',
    enum: EstadoPago,
    name: 'estado'
  })
  estado: EstadoPago;
}
