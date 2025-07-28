import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TonoChatbot } from '../entidades/chatbot-document.entity';

export class UploadPdfDto {
  @IsString()
  hospedajeId: string;

  @IsEnum(TonoChatbot)
  @IsOptional()
  tono?: TonoChatbot;
} 