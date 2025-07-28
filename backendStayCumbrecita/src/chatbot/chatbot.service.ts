import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatbotDocument, TonoChatbot } from './entidades/chatbot-document.entity';
import { UploadPdfDto } from './dto/upload-pdf.dto';
import { UpdateTonoDto } from './dto/update-tono.dto';
import { EmpleadosService } from '../empleados/empleados.service';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class ChatbotService {
  constructor(
    @InjectRepository(ChatbotDocument)
    private chatbotDocumentRepository: Repository<ChatbotDocument>,
    private empleadosService: EmpleadosService,
  ) {}

  async uploadPdf(
    file: Express.Multer.File,
    uploadPdfDto: UploadPdfDto,
    userId: string,
    userRole?: string,
  ): Promise<ChatbotDocument> {
    console.log('📤 Subiendo PDF para hospedaje:', {
      hospedajeId: uploadPdfDto.hospedajeId,
      userId,
      userRole,
      filename: file?.originalname
    });

    // Verificar permisos
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(uploadPdfDto.hospedajeId, userId, userRole);
    if (!tienePermisos) {
      throw new BadRequestException('No tienes permisos para gestionar este hospedaje');
    }

    // Validar archivo PDF
    if (!file || file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Solo se permiten archivos PDF');
    }

    // Desactivar documento anterior si existe
    await this.chatbotDocumentRepository.update(
      { hospedajeId: uploadPdfDto.hospedajeId, isActive: true },
      { isActive: false }
    );

    // Subir a Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'chatbot-pdfs',
          format: 'pdf',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(file.buffer);
    }) as any;

    // Crear nuevo documento
    const chatbotDocument = this.chatbotDocumentRepository.create({
      hospedajeId: uploadPdfDto.hospedajeId,
      pdfUrl: uploadResult.secure_url,
      pdfPublicId: uploadResult.public_id,
      pdfFilename: file.originalname,
      tono: uploadPdfDto.tono || TonoChatbot.CORDIAL,
      isActive: true,
      isTrained: false,
    });

    return await this.chatbotDocumentRepository.save(chatbotDocument);
  }

  async updateTono(
    hospedajeId: string,
    updateTonoDto: UpdateTonoDto,
    userId: string,
    userRole?: string,
  ): Promise<ChatbotDocument> {
    // Verificar permisos
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(hospedajeId, userId, userRole);
    if (!tienePermisos) {
      throw new BadRequestException('No tienes permisos para gestionar este hospedaje');
    }

    const document = await this.findActiveByHospedaje(hospedajeId);
    if (!document) {
      throw new NotFoundException('No se encontró documento activo para este hospedaje');
    }

    document.tono = updateTonoDto.tono;
    document.isTrained = false; // Requiere re-entrenamiento
    
    return await this.chatbotDocumentRepository.save(document);
  }

  async findActiveByHospedaje(hospedajeId: string): Promise<ChatbotDocument | null> {
    return await this.chatbotDocumentRepository.findOne({
      where: { hospedajeId, isActive: true },
      relations: ['hospedaje'],
    });
  }

  async markAsTrained(hospedajeId: string): Promise<void> {
    await this.chatbotDocumentRepository.update(
      { hospedajeId, isActive: true },
      { isTrained: true }
    );
  }

  async getConfiguration(hospedajeId: string): Promise<ChatbotDocument | null> {
    return await this.findActiveByHospedaje(hospedajeId);
  }

  async remove(hospedajeId: string, userId: string, userRole?: string): Promise<void> {
    // Verificar permisos
    const tienePermisos = await this.empleadosService.verificarPermisosHospedaje(hospedajeId, userId, userRole);
    if (!tienePermisos) {
      throw new BadRequestException('No tienes permisos para gestionar este hospedaje');
    }

    const document = await this.findActiveByHospedaje(hospedajeId);
    if (!document) {
      throw new NotFoundException('No se encontró documento activo para este hospedaje');
    }

    // Eliminar de Cloudinary
    if (document.pdfPublicId) {
      await cloudinary.uploader.destroy(document.pdfPublicId);
    }

    // Marcar como inactivo
    document.isActive = false;
    await this.chatbotDocumentRepository.save(document);
  }
}
