import { IsString, IsNumber, IsDate, IsUUID } from 'class-validator';

export class ConversationSummaryDto {
  @IsUUID()
  hospedajeId: string;

  @IsString()
  hospedajeName: string;

  @IsString()
  sessionId: string;

  @IsDate()
  lastMessageDate: Date;

  @IsNumber()
  messageCount: number;

  @IsString()
  firstMessage: string;

  @IsString()
  lastMessage: string;
}