import { IsString, IsArray, IsDate, IsUUID, IsEnum } from 'class-validator';

export class MessageDto {
  @IsString()
  id: string;

  @IsString()
  message: string;

  @IsEnum(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsDate()
  timestamp: Date;
}

export class ConversationDetailDto {
  @IsUUID()
  hospedajeId: string;

  @IsString()
  hospedajeName: string;

  @IsString()
  sessionId: string;

  @IsArray()
  messages: MessageDto[];
}