import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CancelarReservaDto {
  @ApiProperty({ description: 'Motivo de la cancelación' })
  @IsString()
  @IsNotEmpty()
  motivo: string;

  @ApiPropertyOptional({ description: 'Si se debe notificar al turista', default: true })
  @IsOptional()
  @IsBoolean()
  notificarTurista?: boolean;

  @ApiPropertyOptional({ description: 'Quién realiza la cancelación (ADMIN, PROPIETARIO, etc.)' })
  @IsOptional()
  @IsString()
  canceladoPor?: string;

  @ApiPropertyOptional({ description: 'Metadatos adicionales' })
  @IsOptional()
  @IsObject()
  metadatos?: any;
}
