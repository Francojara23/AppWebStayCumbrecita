import { IsNotEmpty, IsString, IsEnum, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoTarjeta } from '../entidades/tarjeta.entity';

export class CreateTarjetaDto {
  @ApiProperty({ description: 'Nombre del titular de la tarjeta' })
  @IsNotEmpty()
  @IsString()
  @Length(3, 100)
  titular: string;

  @ApiProperty({ description: 'Número de la tarjeta (16 dígitos)' })
  @IsNotEmpty()
  @IsString()
  @Length(16, 16)
  @Matches(/^\d{16}$/, { message: 'El número de tarjeta debe contener exactamente 16 dígitos' })
  numero: string;

  @ApiProperty({ description: 'Entidad emisora de la tarjeta' })
  @IsNotEmpty()
  @IsString()
  @Length(2, 50)
  entidad: string;

  @ApiProperty({ description: 'Banco emisor de la tarjeta' })
  @IsNotEmpty()
  @IsString()
  @Length(2, 50)
  banco: string;

  @ApiProperty({ description: 'Fecha de vencimiento (MM/YY)' })
  @IsNotEmpty()
  @IsString()
  @Length(5, 5)
  @Matches(/^(0[1-9]|1[0-2])\/([0-9]{2})$/, { message: 'El formato debe ser MM/YY' })
  vencimiento: string;

  @ApiProperty({ description: 'Código de seguridad (3 dígitos)' })
  @IsNotEmpty()
  @IsString()
  @Length(3, 3)
  @Matches(/^\d{3}$/, { message: 'El código de seguridad debe contener exactamente 3 dígitos' })
  cve: string;

  @ApiProperty({ description: 'Tipo de tarjeta', enum: TipoTarjeta })
  @IsNotEmpty()
  @IsEnum(TipoTarjeta)
  tipo: TipoTarjeta;
} 