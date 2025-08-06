import { Injectable, NotFoundException, BadRequestException, StreamableFile, Response } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ChatbotDocument, TonoChatbot } from './entidades/chatbot-document.entity';
import { UploadPdfDto } from './dto/upload-pdf.dto';
import { UpdateTonoDto } from './dto/update-tono.dto';
import { GetUserConversationsDto, UserConversationsResponseDto } from './dto/user-conversations.dto';
import { ConversationSummaryDto } from './dto/conversation-summary.dto';
import { ConversationDetailDto, MessageDto } from './dto/conversation-detail.dto';
import { EmpleadosService } from '../empleados/empleados.service';
import { DocumentsService } from '../uploads/documents/documents.service';

@Injectable()
export class ChatbotService {
  constructor(
    @InjectRepository(ChatbotDocument)
    private chatbotDocumentRepository: Repository<ChatbotDocument>,
    private dataSource: DataSource, // Para ejecutar queries SQL raw
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

  // ========== NUEVOS MÉTODOS PARA HISTORIAL DE CONVERSACIONES ==========

  async getUserConversations(
    userId: string,
    query: GetUserConversationsDto
  ): Promise<UserConversationsResponseDto> {
    console.log('📞 Obteniendo conversaciones del usuario:', { userId, query });

    const { page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    try {
      // Primero verificamos si hay registros en la tabla chat_history
      console.log('🔍 Verificando conexión y datos en chat_history...');
      const testQuery = `SELECT COUNT(*) as total FROM chat_history WHERE user_id = $1`;
      const testResult = await this.dataSource.query(testQuery, [userId]);
      console.log('📊 Total de registros en chat_history para este usuario:', testResult[0]?.total || 0);

      // Primero analicemos qué session_ids tenemos
      const sessionAnalysisQuery = `
        SELECT 
          hospedaje_id,
          session_id,
          COUNT(*) as message_count,
          MIN(created_at) as first_msg,
          MAX(created_at) as last_msg
        FROM chat_history 
        WHERE user_id = $1
        GROUP BY hospedaje_id, session_id
        ORDER BY hospedaje_id, first_msg
      `;
      
      const sessionAnalysis = await this.dataSource.query(sessionAnalysisQuery, [userId]);
      console.log('📋 Análisis de sesiones por hospedaje:');
      sessionAnalysis.forEach((session: any) => {
        console.log(`  🏨 Hospedaje: ${session.hospedaje_id}`);
        console.log(`     📱 Session: "${session.session_id || 'NULL'}" (${session.message_count} mensajes)`);
        console.log(`     📅 Período: ${session.first_msg} -> ${session.last_msg}`);
      });

      // Nueva lógica: agrupar primero por hospedaje, luego por sesión o fecha
      console.log('🔄 Implementando nueva lógica de agrupación...');
      
      const conversationsQuery = `
        WITH hospedaje_messages AS (
          SELECT 
            ch.hospedaje_id,
            ch.session_id,
            ch.created_at,
            ch.user_message,
            ch.bot_response,
            CASE 
              WHEN ch.user_message != '' AND ch.user_message IS NOT NULL THEN ch.user_message 
              WHEN ch.bot_response != '' AND ch.bot_response IS NOT NULL THEN ch.bot_response
              ELSE 'Mensaje vacío'
            END as message_content,
            -- Si no hay session_id, agrupamos por hospedaje y día
            CASE 
              WHEN ch.session_id IS NOT NULL AND ch.session_id != '' THEN ch.session_id
              ELSE CONCAT('day_', ch.hospedaje_id, '_', DATE(ch.created_at))
            END as effective_session_id
          FROM chat_history ch
          WHERE ch.user_id = $1
        ),
        conversation_stats AS (
          SELECT 
            hm.hospedaje_id,
            hm.effective_session_id as session_id,
            MIN(hm.created_at) as first_message_date,
            MAX(hm.created_at) as last_message_date,
            COUNT(*) as message_count,
            -- Primer mensaje (cronológicamente)
            (
              SELECT message_content 
              FROM hospedaje_messages hm2 
              WHERE hm2.hospedaje_id = hm.hospedaje_id 
                AND hm2.effective_session_id = hm.effective_session_id
              ORDER BY hm2.created_at ASC 
              LIMIT 1
            ) as first_message,
            -- Último mensaje (cronológicamente)
            (
              SELECT message_content 
              FROM hospedaje_messages hm3 
              WHERE hm3.hospedaje_id = hm.hospedaje_id 
                AND hm3.effective_session_id = hm.effective_session_id
              ORDER BY hm3.created_at DESC 
              LIMIT 1
            ) as last_message
          FROM hospedaje_messages hm
          GROUP BY hm.hospedaje_id, hm.effective_session_id
        )
        SELECT 
          cs.hospedaje_id,
          cs.session_id,
          cs.last_message_date,
          cs.message_count,
          cs.first_message,
          cs.last_message
        FROM conversation_stats cs
        ORDER BY cs.last_message_date DESC
        LIMIT $2 OFFSET $3
      `;

      console.log('🔍 Ejecutando consulta principal de conversaciones...');
      const conversations = await this.dataSource.query(conversationsQuery, [
        userId,
        limit,
        offset
      ]);
      console.log('📊 Conversaciones encontradas:', conversations.length);
      console.log('📋 Primeras conversaciones (raw):', JSON.stringify(conversations.slice(0, 2), null, 2));

      // Obtener total de conversaciones con nueva lógica
      const totalQuery = `
        SELECT COUNT(DISTINCT CONCAT(
          hospedaje_id, 
          ':', 
          CASE 
            WHEN session_id IS NOT NULL AND session_id != '' THEN session_id
            ELSE CONCAT('day_', hospedaje_id, '_', DATE(created_at))
          END
        )) as total
        FROM chat_history 
        WHERE user_id = $1
      `;
      
      const totalResult = await this.dataSource.query(totalQuery, [userId]);
      const total = parseInt(totalResult[0]?.total || '0');
      console.log('📊 Total de conversaciones únicas:', total);

      // Enriquecer con información del hospedaje
      console.log('🏨 Enriqueciendo conversaciones con información de hospedajes...');
      const enrichedConversations: ConversationSummaryDto[] = await Promise.all(
        conversations.map(async (conv: any) => {
          const hospedajeName = await this.getHospedajeName(conv.hospedaje_id);
          console.log(`🏨 Hospedaje ${conv.hospedaje_id}: ${hospedajeName}`);
          
          return {
            hospedajeId: conv.hospedaje_id,
            hospedajeName,
            sessionId: conv.session_id,
            lastMessageDate: new Date(conv.last_message_date),
            messageCount: parseInt(conv.message_count),
            firstMessage: conv.first_message?.substring(0, 100) + (conv.first_message?.length > 100 ? '...' : ''),
            lastMessage: conv.last_message?.substring(0, 100) + (conv.last_message?.length > 100 ? '...' : ''),
          };
        })
      );

      const response = {
        conversations: enrichedConversations,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };

      console.log('✅ Respuesta final:', JSON.stringify(response, null, 2));
      return response;

    } catch (error) {
      console.error('Error obteniendo conversaciones del usuario:', error);
      throw new BadRequestException('Error obteniendo historial de conversaciones');
    }
  }

  async getConversationDetail(
    userId: string,
    hospedajeId: string,
    sessionId: string
  ): Promise<ConversationDetailDto> {
    console.log('📖 Obteniendo detalle de conversación:', { userId, hospedajeId, sessionId });

    try {
      // Si el sessionId es generado artificialmente (por día), usar consulta especial
      if (sessionId.startsWith('day_')) {
        console.log('🔄 Buscando conversación por día para hospedaje:', hospedajeId, 'sessionId:', sessionId);
        // Extraer la fecha del session_id artificial: day_hospedajeId_fecha
        const datePart = sessionId.split('_').slice(2).join('-'); // día en formato YYYY-MM-DD
        
        // Buscar mensajes del hospedaje en esa fecha específica que NO tienen session_id real
        const dayMessages = await this.dataSource.query(`
          SELECT * FROM chat_history 
          WHERE user_id = $1 
            AND hospedaje_id = $2 
            AND DATE(created_at) = $3
            AND (session_id IS NULL OR session_id = '')
          ORDER BY created_at ASC
        `, [userId, hospedajeId, datePart]);
        
        console.log('📅 Mensajes encontrados para el día:', dayMessages.length);
        return this.formatConversationDetail(dayMessages, hospedajeId, sessionId);
      } else {
        // Para conversaciones con session_id real
        const messages = await this.dataSource.query(`
          SELECT * FROM chat_history 
          WHERE user_id = $1 
            AND hospedaje_id = $2 
            AND session_id = $3
          ORDER BY created_at ASC
        `, [userId, hospedajeId, sessionId]);

        return this.formatConversationDetail(messages, hospedajeId, sessionId);
      }

    } catch (error) {
      console.error('Error obteniendo detalle de conversación:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error obteniendo detalle de conversación');
    }
  }

  // Método auxiliar para formatear detalles de conversación
  private async formatConversationDetail(messages: any[], hospedajeId: string, sessionId: string): Promise<ConversationDetailDto> {
    if (messages.length === 0) {
      throw new NotFoundException('Conversación no encontrada');
    }

    // Convertir mensajes a formato de respuesta
    const formattedMessages: MessageDto[] = [];
    
    for (const msg of messages) {
      // Agregar mensaje del usuario si existe
      if (msg.user_message && msg.user_message.trim() !== '') {
        formattedMessages.push({
          id: `${msg.id}-user`,
          message: msg.user_message,
          role: 'user',
          timestamp: msg.created_at,
        });
      }
      
      // Agregar respuesta del bot si existe
      if (msg.bot_response && msg.bot_response.trim() !== '') {
        formattedMessages.push({
          id: `${msg.id}-bot`,
          message: msg.bot_response,
          role: 'assistant',
          timestamp: msg.created_at,
        });
      }
    }

    // Obtener nombre del hospedaje
    const hospedajeName = await this.getHospedajeName(hospedajeId);

    return {
      hospedajeId,
      hospedajeName,
      sessionId,
      messages: formattedMessages,
    };
  }

  // Método auxiliar para obtener el nombre del hospedaje
  private async getHospedajeName(hospedajeId: string): Promise<string> {
    try {
      // Usar query SQL raw para obtener información del hospedaje
      const hospedaje = await this.dataSource.query(
        'SELECT h.nombre FROM hospedajes h WHERE h.id = $1',
        [hospedajeId]
      );
      
      return hospedaje[0]?.nombre || 'Hospedaje desconocido';
    } catch (error) {
      console.warn('Error obteniendo nombre del hospedaje:', error);
      return 'Hospedaje desconocido';
    }
  }
}
