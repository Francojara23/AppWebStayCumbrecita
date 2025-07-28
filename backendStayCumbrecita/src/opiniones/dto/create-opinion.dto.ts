import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber, Min, Max, IsUUID } from 'class-validator';

export class CreateOpinionDto {
  @ApiProperty({ 
    description: 'ID del hospedaje sobre el cual se opina',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsNotEmpty()
  @IsUUID()
  hospedajeId: string;

  @ApiProperty({ 
    description: 'ID de la reserva que habilita la opinión',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsNotEmpty()
  @IsUUID()
  reservaId: string;

  @ApiPropertyOptional({ 
    description: 'Calificación de 1 a 5 estrellas (opcional)',
    minimum: 1,
    maximum: 5,
    example: 4
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'La calificación mínima es 1 estrella' })
  @Max(5, { message: 'La calificación máxima es 5 estrellas' })
  calificacion?: number;

  @ApiPropertyOptional({ 
    description: 'Comentario u opinión del usuario (opcional)',
    example: 'Excelente atención y muy buenas instalaciones. Recomendado!'
  })
  @IsOptional()
  @IsString()
  comentario?: string;
} 