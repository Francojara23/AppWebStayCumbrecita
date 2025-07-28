import { IsNotEmpty, IsString, IsArray, ValidateNested, IsEmail, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class HuespedCheckinDto {
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @IsNotEmpty()
  @IsString()
  apellido: string;

  @IsNotEmpty()
  @IsString()
  dni: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class RealizarCheckinDto {
  @IsNotEmpty()
  @IsString()
  reservaId: string;

  @IsNotEmpty()
  @IsString()
  qrData: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HuespedCheckinDto)
  huespedes: HuespedCheckinDto[];
} 