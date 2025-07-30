import { IsNumber, IsNotEmpty, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateHabitacionDto } from './create-habitacion.dto';

export class CreateMultipleHabitacionesDto {
  @ApiProperty({ 
    description: 'Cantidad de habitaciones idénticas a crear',
    minimum: 2,
    maximum: 50,
    example: 6
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(2, { message: 'Debe crear al menos 2 habitaciones para usar esta funcionalidad' })
  @Max(50, { message: 'No se pueden crear más de 50 habitaciones a la vez' })
  cantidad: number;

  @ApiProperty({ 
    description: 'Datos base de la habitación que se replicará',
    type: CreateHabitacionDto
  })
  @ValidateNested()
  @Type(() => CreateHabitacionDto)
  datosHabitacion: CreateHabitacionDto;
} 