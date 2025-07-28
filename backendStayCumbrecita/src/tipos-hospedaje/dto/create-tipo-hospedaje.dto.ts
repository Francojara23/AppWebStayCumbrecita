import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateTipoHospedajeDto {
  @ApiProperty({ description: 'Nombre del tipo de hospedaje' })
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @ApiProperty({ description: 'Descripción del tipo de hospedaje', required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;
} 