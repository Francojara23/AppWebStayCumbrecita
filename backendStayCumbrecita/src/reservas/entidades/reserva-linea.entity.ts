import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntityAudit } from "../../common/base.entity";
import { Reserva } from "./reserva.entity";
import { HabitacionEntity } from "../../habitaciones/entidades/habitacion.entity";

@Entity("reserva_lineas")
export class ReservaLinea extends BaseEntityAudit {
  @ManyToOne(() => Reserva, (reserva) => reserva.lineas)
  @JoinColumn({ name: "reserva_id" })
  reserva: Reserva;

  @ManyToOne(() => HabitacionEntity)
  @JoinColumn({ name: "habitacion_id" })
  habitacion: HabitacionEntity;

  @Column({ type: "numeric", precision: 10, scale: 2 })
  precioBase: number;

  @Column({ type: "numeric", precision: 10, scale: 2, default: 0 })
  suplementos: number;

  @Column({ type: "numeric", precision: 10, scale: 2 })
  precioFinal: number;

  @Column({ type: "int" })
  personas: number;
}
