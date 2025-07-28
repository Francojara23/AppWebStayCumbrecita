import { IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RangoFechasDto {
  @ApiPropertyOptional({
    description: 'Fecha de inicio del rango (ISO string)',
    example: '2024-01-01T00:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin del rango (ISO string)',
    example: '2024-12-31T23:59:59Z'
  })
  @IsOptional()
  @IsDateString()
  to?: string;
} 