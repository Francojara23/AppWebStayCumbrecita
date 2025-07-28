import {
  Entity,
  Column,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import * as bcrypt from "bcryptjs";
import { BaseEntityAudit } from "../common/base.entity";
import { Empleado } from "../empleados/entidades/empleado.entity";
import { UsuarioRol } from "./usersRoles.entity";

@Entity("usuarios")
@Unique(["email"])
@Unique(["dni"])
export class Usuario extends BaseEntityAudit {
  @Column({ length: 80 })
  nombre: string;

  @Column({ length: 80 })
  apellido: string;

  @Column({ length: 120 })
  email: string;

  @Column()
  password: string;

  @Column({ type: "bigint", nullable: true })
  telefono?: number;

  @Column({ type: "bigint", nullable: true })
  dni?: number;

  @Column({ length: 255, nullable: true })
  direccion?: string;

  @Column({ nullable: true })
  fotoUrl?: string;

  @Column({ default: false })
  estadoConfirmacion: boolean;

  @Column({ nullable: true })
  notificationToken?: string;

  @Column({ nullable: true })
  emailVerificationToken?: string;

  @Column({ nullable: true })
  resetPasswordToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires?: Date;

  @Column({ default: true })
  activo: boolean;

  /** Roles globales (sin hotel) */
  @OneToMany(() => UsuarioRol, (ur) => ur.usuario)
  rolesGlobales: UsuarioRol[];

  /** Roles ligados a un hotel (empleados) */
  @OneToMany(() => Empleado, (e) => e.usuario)
  rolesHotel: Empleado[];

  /** Hashea la contraseña antes de insertar o actualizar */
  @BeforeInsert()
  @BeforeUpdate()
  private async hashPassword(): Promise<void> {
    if (this.password && !this.password.startsWith("$2")) {
      const saltRounds = Number(process.env.SALT_ROUNDS) || 10;
      this.password = await bcrypt.hash(this.password, saltRounds);
    }
  }
}
