import { ApiProperty } from '@nestjs/swagger';

export class HuespedCheckoutDto {
  @ApiProperty({ description: 'Nombre del huésped' })
  nombre: string;

  @ApiProperty({ description: 'Apellido del huésped' })
  apellido: string;

  @ApiProperty({ description: 'DNI del huésped' })
  dni: string;

  @ApiProperty({ description: 'Teléfono del huésped', required: false })
  telefono?: string;

  @ApiProperty({ description: 'Email del huésped', required: false })
  email?: string;
}

export class HabitacionCheckoutDto {
  @ApiProperty({ description: 'ID de la habitación' })
  id: string;

  @ApiProperty({ description: 'Nombre de la habitación' })
  nombre: string;

  @ApiProperty({ description: 'Capacidad de la habitación' })
  capacidad: number;

  @ApiProperty({ description: 'Personas que se registraron' })
  personasRegistradas: number;

  @ApiProperty({ type: [HuespedCheckoutDto], description: 'Huéspedes registrados en esta habitación' })
  huespedes: HuespedCheckoutDto[];
}

export class PagoExistenteCheckoutDto {
  @ApiProperty({ description: 'ID del pago' })
  id: string;

  @ApiProperty({ description: 'Concepto del pago' })
  concepto: string;

  @ApiProperty({ description: 'Monto del pago' })
  monto: number;

  @ApiProperty({ description: 'Estado del pago' })
  estado: string;

  @ApiProperty({ description: 'Fecha del pago' })
  fechaPago: Date;

  @ApiProperty({ description: 'Titular enmascarado de la tarjeta', required: false })
  titularMasked?: string;

  @ApiProperty({ description: 'Número enmascarado de la tarjeta', required: false })
  numeroMasked?: string;
}

export class ReservaCheckoutDto {
  @ApiProperty({ description: 'ID de la reserva' })
  id: string;

  @ApiProperty({ description: 'Código de la reserva' })
  codigo: string;

  @ApiProperty({ description: 'Nombre del hospedaje' })
  hospedaje: string;

  @ApiProperty({ description: 'Fecha de inicio' })
  fechaInicio: Date;

  @ApiProperty({ description: 'Fecha de fin' })
  fechaFin: Date;

  @ApiProperty({ description: 'Fecha de check-in realizado' })
  fechaCheckin: Date;

  @ApiProperty({ description: 'Estado actual' })
  estado: string;

  @ApiProperty({ description: 'Observaciones', required: false })
  observaciones?: string;
}

export class TitularCheckoutDto {
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

export class DatosCheckoutResponseDto {
  @ApiProperty({ type: ReservaCheckoutDto, description: 'Datos de la reserva' })
  reserva: ReservaCheckoutDto;

  @ApiProperty({ type: TitularCheckoutDto, description: 'Datos del titular' })
  titular: TitularCheckoutDto;

  @ApiProperty({ type: [HabitacionCheckoutDto], description: 'Habitaciones ocupadas' })
  habitaciones: HabitacionCheckoutDto[];

  @ApiProperty({ type: [PagoExistenteCheckoutDto], description: 'Pagos realizados' })
  pagos: PagoExistenteCheckoutDto[];

  @ApiProperty({ description: 'Total de noches de la reserva' })
  totalNoches: number;

  @ApiProperty({ description: 'Total de huéspedes registrados' })
  totalHuespedes: number;
}