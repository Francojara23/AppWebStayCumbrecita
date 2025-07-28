import { IsUUID, IsEnum, IsOptional, ValidateNested, IsObject, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MetodoPago } from '../entidades/pago.entity';

class TarjetaPagoDto {
  @ApiProperty({ description: 'Número de la tarjeta (16 dígitos)' })
  numero: string;

  @ApiProperty({ description: 'Nombre del titular' })
  titular: string;

  @ApiProperty({ description: 'Fecha de vencimiento (MM/YY)' })
  vencimiento: string;

  @ApiProperty({ description: 'Código de seguridad (3 dígitos)' })
  cve: string;

  @ApiProperty({ description: 'Tipo de tarjeta' })
  tipo: string;

  @ApiProperty({ description: 'Entidad emisora de la tarjeta' })
  entidad: string;
}

export class CreatePagoDto {
  @ApiPropertyOptional({ description: 'ID de la reserva (opcional para pagos sin reserva previa)' })
  @IsOptional()
  @IsUUID()
  reservaId?: string;

  @ApiProperty({ description: 'Método de pago', enum: MetodoPago })
  @IsEnum(MetodoPago)
  metodo: MetodoPago;

  @ApiPropertyOptional({ description: 'Monto de la reserva (opcional, para pagos sin reserva)' })
  @IsOptional()
  @IsNumber()
  montoReserva?: number;

  @ApiPropertyOptional({ description: 'Monto de impuestos (opcional, para pagos sin reserva)' })
  @IsOptional()
  @IsNumber()
  montoImpuestos?: number;

  @ApiPropertyOptional({ description: 'Monto total (opcional, para pagos sin reserva)' })
  @IsOptional()
  @IsNumber()
  montoTotal?: number;

  @ApiPropertyOptional({ description: 'Datos de la tarjeta (solo para pagos con tarjeta)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => TarjetaPagoDto)
  tarjeta?: TarjetaPagoDto;

  @ApiPropertyOptional({ description: 'Metadatos adicionales' })
  @IsOptional()
  @IsObject()
  metadatos?: any;
} 