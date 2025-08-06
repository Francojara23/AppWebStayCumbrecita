import { IsArray, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ConversationSummaryDto } from './conversation-summary.dto';

export class GetUserConversationsDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;
}

export class UserConversationsResponseDto {
  @IsArray()
  conversations: ConversationSummaryDto[];

  @IsNumber()
  total: number;

  @IsNumber()
  page: number;

  @IsNumber()
  limit: number;

  @IsNumber()
  totalPages: number;
}