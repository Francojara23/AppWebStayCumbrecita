import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntityAudit } from "../../common/base.entity";
import { Reserva } from "./reserva.entity";

@Entity("acompaniantes")
export class Acompaniante extends BaseEntityAudit {
  @ManyToOne(() => Reserva, (reserva) => reserva.acompaniantes)
  @JoinColumn({ name: "reserva_id" })
  reserva: Reserva;

  @Column()
  nombre: string;

  @Column()
  apellido: string;

  @Column({ nullable: true })
  documento: string;

  @Column({ type: "date", nullable: true })
  fechaNacimiento: Date;

  @Column({ nullable: true })
  nacionalidad: string;
}
