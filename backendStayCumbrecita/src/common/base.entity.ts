import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
} from "typeorm";

/**
 *  Entidad base con:
 *  • id UUID
 *  • createdAt / updatedAt automáticos
 *  • deletedAt para soft-delete
 *  • active: boolean
 *
 *  Todas las demás entidades del dominio extienden esta clase.
 */
export abstract class BaseEntityAudit {
  /** Identificador primario UUID */
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** Marca si el registro está habilitado lógicamente */
  @Column({ default: true })
  active: boolean;

  /** Fecha de creación (SET por TypeORM) */
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  /** Fecha de última modificación (SET por TypeORM) */
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  /** Fecha de eliminación (SET por TypeORM) */
  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt?: Date | null;
}
