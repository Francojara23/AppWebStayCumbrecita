import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDate, IsNotEmpty, IsNumber, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class HabitacionCotizacionDto {
  @ApiProperty({ description: 'ID de la habitación' })
  @IsUUID()
  @IsNotEmpty()
  habitacionId: string;

  @ApiProperty({ description: 'Cantidad de habitaciones' })
  @IsNumber()
  @IsNotEmpty()
  cantidad: number;
}

export class CotizarReservaDto {
  @ApiProperty({ description: 'ID del hotel' })
  @IsUUID()
  @IsNotEmpty()
  hotelId: string;

  @ApiProperty({ description: 'Fecha de inicio' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  desde: Date;

  @ApiProperty({ description: 'Fecha de fin' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  hasta: Date;

  @ApiProperty({ type: [HabitacionCotizacionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HabitacionCotizacionDto)
  @IsNotEmpty()
  habitaciones: HabitacionCotizacionDto[];
} 