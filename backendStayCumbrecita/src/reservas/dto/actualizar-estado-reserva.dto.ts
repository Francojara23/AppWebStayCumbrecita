import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EstadoReserva } from '../../common/enums/estado-reserva.enum';

export class ActualizarEstadoReservaDto {
  @ApiProperty({
    enum: EstadoReserva,
    description: 'Nuevo estado de la reserva'
  })
  @IsEnum(EstadoReserva)
  estado: EstadoReserva;
} 