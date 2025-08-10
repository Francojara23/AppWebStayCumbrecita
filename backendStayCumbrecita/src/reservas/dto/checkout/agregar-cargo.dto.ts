import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ConceptoCargo {
  FRIGOBAR = 'FRIGOBAR',
  DANOS_HABITACION = 'DAÑOS_HABITACION',
  SERVICIO_HABITACION = 'SERVICIO_HABITACION',
  LAVANDERIA = 'LAVANDERIA',
  OTROS = 'OTROS'
}

export class AgregarCargoDto {
  @ApiProperty({ 
    enum: ConceptoCargo, 
    description: 'Concepto del cargo adicional' 
  })
  @IsEnum(ConceptoCargo)
  concepto: ConceptoCargo;

  @ApiProperty({ 
    description: 'Monto del cargo adicional (debe ser mayor o igual a 0)', 
    minimum: 0 
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'El monto no puede ser negativo' })
  monto: number;

  @ApiProperty({ 
    description: 'Descripción detallada del cargo', 
    required: false 
  })
  @IsOptional()
  @IsString()
  descripcion?: string;
}