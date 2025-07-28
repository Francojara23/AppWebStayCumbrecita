import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class FindHabitacionesDto {
  @ApiProperty({ required: false, description: 'Número de página' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, description: 'Cantidad de elementos por página' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({ required: false, description: 'Fecha de inicio para filtrar por disponibilidad' })
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @ApiProperty({ required: false, description: 'Fecha de fin para filtrar por disponibilidad' })
  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @ApiProperty({ required: false, description: 'Precio mínimo' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioMin?: number;

  @ApiProperty({ required: false, description: 'Precio máximo' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioMax?: number;

  @ApiProperty({ required: false, description: 'Capacidad mínima de personas' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  capacidad?: number;

  @ApiProperty({ required: false, description: 'ID del tipo de habitación' })
  @IsOptional()
  @IsString()
  tipoHabitacionId?: string;
} 