import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max, IsBoolean } from 'class-validator';

export class UpdateOpinionDto {
  @ApiPropertyOptional({ 
    description: 'Calificación de 1 a 5 estrellas (opcional)',
    minimum: 1,
    maximum: 5,
    example: 5
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'La calificación mínima es 1 estrella' })
  @Max(5, { message: 'La calificación máxima es 5 estrellas' })
  calificacion?: number;

  @ApiPropertyOptional({ 
    description: 'Comentario u opinión del usuario (opcional)',
    example: 'Actualizo mi opinión: El lugar superó mis expectativas!'
  })
  @IsOptional()
  @IsString()
  comentario?: string;

  @ApiPropertyOptional({ 
    description: 'Si la opinión debe ser visible públicamente',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

export class RespuestaPropietarioDto {
  @ApiPropertyOptional({ 
    description: 'Respuesta del propietario a la opinión',
    example: 'Muchas gracias por su comentario. Nos alegra saber que disfrutó su estadía!'
  })
  @IsOptional()
  @IsString()
  respuestaPropietario?: string;
} 