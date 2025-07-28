// src/hospedajes/entidades/imagen-hospedaje.entity.ts
import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntityAudit } from "../../common/base.entity";
import { Hospedaje } from "./hospedaje.entity";

@Entity("imagenes_hospedaje")
export class ImagenHospedaje extends BaseEntityAudit {
  @ManyToOne(() => Hospedaje, (h) => h.imagenes)
  @JoinColumn({ name: "hospedaje_id" })
  hospedaje: Hospedaje;

  @Column({ length: 500 })
  url: string;

  @Column({ length: 255, nullable: true })
  descripcion?: string;

  @Column({ nullable: true })
  orden?: number;

  @Column({ length: 255, nullable: true, name: "public_id" })
  publicId?: string;

  @Column({ length: 100, nullable: true })
  formato?: string;

  @Column({ nullable: true })
  tamaño?: number;
}
