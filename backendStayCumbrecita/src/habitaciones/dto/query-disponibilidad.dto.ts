import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsNumber, IsUUID, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryDisponibilidadDto {
  @ApiProperty({ description: 'Fecha de inicio de la búsqueda (formato YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  fechaInicio?: string;

  @ApiProperty({ description: 'Fecha de fin de la búsqueda (formato YYYY-MM-DD)' })
  @IsOptional() 
  @IsString()
  fechaFin?: string;

  @ApiProperty({ description: 'ID del hospedaje (opcional)', required: false })
  @IsOptional()
  @IsUUID()
  hospedajeId?: string;

  @ApiProperty({ description: 'ID del tipo de habitación (opcional)', required: false })
  @IsOptional()
  @IsUUID()
  tipoHabitacionId?: string;

  @ApiProperty({ description: 'Cantidad de personas (opcional)', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(10)
  personas?: number;

  @ApiProperty({ description: 'Precio mínimo (opcional)', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  precioMin?: number;

  @ApiProperty({ description: 'Precio máximo (opcional)', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  precioMax?: number;

  @ApiProperty({ description: 'Número de página', default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Límite de resultados por página', default: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(1000)
  limit?: number = 10;
} 