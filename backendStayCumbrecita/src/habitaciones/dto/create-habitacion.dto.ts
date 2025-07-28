import { IsString, IsNumber, IsUUID, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class ImagenHabitacionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  orden: number;
}

export class CreateHabitacionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  descripcionCorta: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  descripcionLarga: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  capacidad: number;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  tipoHabitacionId: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  precioBase?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  ajustesPrecio?: any[];

  @ApiProperty({ type: [ImagenHabitacionDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImagenHabitacionDto)
  @IsOptional()
  imagenes?: ImagenHabitacionDto[];
}
