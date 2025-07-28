import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTipoHabitacionDto {
  @ApiProperty({ description: 'Nombre del tipo de habitación' })
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @ApiProperty({ description: 'Descripción del tipo de habitación' })
  @IsNotEmpty()
  @IsString()
  descripcion: string;
} 