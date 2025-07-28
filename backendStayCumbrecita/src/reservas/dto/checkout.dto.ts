import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CheckoutDto {
  @ApiProperty({ description: 'Observaciones del check-out', required: false })
  @IsString()
  @IsOptional()
  observaciones?: string;
} 