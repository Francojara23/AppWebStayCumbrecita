import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsUUID, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreatePublicidadDto {
  @ApiProperty({ 
    description: 'ID del hospedaje a publicitar',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsNotEmpty()
  @IsUUID()
  hospedajeId: string;

  @ApiProperty({ 
    description: 'Monto a pagar por la publicidad',
    example: 50000,
    minimum: 1000
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1000, { message: 'El monto mínimo de publicidad es $1.000' })
  monto: number;

  @ApiProperty({ 
    description: 'ID de la tarjeta de crédito/débito para el pago',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsNotEmpty()
  @IsUUID()
  tarjetaId: string;

  @ApiPropertyOptional({ 
    description: 'Si la publicidad debe renovarse automáticamente cada 30 días',
    default: false,
    example: true
  })
  @IsOptional()
  @IsBoolean()
  renovacionAutomatica?: boolean;
}
