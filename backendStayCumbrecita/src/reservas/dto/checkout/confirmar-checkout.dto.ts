import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AgregarCargoDto } from './agregar-cargo.dto';

export class ConfirmarCheckoutDto {
  @ApiProperty({ 
    type: [AgregarCargoDto], 
    description: 'Lista de cargos adicionales a aplicar',
    required: false
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgregarCargoDto)
  cargosAdicionales?: AgregarCargoDto[];

  @ApiProperty({ 
    description: 'Observaciones del checkout', 
    required: false 
  })
  @IsOptional()
  @IsString()
  observaciones?: string;
}