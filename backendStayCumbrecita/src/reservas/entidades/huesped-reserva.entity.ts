import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntityAudit } from "../../common/base.entity";
import { Reserva } from "./reserva.entity";
import { HabitacionEntity } from "../../habitaciones/entidades/habitacion.entity";

@Entity("huespedes_reserva")
export class HuespedReserva extends BaseEntityAudit {
  @ManyToOne(() => Reserva, (reserva) => reserva.huespedes)
  @JoinColumn({ name: "reserva_id" })
  reserva: Reserva;

  @ManyToOne(() => HabitacionEntity, { nullable: true })
  @JoinColumn({ name: "habitacion_id" })
  habitacion?: HabitacionEntity;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 100 })
  apellido: string;

  @Column({ length: 20 })
  dni: string;

  @Column({ length: 20, nullable: true })
  telefono?: string;

  @Column({ length: 255, nullable: true })
  email?: string;

  @Column({ default: false })
  esPrincipal: boolean; // true para quien hizo la reserva

  @Column({ type: "timestamp", nullable: true })
  fechaCheckin?: Date; // Fecha cuando se registró en el check-in
} 