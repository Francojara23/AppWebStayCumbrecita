import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  OneToMany,
} from "typeorm";
import { EncryptionTransformer } from "../common/transformers/encryption.transformer";
import { someHashFunction } from "../common/utils/utils";


@Entity("owners")
export class Owner {
  @PrimaryGeneratedColumn("uuid")
  idOwner?: string;

  @Column()
  name!: string;

  @Column()
  lastName!: string;

  // 1) Columna de hash para uniqueness
  @Column({ unique: true, nullable: true })
  emailHash?: string;

  // 2) Columna cifrada para almacenar el valor real
  @Column({
    type: "text",
    transformer: new EncryptionTransformer(), // Tu transformador
    nullable: false,
  })
  email!: string;

  @Column({
    type: "text",
    transformer: new EncryptionTransformer(),
  })
  phone?: string;

  // Mismo patrón para el DNI
  @Column({ unique: true, nullable: true })
  dniHash?: string;

  @Column({
    type: "text",
    transformer: new EncryptionTransformer(),
    nullable: false,
  })
  dni!: string;
  // Y tu dirección
  @Column({
    type: "text",
    transformer: new EncryptionTransformer(),
  })
  address?: string;

  // Nota: La relación con hospedajes se removió ya que owners solo se usa para validación de registro

  // Hook para setear los hashes
  @BeforeInsert()
  @BeforeUpdate()
  setHashes() {
    if (this.email) {
      // Normalizar email (por ej. pasar a minúsculas, quitar espacios)
      const normalizedEmail = this.email.trim().toLowerCase();
      // Hashear de forma determinística (SHA256, por ejemplo)
      this.emailHash = someHashFunction(normalizedEmail);
    }

    if (this.dni) {
      // Asumiendo que dni es un string, o conviertes el number a string
      const normalizedDni = this.dni.trim();
      this.dniHash = someHashFunction(normalizedDni);
    }
  }
}
