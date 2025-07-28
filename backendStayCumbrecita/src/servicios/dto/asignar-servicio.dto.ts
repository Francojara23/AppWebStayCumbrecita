import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class AsignarServicioDto {
  @ApiProperty({
    description: 'ID del servicio en el catálogo',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsNotEmpty()
  @IsUUID()
  servicioId: string;

  @ApiProperty({
    description: 'Precio extra por el servicio',
    example: 50.00,
    required: false
  })
  @IsOptional()
  @IsNumber()
  precioExtra?: number;

  @ApiProperty({
    description: 'Observaciones sobre el servicio',
    example: 'Disponible de 8:00 a 20:00',
    required: false
  })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({
    description: 'Incremento de capacidad (solo para servicios de habitación)',
    example: 1,
    required: false
  })
  @IsOptional()
  @IsNumber()
  incrementoCapacidad?: number;
} 