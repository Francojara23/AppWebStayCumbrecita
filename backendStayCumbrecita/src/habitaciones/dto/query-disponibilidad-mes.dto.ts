import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryDisponibilidadMesDto {
  @ApiProperty({ 
    description: 'Mes a consultar (1-12)', 
    example: 7,
    minimum: 1,
    maximum: 12
  })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(12)
  mes: number;

  @ApiProperty({ 
    description: 'Año a consultar', 
    example: 2025,
    minimum: 2024,
    maximum: 2030
  })
  @IsNumber()
  @Type(() => Number)
  @Min(2024)
  @Max(2030)
  anio: number;

  @ApiProperty({ 
    description: 'Número de página', 
    default: 1,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiProperty({ 
    description: 'Límite de resultados por página', 
    default: 10,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;
} 