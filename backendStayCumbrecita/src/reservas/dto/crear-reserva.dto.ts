import { IsUUID, IsDate, IsNumber, IsOptional, IsString, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class LineaReservaDto {
  @IsUUID()
  habitacionId: string;

  @IsNumber()
  personas: number;
}



export class CrearReservaDto {
  @IsUUID()
  hospedajeId: string;

  @IsDate()
  @Type(() => Date)
  fechaInicio: Date;

  @IsDate()
  @Type(() => Date)
  fechaFin: Date;

  @ValidateNested({ each: true })
  @Type(() => LineaReservaDto)
  @ArrayMinSize(1)
  lineas: LineaReservaDto[];



  @IsString()
  @IsOptional()
  observacion?: string;

  // Campos opcionales para datos del pago (cuando se crea desde checkout)
  @IsUUID()
  @IsOptional()
  pagoId?: string;

  @IsNumber()
  @IsOptional()
  montoRealPago?: number;

  @IsNumber()
  @IsOptional()
  impuestosRealPago?: number;

  @IsNumber()
  @IsOptional()
  totalRealPago?: number;

  @IsString()
  @IsOptional()
  estadoPago?: 'APROBADO' | 'PROCESANDO' | 'PENDIENTE' | 'RECHAZADO';
} 