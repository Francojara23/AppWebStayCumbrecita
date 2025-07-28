import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  AfterLoad,
} from "typeorm";
import { BaseEntityAudit } from "../../common/base.entity";
import { TipoHospedaje } from "./tipo-hospedaje.entity";
import { Empleado } from "../../empleados/entidades/empleado.entity";
import { ImagenHospedaje } from "./imagen-hospedaje.entity";
import { HospedajeServicio } from "../../servicios/entidades/hospedaje-servicio.entity";
import { HabitacionEntity } from "../../habitaciones/entidades/habitacion.entity";
import { DocumentoHospedaje } from "./documento-hospedaje.entity";

/** Estados operativos posibles */
export enum EstadoHospedaje {
  PENDIENTE = "PENDIENTE",
  ACTIVO = "ACTIVO",
  INACTIVO = "INACTIVO",
}

@Entity("hospedajes")
export class Hospedaje extends BaseEntityAudit {
  /* ------------------------------------------------------------------ */
  /*  Datos básicos                                                      */
  /* ------------------------------------------------------------------ */

  @Column({ length: 120 })
  nombre: string;

  @Column({ length: 255 })
  descripcionCorta: string;

  @Column("text")
  descripcionLarga: string;

  @ManyToOne(() => TipoHospedaje, (t) => t.hospedajes, { eager: true })
  @JoinColumn({ name: "tipo_hotel_id" })
  tipoHotel: TipoHospedaje;

  @Column({
    type: "enum",
    enum: EstadoHospedaje,
    default: EstadoHospedaje.PENDIENTE,
  })
  estado: EstadoHospedaje;

  /* ------------------------------------------------------------------ */
  /*  Relación con propietario y empleados                               */
  /* ------------------------------------------------------------------ */

  @Column({ name: "id_owner_hospedaje", type: "uuid", nullable: true })
  idOwnerHospedaje?: string; // ID del usuario que creó el hospedaje

  @OneToMany(() => Empleado, (e) => e.hospedaje)
  empleados: Empleado[];

  /* ------------------------------------------------------------------ */
  /*  Contacto y datos administrativos                                   */
  /* ------------------------------------------------------------------ */

  @Column({ name: "documento_inscripcion", length: 120, nullable: true })
  documentoInscripcion?: string; // ID del documento de inscripción

  @Column({ length: 120 })
  responsable: string;

  @Column({ length: 20 })
  telefonoContacto: string;

  @Column({ length: 120 })
  mailContacto: string;

  @Column({ length: 255 })
  direccion: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitud?: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitud?: number;

  /* ------------------------------------------------------------------ */
  /*  Habitaciones y contador                                            */
  /* ------------------------------------------------------------------ */

  @OneToMany(() => HabitacionEntity, (h) => h.hospedaje)
  habitaciones: HabitacionEntity[];

  /** Se actualiza desde código de servicio al crear/eliminar habitaciones */
  @Column({ type: "int", default: 0 })
  cantidadHabitaciones: number;

  /* ------------------------------------------------------------------ */
  /*  Recursos multimedia y servicios                                    */
  /* ------------------------------------------------------------------ */

  @OneToMany(() => ImagenHospedaje, (i) => i.hospedaje, { cascade: true })
  imagenes: ImagenHospedaje[];

  @OneToMany(() => DocumentoHospedaje, (d) => d.hospedaje, { cascade: true })
  documentos: DocumentoHospedaje[];

  @OneToMany(() => HospedajeServicio, (s) => s.hospedaje, { cascade: true })
  servicios: HospedajeServicio[];

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */

  /** Sincroniza cantidadHabitaciones tras carga (opcional) */
  @AfterLoad()
  private setCantidadHabitaciones() {
    if (this.habitaciones) {
      this.cantidadHabitaciones = this.habitaciones.length;
    }
  }
}
