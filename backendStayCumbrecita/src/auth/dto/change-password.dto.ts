import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDTO {
  @ApiProperty({
    description: 'Contraseña actual del usuario',
    example: 'password123'
  })
  @IsString()
  @MinLength(6)
  passwordActual: string;

  @ApiProperty({
    description: 'Nueva contraseña del usuario',
    example: 'newPassword123'
  })
  @IsString()
  @MinLength(6)
  passwordNueva: string;
} 