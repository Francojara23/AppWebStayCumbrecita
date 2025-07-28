import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateRoleDTO {
  @ApiProperty({ description: "Nombre del rol" })
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @ApiProperty({ description: "Descripción del rol", required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;
}
