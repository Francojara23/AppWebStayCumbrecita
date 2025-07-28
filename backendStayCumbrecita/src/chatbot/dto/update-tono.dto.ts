import { IsEnum } from 'class-validator';
import { TonoChatbot } from '../entidades/chatbot-document.entity';

export class UpdateTonoDto {
  @IsEnum(TonoChatbot)
  tono: TonoChatbot;
} 