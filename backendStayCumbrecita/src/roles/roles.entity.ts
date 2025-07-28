import { Entity, Column, OneToMany } from "typeorm";
import { BaseEntityAudit } from "../common/base.entity";
import { RolPermiso } from "./rolPermiso.entity";
import { Empleado } from "../empleados/entidades/empleado.entity";
import { UsuarioRol } from "../users/usersRoles.entity";
import { ApiProperty } from "@nestjs/swagger";

@Entity("roles")
export class Rol extends BaseEntityAudit {
  @ApiProperty({ description: "Nombre del rol" })
  @Column({ length: 40, unique: true })
  nombre: string;

  @ApiProperty({ description: "Descripción del rol" })
  @Column({ length: 120, nullable: true })
  descripcion?: string;

  @ApiProperty({ description: "Estado del rol" })
  @Column({ default: true })
  activo: boolean;

  /* pivotes */
  @OneToMany(() => UsuarioRol, (ur) => ur.rol) usuarios: UsuarioRol[];
  @OneToMany(() => RolPermiso, (rp) => rp.rol) permisos: RolPermiso[];
  @OneToMany(() => Empleado, (e) => e.rol) empleados: Empleado[];
}
