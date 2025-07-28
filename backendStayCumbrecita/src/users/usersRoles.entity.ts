import { Entity, ManyToOne, JoinColumn } from "typeorm";
import { Rol } from "../roles/roles.entity";
import { Usuario } from "./users.entity";
import { BaseEntityAudit } from "../common/base.entity";

@Entity("usuarios_roles")
export class UsuarioRol extends BaseEntityAudit {
  @ManyToOne(() => Usuario, (u) => u.rolesGlobales, { onDelete: "CASCADE" })
  @JoinColumn({ name: "usuario_id" })
  usuario: Usuario;

  @ManyToOne(() => Rol, (r) => r.usuarios, { eager: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "rol_id" })
  rol: Rol;
}
