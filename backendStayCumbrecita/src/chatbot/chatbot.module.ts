import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ChatbotDocument } from './entidades/chatbot-document.entity';
import { EmpleadosModule } from '../empleados/empleados.module';
import { DocumentsModule } from '../uploads/documents/documents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatbotDocument]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
    EmpleadosModule,
    DocumentsModule,
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
