import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateOwnerDTO {
  @ApiProperty({ description: "Nombre del dueño" })
  @IsNotEmpty()
  @IsString()
  name!: string;
  @ApiProperty({ description: "Apellido del dueño" })
  @IsNotEmpty()
  @IsString()
  lastName!: string;
  @ApiProperty({ description: "Correo electrónico" })
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  email!: string;
  @ApiProperty({ description: "Número de teléfono" })
  @IsNotEmpty()
  @IsString()
  phone!: string;
  @ApiProperty({ description: "DNI del dueño" })
  @IsNotEmpty()
  @IsString()
  dni!: string;
  @ApiProperty({ description: "Dirección del dueño" })
  @IsNotEmpty()
  @IsString()
  address!: string;
}
