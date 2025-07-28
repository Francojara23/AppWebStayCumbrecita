import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDTO {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: "Nombre del usuario" })
  nombre: string = "";

  @ApiProperty({ description: "Apellido del usuario" })
  apellido: string = "";

  @ApiProperty({ description: "Correo electrónico" })
  email: string = "";

  @ApiProperty({ description: "Contraseña" })
  password: string = "";

  @ApiProperty({ description: "Número de teléfono" })
  telefono?: number;

  @ApiProperty({ description: "DNI del usuario" })
  dni: number = 0;

  @ApiProperty({ description: "Dirección del usuario" })
  direccion?: string;

  @ApiProperty({ description: "Foto de perfil del usuario" })
  fotoUrl?: string;

  @ApiProperty({ description: "Estado de confirmación" })
  estadoConfirmacion: boolean = false;
}
