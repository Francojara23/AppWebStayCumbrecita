import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { TipoServicio } from '../entidades/servicio-catalogo.entity';

export class CreateServicioCatalogoDto {
  @ApiProperty({
    description: 'Nombre del servicio',
    example: 'Wi-Fi'
  })
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @ApiProperty({
    description: 'Descripción del servicio',
    example: 'Conexión inalámbrica a internet de alta velocidad',
    required: false
  })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({
    description: 'URL del icono del servicio',
    example: 'wifi.svg',
    required: false
  })
  @IsOptional()
  @IsString()
  iconoUrl?: string;

  @ApiProperty({
    description: 'Tipo de servicio',
    enum: TipoServicio,
    example: TipoServicio.HABITACION
  })
  @IsNotEmpty()
  @IsEnum(TipoServicio)
  tipo: TipoServicio;
} 