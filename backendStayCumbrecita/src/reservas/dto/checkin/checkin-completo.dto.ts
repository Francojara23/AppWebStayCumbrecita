import { IsNotEmpty, IsString, IsArray, ValidateNested, IsEmail, IsOptional, IsUUID, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TipoTarjeta } from '../../../tarjetas/entidades/tarjeta.entity';

export class HuespedCheckinDto {
  @ApiProperty({ description: 'Nombre del huésped' })
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @ApiProperty({ description: 'Apellido del huésped' })
  @IsNotEmpty()
  @IsString()
  apellido: string;

  @ApiProperty({ description: 'DNI del huésped' })
  @IsNotEmpty()
  @IsString()
  dni: string;

  @ApiProperty({ description: 'Teléfono del huésped', required: false })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ description: 'Email del huésped', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class HuespedPorHabitacionDto {
  @ApiProperty({ description: 'ID de la habitación' })
  @IsUUID()
  habitacionId: string;

  @ApiProperty({ description: 'Nombre de la habitación' })
  @IsString()
  habitacionNombre: string;

  @ApiProperty({ description: 'Capacidad de la habitación' })
  @IsNumber()
  capacidad: number;

  @ApiProperty({ description: 'Personas reservadas en esta habitación' })
  @IsNumber()
  personasReservadas: number;

  @ApiProperty({ type: [HuespedCheckinDto], description: 'Lista de huéspedes asignados a esta habitación' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HuespedCheckinDto)
  huespedes: HuespedCheckinDto[];
}

export class TarjetaNuevaDto {
  @ApiProperty({ description: 'Titular de la tarjeta' })
  @IsString()
  titular: string;

  @ApiProperty({ description: 'Número de la tarjeta' })
  @IsString()
  numero: string;

  @ApiProperty({ description: 'Entidad emisora (VISA, MASTERCARD, etc.)' })
  @IsString()
  entidad: string;

  @ApiProperty({ description: 'Fecha de vencimiento (MM/YY)' })
  @IsString()
  vencimiento: string;

  @ApiProperty({ description: 'Código de seguridad CVE' })
  @IsString()
  cve: string;

  @ApiProperty({ enum: TipoTarjeta, description: 'Tipo de tarjeta' })
  @IsEnum(TipoTarjeta)
  tipo: TipoTarjeta;
}

export class DatosPagoCheckinDto {
  @ApiProperty({ description: 'Si usar el pago existente de la reserva' })
  @IsBoolean()
  usarPagoExistente: boolean;

  @ApiProperty({ description: 'ID del pago existente', required: false })
  @IsOptional()
  @IsUUID()
  pagoExistenteId?: string;

  @ApiProperty({ type: TarjetaNuevaDto, description: 'Datos de nueva tarjeta', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TarjetaNuevaDto)
  nuevaTarjeta?: TarjetaNuevaDto;
}

export class CheckinCompletoDto {
  @ApiProperty({ description: 'ID de la reserva' })
  @IsUUID()
  reservaId: string;

  @ApiProperty({ description: 'Datos del QR escaneado' })
  @IsString()
  qrData: string;

  @ApiProperty({ type: [HuespedPorHabitacionDto], description: 'Huéspedes organizados por habitación' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HuespedPorHabitacionDto)
  huespedesPorHabitacion: HuespedPorHabitacionDto[];

  @ApiProperty({ type: DatosPagoCheckinDto, description: 'Datos de pago para el check-in' })
  @ValidateNested()
  @Type(() => DatosPagoCheckinDto)
  datosPago: DatosPagoCheckinDto;
}