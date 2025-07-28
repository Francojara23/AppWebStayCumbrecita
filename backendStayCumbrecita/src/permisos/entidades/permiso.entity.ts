// src/permisos/entidades/permiso.entity.ts
import { Entity, Column, OneToMany } from "typeorm";
import { BaseEntityAudit } from "../../common/base.entity";
import { RolPermiso } from "../../roles/rolPermiso.entity";
import { ApiProperty } from "@nestjs/swagger";

@Entity("permisos")
export class Permiso extends BaseEntityAudit {
  @ApiProperty({ description: "Nombre del permiso" })
  @Column({ length: 40, unique: true })
  nombre: string;

  @ApiProperty({ description: "Descripción del permiso" })
  @Column({ length: 120, nullable: true })
  descripcion?: string;

  @ApiProperty({ description: "Estado del permiso" })
  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => RolPermiso, (rp) => rp.permiso)
  roles: RolPermiso[];
}
