import { Entity, Column, BeforeInsert, BeforeUpdate } from 'typeorm';
import { BaseEntityAudit } from 'src/common/base.entity';
import { EncryptionTransformer } from 'src/common/transformers/encryption.transformer';

export enum TipoTarjeta {
  CREDITO = 'CREDITO',
  DEBITO = 'DEBITO'
}

@Entity('tarjetas')
export class Tarjeta extends BaseEntityAudit {
  @Column({
    name: 'titular',
    type: 'varchar',
    length: 100
  })
  titular: string;

  @Column({
    name: 'numero',
    type: 'varchar',
    length: 64,
    transformer: new EncryptionTransformer()
  })
  numero: string;

  @Column({
    name: 'entidad',
    type: 'varchar',
    length: 50
  })
  entidad: string;

  @Column({
    name: 'banco',
    type: 'varchar',
    length: 50
  })
  banco: string;

  @Column({
    name: 'vencimiento',
    type: 'varchar',
    length: 32,
    transformer: new EncryptionTransformer()
  })
  vencimiento: string;

  @Column({
    name: 'cve',
    type: 'varchar',
    length: 32,
    transformer: new EncryptionTransformer()
  })
  cve: string;

  @Column({
    name: 'tipo',
    type: 'enum',
    enum: TipoTarjeta
  })
  tipo: TipoTarjeta;

  @BeforeInsert()
  @BeforeUpdate()
  toUpperCase() {
    this.titular = this.titular?.toUpperCase();
    this.entidad = this.entidad?.toUpperCase();
    this.banco = this.banco?.toUpperCase();
  }
} 