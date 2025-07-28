import { IsOptional, IsEnum, IsDateString, IsUUID, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EstadoPago, MetodoPago } from '../entidades/pago.entity';

export class FiltrosPagosDto {
  @ApiPropertyOptional({ description: 'Página', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Elementos por página', default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Estado del pago', enum: EstadoPago })
  @IsOptional()
  @IsEnum(EstadoPago)
  estado?: EstadoPago;

  @ApiPropertyOptional({ description: 'Método de pago', enum: MetodoPago })
  @IsOptional()
  @IsEnum(MetodoPago)
  metodo?: MetodoPago;

  @ApiPropertyOptional({ description: 'ID del usuario' })
  @IsOptional()
  @IsUUID()
  usuarioId?: string;

  @ApiPropertyOptional({ description: 'ID del hospedaje' })
  @IsOptional()
  @IsUUID()
  hospedajeId?: string;

  @ApiPropertyOptional({ description: 'Fecha desde (ISO string)' })
  @IsOptional()
  @IsDateString()
  fechaDesde?: Date;

  @ApiPropertyOptional({ description: 'Fecha hasta (ISO string)' })
  @IsOptional()
  @IsDateString()
  fechaHasta?: Date;

  @ApiPropertyOptional({ description: 'Monto mínimo' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montoMin?: number;

  @ApiPropertyOptional({ description: 'Monto máximo' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montoMax?: number;
} 