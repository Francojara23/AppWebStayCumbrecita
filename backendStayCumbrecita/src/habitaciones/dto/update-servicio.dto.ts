import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateServicioDto {
  @ApiProperty({
    description: 'Nombre del servicio',
    required: false,
    example: 'WiFi Premium'
  })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiProperty({
    description: 'Icono del servicio',
    required: false,
    example: 'wifi'
  })
  @IsString()
  @IsOptional()
  icono?: string;
} 