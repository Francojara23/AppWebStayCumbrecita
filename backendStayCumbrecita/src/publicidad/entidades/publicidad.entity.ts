import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntityAudit } from '../../common/base.entity';
import { Hospedaje } from '../../hospedajes/entidades/hospedaje.entity';
import { Usuario } from '../../users/users.entity';
import { Pago } from '../../pagos/entidades/pago.entity';

export enum EstadoPublicidad {
  ACTIVA = 'ACTIVA',
  EXPIRADA = 'EXPIRADA',
  CANCELADA = 'CANCELADA'
}

@Entity('publicidades')
export class Publicidad extends BaseEntityAudit {
  @ManyToOne(() => Hospedaje, { eager: true })
  @JoinColumn({ name: 'hospedaje_id' })
  hospedaje: Hospedaje;

  @ManyToOne(() => Usuario, { eager: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    comment: 'Monto pagado por esta publicidad'
  })
  monto: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: 'Monto total acumulado para este hospedaje (suma de todas las publicidades activas)'
  })
  montoAcumulado: number;

  @Column({
    type: 'timestamp',
    comment: 'Fecha de inicio de la publicidad'
  })
  fechaInicio: Date;

  @Column({
    type: 'timestamp',
    comment: 'Fecha de fin de la publicidad (30 días después del inicio)'
  })
  fechaFin: Date;

  @Column({
    type: 'enum',
    enum: EstadoPublicidad,
    default: EstadoPublicidad.ACTIVA
  })
  estado: EstadoPublicidad;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Si está configurada la renovación automática mensual'
  })
  renovacionAutomatica: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Fecha del último intento de renovación automática'
  })
  fechaUltimaRenovacion?: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Motivo de cancelación o falla de renovación'
  })
  motivoCancelacion?: string;

  @OneToMany(() => Pago, pago => pago.publicidad)
  pagos: Pago[];

  /**
   * Verifica si la publicidad está vigente
   */
  estaVigente(): boolean {
    const ahora = new Date();
    return this.estado === EstadoPublicidad.ACTIVA && 
           this.fechaFin > ahora;
  }

  /**
   * Verifica si necesita renovación automática
   */
  necesitaRenovacion(): boolean {
    if (!this.renovacionAutomatica || this.estado !== EstadoPublicidad.ACTIVA) {
      return false;
    }
    
    const ahora = new Date();
    const tiempoRestante = this.fechaFin.getTime() - ahora.getTime();
    const unDiaEnMs = 24 * 60 * 60 * 1000;
    
    // Renovar cuando queden menos de 24 horas
    return tiempoRestante <= unDiaEnMs;
  }
}
