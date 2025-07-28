import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';
import { EstadoPago } from '../entidades/pago.entity';

export class CambiarEstadoPagoDto {
  @ApiProperty({ description: 'Nuevo estado del pago', enum: EstadoPago })
  @IsNotEmpty()
  @IsEnum(EstadoPago)
  estado: EstadoPago;

  @ApiPropertyOptional({ description: 'Motivo del cambio de estado' })
  @IsOptional()
  @IsString()
  motivo?: string;

  @ApiPropertyOptional({ description: 'Metadatos adicionales' })
  @IsOptional()
  @IsObject()
  metadatos?: any;
} 