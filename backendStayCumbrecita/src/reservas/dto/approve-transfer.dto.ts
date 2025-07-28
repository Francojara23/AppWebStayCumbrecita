import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ApproveTransferDto {
  @ApiProperty({ description: 'URL del comprobante de transferencia' })
  @IsString()
  @IsNotEmpty()
  comprobanteUrl: string;

  @ApiProperty({ description: 'Fecha de la transferencia' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  fechaTransferencia: Date;
} 