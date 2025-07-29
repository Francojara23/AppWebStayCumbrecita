import { Injectable, NotFoundException, BadRequestException, StreamableFile, Response } from '@nestjs/common';
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

    // Subir a Cloudinary como recurso privado
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',    // Explícitamente como 'raw' para PDFs
          type: 'private',         // Subir como recurso privado
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
      // Generar URL firmada para descargar recurso raw privado
      const timestamp = Math.floor(Date.now() / 1000);
      const expiresAt = timestamp + 3600; // 1 hora
      
      // Generar firma manualmente para recursos raw privados
      const paramsToSign = {
        expires_at: expiresAt,
        public_id: document.pdfPublicId,
        timestamp: timestamp
      };
      
      const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET || '');
      
      const secureUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/raw/download` +
        `?public_id=${encodeURIComponent(document.pdfPublicId)}` +
        `&timestamp=${timestamp}` +
        `&expires_at=${expiresAt}` +
        `&signature=${signature}` +
        `&api_key=${process.env.CLOUDINARY_API_KEY}`;
      
      console.log('🔗 URL firmada generada:', secureUrl);
      console.log('📄 Public ID del documento:', document.pdfPublicId);
      
      // Descargar usando la URL firmada
      const response = await fetch(secureUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error desde Cloudinary:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
          url: secureUrl
        });
        throw new BadRequestException(`Error descargando PDF desde Cloudinary: ${response.status} - ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      
      return {
        buffer: Buffer.from(buffer),
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${document.pdfFilename}"`,
        }
      };

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

    // Eliminar de Cloudinary
    if (document.pdfPublicId) {
      await cloudinary.uploader.destroy(document.pdfPublicId);
    }

    // Marcar como inactivo
    document.isActive = false;
    await this.chatbotDocumentRepository.save(document);
  }
}
