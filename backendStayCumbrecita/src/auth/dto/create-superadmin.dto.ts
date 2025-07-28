import { IsNotEmpty, IsString, IsEmail, IsNumber, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateSuperAdminDTO {
  @ApiProperty({ description: "Nombre del super administrador" })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: "Apellido del super administrador" })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ description: "Correo electrónico" })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({ description: "Número de teléfono" })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ description: "DNI del super administrador" })
  @IsNotEmpty()
  @IsString()
  dni: string;

  @ApiProperty({ description: "Dirección del super administrador" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: "Contraseña para el super admin" })
  @IsNotEmpty()
  @IsString()
  password: string;
} 