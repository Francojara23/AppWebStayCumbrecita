import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class SetBasePriceDto {
  @ApiProperty({
    description: 'Precio base de la habitación por noche',
    example: 80.00,
    minimum: 0
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  precioBase: number;
} 