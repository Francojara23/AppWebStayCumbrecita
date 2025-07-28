import { IsNotEmpty, IsString } from 'class-validator';

export class VerificarQrDto {
  @IsNotEmpty()
  @IsString()
  qrData: string;
} 