import { 
  Controller, 
  Post, 
  Put, 
  Get, 
  Delete, 
  Param, 
  Body, 
  UseInterceptors, 
  UploadedFile, 
  UseGuards,
  Request,
  Res,
  Query
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { ChatbotService } from './chatbot.service';
import { UploadPdfDto } from './dto/upload-pdf.dto';
import { UpdateTonoDto } from './dto/update-tono.dto';
import { GetUserConversationsDto } from './dto/user-conversations.dto';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  // ========== ENDPOINTS PÚBLICOS PARA CHATBOT PYTHON ==========
  
  @Get('public/:hospedajeId/configuration')
  async getPublicConfiguration(@Param('hospedajeId') hospedajeId: string) {
    console.log('🤖 Chatbot Python solicitando configuración para hospedaje:', hospedajeId);
    return await this.chatbotService.getConfiguration(hospedajeId);
  }

  @Post('public/:hospedajeId/mark-trained')
  async markAsTrainedPublic(@Param('hospedajeId') hospedajeId: string) {
    console.log('🤖 Chatbot Python marcando como entrenado hospedaje:', hospedajeId);
    await this.chatbotService.markAsTrained(hospedajeId);
    return { message: 'Documento marcado como entrenado' };
  }

  @Get(':hospedajeId/documents')
  async getDocuments(@Param('hospedajeId') hospedajeId: string) {
    console.log('🤖 Chatbot Python solicitando documentos para hospedaje:', hospedajeId);
    return await this.chatbotService.getDocuments(hospedajeId);
  }

  @Get('download/:documentId')
  async downloadDocument(
    @Param('documentId') documentId: string,
    @Res() res: Response
  ) {
    console.log('🤖 Chatbot Python descargando documento:', documentId);
    const result = await this.chatbotService.downloadDocument(documentId);
    
    // Configurar headers
    res.set(result.headers);
    
    // Enviar el buffer como respuesta
    res.send(result.buffer);
  }

  // ========== ENDPOINTS CON AUTENTICACIÓN ==========
  
  @Post('upload-pdf')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadPdfDto: UploadPdfDto,
    @Request() req: any,
  ) {
    console.log('🎯 Controlador uploadPdf - Usuario:', {
      id: req.user.id,
      role: req.user.role,
      roles: req.user.roles
    });
    
    return await this.chatbotService.uploadPdf(file, uploadPdfDto, req.user.id.toString(), req.user.role);
  }

  @Put(':hospedajeId/tono')
  @UseGuards(JwtAuthGuard)
  async updateTono(
    @Param('hospedajeId') hospedajeId: string,
    @Body() updateTonoDto: UpdateTonoDto,
    @Request() req: any,
  ) {
    return await this.chatbotService.updateTono(hospedajeId, updateTonoDto, req.user.id.toString(), req.user.role);
  }

  @Get(':hospedajeId/configuration')
  @UseGuards(JwtAuthGuard)
  async getConfiguration(@Param('hospedajeId') hospedajeId: string) {
    return await this.chatbotService.getConfiguration(hospedajeId);
  }

  @Delete(':hospedajeId')
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('hospedajeId') hospedajeId: string,
    @Request() req: any,
  ) {
    await this.chatbotService.remove(hospedajeId, req.user.id.toString(), req.user.role);
    return { message: 'Documento eliminado correctamente' };
  }

  @Post(':hospedajeId/mark-trained')
  @UseGuards(JwtAuthGuard)
  async markAsTrained(@Param('hospedajeId') hospedajeId: string) {
    await this.chatbotService.markAsTrained(hospedajeId);
    return { message: 'Documento marcado como entrenado' };
  }

  // ========== ENDPOINTS PARA HISTORIAL DE CONVERSACIONES ==========

  @Get('my-conversations')
  @UseGuards(JwtAuthGuard)
  async getMyConversations(
    @Request() req: any,
    @Query() query: GetUserConversationsDto
  ) {
    console.log('📞 Usuario solicitando sus conversaciones:', {
      userId: req.user.id,
      query
    });
    
    return await this.chatbotService.getUserConversations(
      req.user.id.toString(),
      query
    );
  }

  @Get('conversation/:hospedajeId/:sessionId')
  @UseGuards(JwtAuthGuard)
  async getConversationDetail(
    @Request() req: any,
    @Param('hospedajeId') hospedajeId: string,
    @Param('sessionId') sessionId: string
  ) {
    console.log('📖 Usuario solicitando detalle de conversación:', {
      userId: req.user.id,
      hospedajeId,
      sessionId
    });
    
    return await this.chatbotService.getConversationDetail(
      req.user.id.toString(),
      hospedajeId,
      sessionId
    );
  }
}
