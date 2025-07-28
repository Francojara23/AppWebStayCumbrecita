import { IsOptional, IsString, IsBoolean, Length, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTarjetaDto {
  @ApiPropertyOptional({ description: 'Nombre del titular de la tarjeta' })
  @IsOptional()
  @IsString()
  @Length(3, 100)
  titular?: string;

  @ApiPropertyOptional({ description: 'Banco emisor de la tarjeta' })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  banco?: string;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento (MM/YY)' })
  @IsOptional()
  @IsString()
  @Length(5, 5)
  @Matches(/^(0[1-9]|1[0-2])\/([0-9]{2})$/, { message: 'El formato debe ser MM/YY' })
  vencimiento?: string;

  @ApiPropertyOptional({ description: 'Estado activo de la tarjeta' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
} 