import { Injectable, NotFoundException, BadRequestException, StreamableFile, Response } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatbotDocument, TonoChatbot } from './entidades/chatbot-document.entity';
import { UploadPdfDto } from './dto/upload-pdf.dto';
import { UpdateTonoDto } from './dto/update-tono.dto';
import { EmpleadosService } from '../empleados/empleados.service';
import { DocumentsService } from '../uploads/documents/documents.service';

@Injectable()
export class ChatbotService {
  constructor(
    @InjectRepository(ChatbotDocument)
    private chatbotDocumentRepository: Repository<ChatbotDocument>,
    private empleadosService: EmpleadosService,
    private documentsService: DocumentsService,
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

    // Subir a Cloudinary como recurso privado usando DocumentsService
    const uploadResult = await this.documentsService.uploadPrivateFile(
      file,
      'chatbot-pdfs'
    );

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

    const savedDocument = await this.chatbotDocumentRepository.save(chatbotDocument);

    // 🚀 NUEVO: Llamar automáticamente al chatbot para procesar el PDF
    try {
      console.log('🤖 Iniciando procesamiento automático del PDF en chatbot...');
      const chatbotUrl = process.env.CHATBOT_URL || 'http://localhost:8000';
      
      const retrainResponse = await fetch(`${chatbotUrl}/chat/retrain/${uploadPdfDto.hospedajeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (retrainResponse.ok) {
        console.log('✅ Chatbot procesando PDF exitosamente iniciado');
        // Marcar como entrenado después del procesamiento exitoso
        savedDocument.isTrained = true;
        await this.chatbotDocumentRepository.save(savedDocument);
      } else {
        console.error('❌ Error llamando al chatbot:', retrainResponse.status, await retrainResponse.text());
      }
    } catch (error) {
      console.error('❌ Error conectando con chatbot:', error.message);
      // No fallar el upload si el chatbot no responde, solo logear el error
    }

    return savedDocument;
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

  async getDocuments(hospedajeId: string): Promise<any[]> {
    const document = await this.findActiveByHospedaje(hospedajeId);
    if (!document) {
      return [];
    }

    // Formatear el documento para el chatbot Python
    return [{
      id: document.id,
      url: document.pdfUrl,
      nombre: document.pdfFilename,
      hospedaje_id: document.hospedajeId,
      is_active: document.isActive,
      is_trained: document.isTrained
    }];
  }

  async downloadDocument(documentId: string): Promise<any> {
    const document = await this.chatbotDocumentRepository.findOne({
      where: { id: documentId, isActive: true }
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    try {
      console.log('🤖 Descargando documento del chatbot:', {
        documentId,
        publicId: document.pdfPublicId,
        filename: document.pdfFilename
      });

      // Usar DocumentsService para descargar documento privado
      return await this.documentsService.downloadPrivateDocument(
        document.pdfPublicId,
        document.pdfFilename
      );

    } catch (error) {
      console.error('Error descargando documento:', error);
      throw new BadRequestException('Error descargando el documento');
    }
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

    // Eliminar de Cloudinary usando DocumentsService
    if (document.pdfPublicId) {
      await this.documentsService.deleteByPublicId(document.pdfPublicId);
    }

    // Marcar como inactivo
    document.isActive = false;
    await this.chatbotDocumentRepository.save(document);
  }
}
