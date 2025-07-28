import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntityAudit } from "../../common/base.entity";
import { Hospedaje } from "./hospedaje.entity";

@Entity("documentos_hospedaje")
export class DocumentoHospedaje extends BaseEntityAudit {
  @ManyToOne(() => Hospedaje, (h) => h.documentos)
  @JoinColumn({ name: "hospedaje_id" })
  hospedaje: Hospedaje;

  @Column({ length: 500 })
  url: string;

  @Column({ length: 255 })
  nombre: string;

  @Column({ length: 255, nullable: true })
  descripcion?: string;

  @Column({ length: 100, nullable: true, name: "tipo_documento" })
  tipoDocumento?: string;

  @Column({ length: 255, nullable: true, name: "public_id" })
  publicId?: string;

  @Column({ length: 100, nullable: true })
  formato?: string;

  @Column({ nullable: true })
  tamaño?: number;
} 