import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AcompanianteDto {
  @ApiProperty({ description: 'Nombre del acompañante' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ description: 'DNI del acompañante' })
  @IsString()
  @IsNotEmpty()
  dni: string;
}

export class CheckinDto {
  @ApiProperty({ type: [AcompanianteDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AcompanianteDto)
  @IsNotEmpty()
  acompanantes: AcompanianteDto[];
} 