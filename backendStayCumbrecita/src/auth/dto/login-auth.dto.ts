import { IsAlphanumeric, IsEmail, IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginAuthDTO {
  @ApiProperty({ description: "Correo electrónico para iniciar sesión" })
  @IsNotEmpty()
  @IsEmail()
  @IsString()
  email!: string;
  @ApiProperty({ description: "Contraseña alfanumérica" })
  @IsNotEmpty()
  @IsAlphanumeric()
  @IsString()
  password!: string;
}
