import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkReadDto {
  @ApiProperty({ description: 'Estado de lectura' })
  @IsBoolean()
  leida: boolean;
} 