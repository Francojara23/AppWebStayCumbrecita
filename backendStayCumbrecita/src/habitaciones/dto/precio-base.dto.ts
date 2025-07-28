import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class PrecioBaseDto {
  @ApiProperty({
    description: 'Precio base de la habitación',
    minimum: 0,
    example: 1000
  })
  @IsNumber()
  @Min(0)
  precioBase: number;
} 