import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { BaseEntityAudit } from "../../common/base.entity";
import { Hospedaje } from "../../hospedajes/entidades/hospedaje.entity";
import { Usuario } from "../../users/users.entity";
import { ReservaLinea } from "./reserva-linea.entity.js";
import { Pago } from "../../pagos/entidades/pago.entity";

import { HuespedReserva } from "./huesped-reserva.entity";
import { EstadoReserva } from "../../common/enums/estado-reserva.enum";

@Entity("reservas")
export class Reserva extends BaseEntityAudit {
  @Column({ type: "text", nullable: true })
  codigoQrUrl?: string;

  @ManyToOne(() => Hospedaje)
  @JoinColumn({ name: "hospedaje_id" })
  hospedaje: Hospedaje;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: "turista_id" })
  turista: Usuario;

  @Column({ type: "timestamp" })
  fechaInicio: Date;

  @Column({ type: "timestamp" })
  fechaFin: Date;

  @Column({
    type: "enum",
    enum: EstadoReserva,
    default: EstadoReserva.CREADA,
  })
  estado: EstadoReserva;

  @Column({ type: "numeric", precision: 10, scale: 2, nullable: true })
  montoTotal?: number;

  @Column({ type: "numeric", precision: 10, scale: 2, nullable: true })
  impuestos21?: number;

  @Column({ type: "text", nullable: true })
  observacion?: string;

  @OneToMany(() => ReservaLinea, (linea) => linea.reserva)
  lineas: ReservaLinea[];

  @OneToMany(() => Pago, (pago) => pago.reserva)
  pagos: Pago[];



  @OneToMany(() => HuespedReserva, (huesped) => huesped.reserva)
  huespedes: HuespedReserva[];
}
