// src/empleados/entidades/empleado.entity.ts
import { Entity, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntityAudit } from "../../common/base.entity";

import { Hospedaje } from "../../hospedajes/entidades/hospedaje.entity";
import { Rol } from "../../roles/roles.entity";
import { Usuario } from "../../users/users.entity";

@Entity("empleados")
export class Empleado extends BaseEntityAudit {
  /* Claves foráneas */
  @ManyToOne(() => Usuario, (u) => u.rolesHotel, {
    eager: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "usuario_id" })
  usuario: Usuario;

  @ManyToOne(() => Hospedaje, (h) => h.empleados, { onDelete: "CASCADE" })
  @JoinColumn({ name: "hospedaje_id" })
  hospedaje: Hospedaje;

  @ManyToOne(() => Rol, (r) => r.empleados, { eager: true })
  @JoinColumn({ name: "rol_id" })
  rol: Rol;
}
