import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDTO {
  @ApiProperty({
    description: 'Token de reseteo de contraseña',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'Nueva contraseña del usuario',
    example: 'newPassword123'
  })
  @IsString()
  @MinLength(6)
  passwordNueva: string;
} 