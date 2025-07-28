import { Entity, ManyToOne, JoinColumn } from "typeorm";
import { Rol } from "./roles.entity";
import { Permiso } from "../permisos/entidades/permiso.entity";
import { BaseEntityAudit } from "../common/base.entity";

@Entity("roles_permisos")
export class RolPermiso extends BaseEntityAudit {
  @ManyToOne(() => Rol, (r) => r.permisos, { onDelete: "CASCADE" })
  @JoinColumn({ name: "rol_id" })
  rol: Rol;

  @ManyToOne(() => Permiso, (p) => p.roles, {
    eager: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "permiso_id" })
  permiso: Permiso;
}
