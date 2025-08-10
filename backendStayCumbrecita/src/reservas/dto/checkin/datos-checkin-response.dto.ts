import { ApiProperty } from '@nestjs/swagger';

export class TitularResponseDto {
  @ApiProperty({ description: 'Nombre del titular' })
  nombre: string;

  @ApiProperty({ description: 'Apellido del titular' })
  apellido: string;

  @ApiProperty({ description: 'DNI del titular' })
  dni: string;

  @ApiProperty({ description: 'Teléfono del titular', required: false })
  telefono?: string;

  @ApiProperty({ description: 'Email del titular', required: false })
  email?: string;
}

export class HabitacionCheckinResponseDto {
  @ApiProperty({ description: 'ID de la habitación' })
  id: string;

  @ApiProperty({ description: 'Nombre de la habitación' })
  nombre: string;

  @ApiProperty({ description: 'Capacidad de la habitación' })
  capacidad: number;

  @ApiProperty({ description: 'Personas reservadas en esta habitación' })
  personasReservadas: number;

  @ApiProperty({ description: 'Lista de huéspedes (inicialmente vacía)' })
  huespedes: any[];
}

export class PagoExistenteResponseDto {
  @ApiProperty({ description: 'ID del pago' })
  id: string;

  @ApiProperty({ description: 'Titular de la tarjeta' })
  titular: string;

  @ApiProperty({ description: 'Número enmascarado de la tarjeta' })
  numeroMasked: string;

  @ApiProperty({ description: 'Entidad emisora' })
  entidad: string;
}

export class ReservaCheckinResponseDto {
  @ApiProperty({ description: 'ID de la reserva' })
  id: string;

  @ApiProperty({ description: 'Código de la reserva' })
  codigo: string;

  @ApiProperty({ description: 'Nombre del hospedaje' })
  hospedaje: string;

  @ApiProperty({ description: 'Fecha de inicio de la reserva' })
  fechaInicio: Date;

  @ApiProperty({ description: 'Fecha de fin de la reserva' })
  fechaFin: Date;
}

export class DatosCheckinResponseDto {
  @ApiProperty({ type: ReservaCheckinResponseDto, description: 'Datos de la reserva' })
  reserva: ReservaCheckinResponseDto;

  @ApiProperty({ type: TitularResponseDto, description: 'Datos del titular (pre-llenados)' })
  titular: TitularResponseDto;

  @ApiProperty({ type: [HabitacionCheckinResponseDto], description: 'Habitaciones de la reserva' })
  habitaciones: HabitacionCheckinResponseDto[];

  @ApiProperty({ type: PagoExistenteResponseDto, description: 'Pago existente si existe', required: false })
  pagoExistente?: PagoExistenteResponseDto;
}