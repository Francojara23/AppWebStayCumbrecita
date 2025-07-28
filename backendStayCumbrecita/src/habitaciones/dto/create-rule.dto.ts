import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoAjustePrecio } from '../../common/enums/tipo-ajuste-precio.enum';

export class CreateRuleDto {
  @ApiProperty({
    description: 'Tipo de ajuste de precio',
    enum: TipoAjustePrecio,
    example: TipoAjustePrecio.TEMPORADA_ALTA
  })
  @IsNotEmpty()
  @IsEnum(TipoAjustePrecio)
  tipo: TipoAjustePrecio;

  @ApiProperty({
    description: 'Fecha de inicio del ajuste (YYYY-MM-DD)',
    example: '2024-12-15',
    required: false
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  desde?: Date;

  @ApiProperty({
    description: 'Fecha de fin del ajuste (YYYY-MM-DD)',
    example: '2025-03-15',
    required: false
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  hasta?: Date;

  @ApiProperty({
    description: 'Suplemento fijo en pesos',
    example: 20.00,
    required: false,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  suplemento?: number;

  @ApiProperty({
    description: 'Incremento porcentual',
    example: 10.5,
    required: false,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  incrementoPct?: number;
} 