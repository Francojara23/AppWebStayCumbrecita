import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsDate, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoAjustePrecio } from '../../common/enums/tipo-ajuste-precio.enum';

export class AjustePrecioDto {
  @ApiProperty({
    description: 'Tipo de regla de ajuste',
    enum: TipoAjustePrecio,
    example: TipoAjustePrecio.TEMPORADA_ALTA
  })
  @IsEnum(TipoAjustePrecio)
  tipoRegla: TipoAjustePrecio;

  @ApiProperty({
    description: 'Fecha de inicio del ajuste',
    example: '2024-03-20T00:00:00Z'
  })
  @IsDate()
  @Type(() => Date)
  fechaDesde: Date;

  @ApiProperty({
    description: 'Fecha de fin del ajuste',
    example: '2024-03-25T00:00:00Z'
  })
  @IsDate()
  @Type(() => Date)
  fechaHasta: Date;

  @ApiProperty({
    description: 'Porcentaje de ajuste (-100 a 100)',
    minimum: -100,
    maximum: 100,
    example: 20
  })
  @IsNumber()
  @Min(-100)
  @Max(100)
  incrementoPct: number;
} 