// src/hospedajes/entidades/tipo-hotel.entity.ts
import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntityAudit } from "../../common/base.entity";
import { Hospedaje } from "./hospedaje.entity";

@Entity("tipos_hospedajes")
export class TipoHospedaje extends BaseEntityAudit {
  @Column({ length: 80, unique: true })
  nombre: string;

  @Column({ length: 255, nullable: true })
  descripcion?: string;

  @OneToMany(() => Hospedaje, (h) => h.tipoHotel)
  hospedajes: Hospedaje[];
}
