import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Hospedaje } from '../../hospedajes/entidades/hospedaje.entity';

export enum TonoChatbot {
  FORMAL = 'formal',
  CORDIAL = 'cordial',
  JUVENIL = 'juvenil',
  AMIGABLE = 'amigable',
  CORPORATIVO = 'corporativo'
}

@Entity('chatbot_documents')
export class ChatbotDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'hospedaje_id' })
  hospedajeId: string;

  @Column({ type: 'varchar', length: 500, name: 'pdf_url' })
  pdfUrl: string;

  @Column({ type: 'varchar', length: 255, name: 'pdf_public_id', nullable: true })
  pdfPublicId: string;

  @Column({ type: 'varchar', length: 255, name: 'pdf_filename' })
  pdfFilename: string;

  @Column({ 
    type: 'enum', 
    enum: TonoChatbot, 
    default: TonoChatbot.CORDIAL,
    name: 'tono'
  })
  tono: TonoChatbot;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_trained' })
  isTrained: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Hospedaje, hospedaje => hospedaje.id)
  @JoinColumn({ name: 'hospedaje_id' })
  hospedaje: Hospedaje;
} 