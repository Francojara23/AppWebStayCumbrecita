import { IsEnum, IsNumber, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MetodoPago } from '../entidades/pago.entity';

class TarjetaPublicidadDto {
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

export class CreatePagoPublicidadDto {
  @ApiProperty({ description: 'Método de pago', enum: MetodoPago })
  @IsEnum(MetodoPago)
  metodo: MetodoPago;

  @ApiProperty({ description: 'Monto de la publicidad' })
  @IsNumber()
  monto: number;

  @ApiProperty({ description: 'Datos de la tarjeta' })
  @ValidateNested()
  @Type(() => TarjetaPublicidadDto)
  tarjeta: TarjetaPublicidadDto;
} 